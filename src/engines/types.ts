import type { Track } from '../types/music'

export type EngineId = 'deezer' | 'spotify'

export const ENGINE_IDS: readonly EngineId[] = ['deezer', 'spotify']

export const ENGINE_NAMES: Record<EngineId, string> = {
  deezer: 'Deezer',
  spotify: 'Spotify',
}

/** Why an engine cannot be used right now. */
export type EngineFailure =
  | 'no-client-id'
  | 'not-connected'
  | 'user-not-allowed'
  | 'account'
  | 'init'
  | 'auth'
  | 'connect-timeout'
  | 'device-offline'
  | 'playback'

export type EngineStatus =
  | { state: 'idle' }
  | { state: 'needs-auth' }
  | { state: 'connecting' }
  | { state: 'ready' }
  | { state: 'error'; failure: EngineFailure; detail?: string }

/** A track the engine has resolved and can play immediately. */
export interface PreparedTrack {
  readonly engine: EngineId
  readonly trackKey: string
  /** Length of audio this engine can play for the track (30 s for Deezer previews). */
  readonly playableLengthSec: number
}

export interface ClipResult {
  /** Where the clip actually started, in seconds of the playable audio. */
  startSec: number
  requestedMs: number
  /** Audio that was really played, as measured by the engine. */
  actualMs: number
}

/**
 * The only way game code plays audio. Implementations must be swappable.
 */
export interface AudioEngine {
  readonly id: EngineId
  getStatus(): EngineStatus
  /** Notifies on status (and, for engines that log, diagnostics) changes. */
  subscribe(listener: () => void): () => void
  /** Idempotent. Engines that need a connection establish it here. */
  init(): Promise<void>
  /** Resolves everything needed to play. Throws TrackUnavailableError if impossible. */
  prepare(track: Track): Promise<PreparedTrack>
  /**
   * Plays `[startSec, startSec + durationSec]` and resolves when the clip has ended.
   * Rejects with ClipCancelledError if stop() or a newer clip interrupts it.
   */
  playClip(prepared: PreparedTrack, startSec: number, durationSec: number): Promise<ClipResult>
  /** Random start point suited to this engine (margins, silence detection). */
  pickRandomStart(prepared: PreparedTrack, maxClipSec: number): number
  stop(): void
  /** 0..1 */
  setVolume(volume: number): void
}
