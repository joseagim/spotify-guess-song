import { computeRms, SILENCE_RMS_THRESHOLD } from '../../lib/audio'
import { clampStart, pickAudibleRandomStart } from '../../lib/clip'
import { toProxiedAudioUrl } from '../../lib/deezerAudioUrl'
import {
  ClipCancelledError,
  HttpError,
  NetworkError,
  TrackUnavailableError,
} from '../../lib/errors'
import { getTrack, getTrackByIsrc, type DeezerTrack } from '../../services/deezer/api'
import type { Track } from '../../types/music'
import type { AudioEngine, ClipResult, EngineStatus, PreparedTrack } from '../types'

/** Decoded previews kept in memory (30 s stereo ≈ 10 MB each). */
const MAX_CACHED_BUFFERS = 12
/** Scheduling a few ms ahead keeps the start sample-accurate. */
const SCHEDULE_AHEAD_SEC = 0.03
/** Tiny fades avoid clicks when cutting mid-waveform. */
const FADE_SEC = 0.005

interface ActiveClip {
  source: AudioBufferSourceNode
  stopped: boolean
}

/**
 * Plays Deezer's 30-second previews with the Web Audio API, which allows clips that are
 * exact to the sample (REQUIREMENTS.md §4.1).
 */
export class DeezerEngine implements AudioEngine {
  readonly id = 'deezer' as const

  private context: AudioContext | null = null
  private master: GainNode | null = null
  private volume = 0.8
  /** Least recently used first. */
  private readonly buffers = new Map<string, AudioBuffer>()
  /** Tracks seen by prepare(), so an evicted buffer can be fetched again. */
  private readonly knownTracks = new Map<string, Track>()
  private active: ActiveClip | null = null
  private playToken = 0
  private readonly status: EngineStatus = { state: 'ready' }
  private readonly listeners = new Set<() => void>()

  getStatus(): EngineStatus {
    return this.status
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async init(): Promise<void> {
    await this.ensureContext().resume()
  }

  async prepare(track: Track): Promise<PreparedTrack> {
    this.knownTracks.set(track.key, track)
    const cached = this.buffers.get(track.key)
    if (cached) {
      this.remember(track.key, cached)
      return this.prepared(track.key, cached)
    }

    const deezerTrack = await this.resolve(track)
    if (!deezerTrack?.preview) throw new TrackUnavailableError('deezer')

    let response: Response
    try {
      response = await fetch(toProxiedAudioUrl(deezerTrack.preview))
    } catch {
      throw new NetworkError('Deezer')
    }
    if (!response.ok) throw new HttpError('Deezer', response.status)

    let buffer: AudioBuffer
    try {
      buffer = await this.ensureContext().decodeAudioData(await response.arrayBuffer())
    } catch {
      // Corrupt or unexpected audio: treat it like a song without a preview.
      throw new TrackUnavailableError('deezer')
    }
    this.remember(track.key, buffer)
    return this.prepared(track.key, buffer)
  }

  async playClip(
    prepared: PreparedTrack,
    startSec: number,
    durationSec: number,
  ): Promise<ClipResult> {
    this.stop()
    const token = this.playToken

    let buffer = this.buffers.get(prepared.trackKey)
    if (!buffer) {
      const track = this.knownTracks.get(prepared.trackKey)
      if (!track) throw new TrackUnavailableError('deezer')
      await this.prepare(track)
      buffer = this.buffers.get(prepared.trackKey)
      if (!buffer) throw new TrackUnavailableError('deezer')
    }

    const context = this.ensureContext()
    await context.resume()
    // stop() or a newer clip may have happened while we were waiting.
    if (token !== this.playToken) throw new ClipCancelledError()

    const start = clampStart(startSec, durationSec, buffer.duration)
    const duration = Math.min(durationSec, buffer.duration - start)
    const fade = Math.min(FADE_SEC, duration / 4)
    const at = context.currentTime + SCHEDULE_AHEAD_SEC

    const source = context.createBufferSource()
    source.buffer = buffer
    const envelope = context.createGain()
    envelope.gain.setValueAtTime(0, at)
    envelope.gain.linearRampToValueAtTime(1, at + fade)
    envelope.gain.setValueAtTime(1, at + duration - fade)
    envelope.gain.linearRampToValueAtTime(0, at + duration)
    source.connect(envelope).connect(this.master ?? context.destination)

    const clip: ActiveClip = { source, stopped: false }
    this.active = clip

    return new Promise<ClipResult>((resolve, reject) => {
      source.onended = () => {
        if (this.active === clip) this.active = null
        envelope.disconnect()
        if (clip.stopped) {
          reject(new ClipCancelledError())
          return
        }
        // Web Audio plays exactly the scheduled window.
        resolve({
          startSec: start,
          requestedMs: Math.round(durationSec * 1000),
          actualMs: Math.round(duration * 1000),
        })
      }
      source.start(at, start, duration)
    })
  }

  pickRandomStart(prepared: PreparedTrack, maxClipSec: number): number {
    const buffer = this.buffers.get(prepared.trackKey)
    const samples = buffer?.getChannelData(0)
    return pickAudibleRandomStart(
      {
        playableSec: prepared.playableLengthSec,
        maxClipSec,
        marginStartSec: 0,
        marginEndSec: 1,
      },
      (start) =>
        !buffer || !samples
          ? true
          : computeRms(samples, buffer.sampleRate, start, maxClipSec) > SILENCE_RMS_THRESHOLD,
    )
  }

  stop(): void {
    this.playToken++
    const clip = this.active
    if (!clip) return
    clip.stopped = true
    try {
      clip.source.stop()
    } catch {
      // Already stopped.
    }
  }

  setVolume(volume: number): void {
    this.volume = volume
    if (this.master) this.master.gain.value = volume
  }

  private ensureContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.master.gain.value = this.volume
      this.master.connect(this.context.destination)
    }
    return this.context
  }

  /** Fetches the track fresh: preview URLs are signed and expire. */
  private async resolve(track: Track): Promise<DeezerTrack | null> {
    if (track.deezerId !== undefined) return getTrack(track.deezerId)
    if (track.isrc) return getTrackByIsrc(track.isrc)
    return null
  }

  /** Inserts or refreshes an entry as most recently used, evicting the oldest. */
  private remember(key: string, buffer: AudioBuffer): void {
    this.buffers.delete(key)
    this.buffers.set(key, buffer)
    while (this.buffers.size > MAX_CACHED_BUFFERS) {
      const oldest = this.buffers.keys().next().value
      if (oldest === undefined) break
      this.buffers.delete(oldest)
    }
  }

  private prepared(trackKey: string, buffer: AudioBuffer): PreparedTrack {
    return { engine: 'deezer', trackKey, playableLengthSec: buffer.duration }
  }
}
