import { APP_NAME } from '../../config/app'
import { clampStart, pickRandomStart } from '../../lib/clip'
import { ClipCancelledError, EngineUnavailableError, TrackUnavailableError } from '../../lib/errors'
import { getTrack as getDeezerTrack } from '../../services/deezer/api'
import { findSpotifyTrack, startPlayback } from '../../services/spotify/api'
import { getAccessToken, getClientId, isLoggedIn, subscribeAuth } from '../../services/spotify/auth'
import { checkPlaybackSupport, loadSpotifySdk } from '../../services/spotify/sdk'
import type { Track } from '../../types/music'
import type { AudioEngine, ClipResult, EngineFailure, EngineStatus, PreparedTrack } from '../types'

const CONNECT_TIMEOUT_MS = 20_000
const RECONNECT_TIMEOUT_MS = 10_000
const STATE_POLL_MS = 15
/** How close (ms) the parked position must be to the start point before a clip plays. */
const SEEK_TOLERANCE_MS = 80
/** With Spotify the audio can't be analysed, so intros and outros are skipped instead. */
const RANDOM_MARGIN_SEC = 10
const MAX_LOG_ENTRIES = 200

export interface DiagnosticEntry {
  /** ms since the engine was created */
  at: number
  message: string
}

interface Cue {
  uri: string
  startMs: number
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> {
  return Promise.race([promise, sleep(ms).then(() => 'timeout' as const)])
}

/**
 * Plays full songs through the Spotify Web Playback SDK (REQUIREMENTS.md §4.2).
 *
 * Start latency is hidden by "cueing": the song is started muted, paused as soon as it
 * really plays, and parked at the start point. Each clip then only needs a local
 * resume/pause, and the engine measures how much audio actually played.
 */
export class SpotifyEngine implements AudioEngine {
  readonly id = 'spotify' as const

  private status: EngineStatus
  private readonly listeners = new Set<() => void>()
  private log: readonly DiagnosticEntry[] = []
  private readonly createdAt = performance.now()

  private player: Spotify.Player | null = null
  private deviceId: string | null = null
  private connecting: Promise<void> | null = null
  private volume = 0.8
  private readonly tracks = new Map<string, { uri: string; durationMs: number }>()
  /** Where the (paused, muted) player is parked. Null when unknown. */
  private cue: Cue | null = null
  private playToken = 0
  private readonly cancellers = new Set<() => void>()

  constructor() {
    this.status = this.baseStatus()
    subscribeAuth(() => this.onAuthChanged())
  }

  getStatus(): EngineStatus {
    return this.status
  }

  getLog(): readonly DiagnosticEntry[] {
    return this.log
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  init(): Promise<void> {
    if (this.status.state === 'ready' && this.deviceId) return Promise.resolve()
    if (this.connecting) return this.connecting
    // The SDK dropped its device (not_ready) but usually reconnects by itself.
    if (this.player && this.status.state === 'connecting') {
      this.connecting = this.waitForDevice().finally(() => {
        this.connecting = null
      })
      return this.connecting
    }
    const base = this.baseStatus()
    if (base.state !== 'idle') {
      this.setStatus(base)
      return Promise.reject(
        new EngineUnavailableError(
          'spotify',
          base.state === 'error' ? base.failure : 'not-connected',
        ),
      )
    }
    this.connecting = this.connect().finally(() => {
      this.connecting = null
    })
    return this.connecting
  }

  async prepare(track: Track): Promise<PreparedTrack> {
    const known = this.tracks.get(track.key)
    if (known) return this.prepared(track.key, known.durationMs)

    // Deezer search results carry no ISRC; the track endpoint does, and ISRC is the
    // most reliable way to find the same recording on Spotify.
    let isrc = track.isrc
    if (!isrc && track.deezerId !== undefined) {
      isrc = (await getDeezerTrack(track.deezerId).catch(() => null))?.isrc
    }
    const match = await findSpotifyTrack({ ...track, isrc })
    if (!match) throw new TrackUnavailableError('spotify')
    this.tracks.set(track.key, match)
    this.record(`Resolved "${track.title}" to ${match.uri}${isrc ? ` (ISRC ${isrc})` : ''}`)
    return this.prepared(track.key, match.durationMs)
  }

  async playClip(
    prepared: PreparedTrack,
    startSec: number,
    durationSec: number,
  ): Promise<ClipResult> {
    this.cancelPending()
    const token = ++this.playToken
    await this.init()
    this.assertCurrent(token)
    const player = this.requirePlayer()
    const entry = this.tracks.get(prepared.trackKey)
    if (!entry) throw new TrackUnavailableError('spotify')

    const startMs = Math.round(clampStart(startSec, durationSec, prepared.playableLengthSec) * 1000)
    const requestedMs = Math.round(durationSec * 1000)

    try {
      if (this.cue?.uri !== entry.uri || this.cue.startMs !== startMs) {
        await this.cueTrack(entry.uri, startMs, token)
      }

      await player.setVolume(this.volume)
      const resumeAt = performance.now()
      await player.resume()
      await this.waitForState((s) => !s.paused, 3000, 'resume', token)
      const latency = Math.round(performance.now() - resumeAt)
      this.cue = null

      await this.sleepUnlessCancelled(requestedMs, token)
      await player.pause()
      const ended = await this.waitForState((s) => s.paused, 3000, 'pause')
      await player.setVolume(0)

      const actualMs = Math.max(0, Math.round(ended.position - startMs))
      this.record(
        `Clip ${requestedMs} ms at ${startMs} ms: played ${actualMs} ms (resume took ${latency} ms)`,
      )

      // Park at the start point again so replaying the same clip starts instantly.
      await this.park(startMs)
      this.cue = { uri: entry.uri, startMs }
      return { startSec: startMs / 1000, requestedMs, actualMs }
    } catch (error) {
      this.cue = null
      if (!(error instanceof ClipCancelledError)) {
        void player.pause().catch(() => undefined)
        void player.setVolume(0).catch(() => undefined)
      }
      throw error
    }
  }

  pickRandomStart(prepared: PreparedTrack, maxClipSec: number): number {
    return pickRandomStart({
      playableSec: prepared.playableLengthSec,
      maxClipSec,
      marginStartSec: RANDOM_MARGIN_SEC,
      marginEndSec: RANDOM_MARGIN_SEC,
    })
  }

  stop(): void {
    this.playToken++
    this.cue = null
    this.cancelPending()
    const player = this.player
    if (!player) return
    void player.pause().catch(() => undefined)
    void player.setVolume(0).catch(() => undefined)
  }

  setVolume(volume: number): void {
    // Applied when a clip plays; between clips the SDK stays muted.
    this.volume = volume
  }

  // ---------------------------------------------------------------------------

  private async connect(): Promise<void> {
    // Retrying after a failure: drop the previous player instance first.
    this.player?.disconnect()
    this.player = null
    this.deviceId = null
    this.cue = null
    this.setStatus({ state: 'connecting' })

    const support = await checkPlaybackSupport()
    this.record(`Browser check: ${support}`)
    if (support !== 'ok') {
      const detail = support === 'mobile' ? 'Mobile browser' : 'Widevine DRM not available'
      this.fail('init', detail)
      throw new EngineUnavailableError('spotify', 'init', detail)
    }

    this.record('Loading Web Playback SDK')
    try {
      await loadSpotifySdk()
    } catch {
      this.fail('init', 'SDK script could not be loaded')
      throw new EngineUnavailableError('spotify', 'init', 'SDK script could not be loaded')
    }
    this.record('SDK loaded, creating player')

    const player = new Spotify.Player({
      name: `${APP_NAME} (web)`,
      volume: 0,
      getOAuthToken: (callback) => {
        this.record('SDK asked for an access token')
        getAccessToken()
          .then((token) => {
            if (token) callback(token)
            else this.fail('not-connected')
          })
          .catch(() => this.fail('auth', 'Access token could not be refreshed'))
      },
    })
    this.player = player

    let firstReady: (deviceId: string) => void = () => undefined
    const ready = new Promise<string>((resolve) => {
      firstReady = resolve
    })
    player.addListener('ready', ({ device_id }) => {
      this.record(`Player ready, device ${device_id}`)
      this.deviceId = device_id
      // A reconnect after not_ready: the engine is usable again.
      if (this.status.state === 'connecting' && !this.connecting) this.setStatus({ state: 'ready' })
      firstReady(device_id)
    })
    player.addListener('not_ready', ({ device_id }) => {
      this.record(`Device went offline: ${device_id}`)
      this.deviceId = null
      this.cue = null
      if (this.status.state === 'ready') this.setStatus({ state: 'connecting' })
    })
    player.addListener('initialization_error', ({ message }) => this.fail('init', message))
    player.addListener('authentication_error', ({ message }) => this.fail('auth', message))
    player.addListener('account_error', ({ message }) => this.fail('account', message))
    player.addListener('playback_error', ({ message }) => this.record(`Playback error: ${message}`))
    player.addListener('autoplay_failed', () => this.record('Browser blocked autoplay'))
    player.addListener('player_state_changed', (state) => {
      this.record(
        `State: ${state.paused ? 'paused' : 'playing'}${state.loading ? ' (loading)' : ''} at ${state.position} ms`,
      )
    })

    this.record('Calling player.connect()')
    const connected = await withTimeout(player.connect(), CONNECT_TIMEOUT_MS)
    if (connected === 'timeout') return this.abortConnect('connect() never resolved')
    if (!connected) return this.abortConnect('connect() returned false', 'init')
    this.record('connect() resolved, waiting for the ready event')

    const deviceId = await withTimeout(ready, CONNECT_TIMEOUT_MS)
    if (deviceId === 'timeout') return this.abortConnect('ready event never arrived')
    if (this.status.state === 'error') {
      throw new EngineUnavailableError('spotify', this.status.failure, this.status.detail)
    }

    this.deviceId = deviceId
    this.setStatus({ state: 'ready' })
  }

  private abortConnect(detail: string, failure: EngineFailure = 'connect-timeout'): never {
    // A specific error reported by an SDK listener is more useful than a timeout.
    const reported = this.status.state === 'error' ? this.status.failure : failure
    if (this.status.state !== 'error') this.fail(failure, detail)
    this.player?.disconnect()
    this.player = null
    throw new EngineUnavailableError('spotify', reported, detail)
  }

  private async waitForDevice(): Promise<void> {
    const deadline = performance.now() + RECONNECT_TIMEOUT_MS
    while (performance.now() < deadline) {
      if (this.deviceId) {
        this.setStatus({ state: 'ready' })
        return
      }
      if (this.status.state === 'error') break
      await sleep(100)
    }
    if (this.status.state !== 'error') this.fail('device-offline', 'No device after not_ready')
    throw new EngineUnavailableError('spotify', 'device-offline')
  }

  /** Starts the song muted, waits until it really plays, then parks it at `startMs`. */
  private async cueTrack(uri: string, startMs: number, token: number): Promise<void> {
    const player = this.requirePlayer()
    const deviceId = this.deviceId
    if (!deviceId) throw new EngineUnavailableError('spotify', 'device-offline')

    this.record(`Cueing ${uri} at ${startMs} ms`)
    this.cue = null
    await player.setVolume(0)
    await startPlayback(deviceId, uri, startMs)
    await this.waitForState(
      (s) => {
        const current = s.track_window.current_track
        return !s.paused && !s.loading && (current.uri === uri || current.linked_from?.uri === uri)
      },
      8000,
      'track to start',
      token,
    )
    this.assertCurrent(token)
    await this.park(startMs)
    this.cue = { uri, startMs }
  }

  /** Pauses and seeks to `startMs`, then waits until the player confirms the position. */
  private async park(startMs: number): Promise<void> {
    const player = this.requirePlayer()
    await player.pause()
    await player.seek(startMs)
    try {
      await this.waitForState(
        (s) => s.paused && Math.abs(s.position - startMs) <= SEEK_TOLERANCE_MS,
        1500,
        'seek to start point',
      )
    } catch (error) {
      // Not fatal: the clip still plays, but may start slightly off. Keep it in the log.
      if (!(error instanceof EngineUnavailableError) || error.failure !== 'playback') throw error
    }
  }

  private async waitForState(
    predicate: (state: Spotify.PlaybackState) => boolean,
    timeoutMs: number,
    label: string,
    token?: number,
  ): Promise<Spotify.PlaybackState> {
    const player = this.requirePlayer()
    const deadline = performance.now() + timeoutMs
    while (performance.now() < deadline) {
      if (token !== undefined) this.assertCurrent(token)
      // An SDK listener (e.g. account_error) may have failed the engine meanwhile.
      if (this.status.state === 'error') {
        throw new EngineUnavailableError('spotify', this.status.failure, this.status.detail)
      }
      const state = await player.getCurrentState()
      if (state && predicate(state)) return state
      await sleep(STATE_POLL_MS)
    }
    this.record(`Timed out waiting for ${label}`)
    throw new EngineUnavailableError('spotify', 'playback', `Timed out waiting for ${label}`)
  }

  /** Resolves after `ms`, or rejects with ClipCancelledError as soon as stop() is called. */
  private sleepUnlessCancelled(ms: number, token: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const cancel = () => {
        clearTimeout(timer)
        this.cancellers.delete(cancel)
        reject(new ClipCancelledError())
      }
      const timer = setTimeout(() => {
        this.cancellers.delete(cancel)
        resolve()
      }, ms)
      this.cancellers.add(cancel)
      if (token !== this.playToken) cancel()
    })
  }

  private cancelPending(): void {
    for (const cancel of [...this.cancellers]) cancel()
  }

  private assertCurrent(token: number): void {
    if (token !== this.playToken) throw new ClipCancelledError()
  }

  private requirePlayer(): Spotify.Player {
    if (!this.player) throw new EngineUnavailableError('spotify', 'device-offline')
    return this.player
  }

  private onAuthChanged(): void {
    if (isLoggedIn()) {
      if (this.status.state === 'needs-auth') this.setStatus({ state: 'idle' })
      return
    }
    this.stop()
    this.player?.disconnect()
    this.player = null
    this.deviceId = null
    this.tracks.clear()
    this.setStatus(this.baseStatus())
  }

  private baseStatus(): EngineStatus {
    if (!getClientId()) return { state: 'error', failure: 'no-client-id' }
    if (!isLoggedIn()) return { state: 'needs-auth' }
    return { state: 'idle' }
  }

  private fail(failure: EngineFailure, detail?: string): void {
    this.record(`Failure: ${failure}${detail ? ` (${detail})` : ''}`)
    this.setStatus({ state: 'error', failure, detail })
  }

  private setStatus(status: EngineStatus): void {
    this.status = status
    this.notify()
  }

  private record(message: string): void {
    const entry = { at: Math.round(performance.now() - this.createdAt), message }
    this.log = [...this.log.slice(-(MAX_LOG_ENTRIES - 1)), entry]
    this.notify()
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }

  private prepared(trackKey: string, durationMs: number): PreparedTrack {
    return { engine: 'spotify', trackKey, playableLengthSec: durationMs / 1000 }
  }
}
