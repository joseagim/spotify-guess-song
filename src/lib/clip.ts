/** Pure helpers for choosing where a clip starts inside the playable audio. */

/** Keeps a clip of `durationSec` inside `[0, playableSec]`. */
export function clampStart(startSec: number, durationSec: number, playableSec: number): number {
  const latest = Math.max(0, playableSec - durationSec)
  return Math.min(Math.max(0, startSec), latest)
}

export interface RandomStartOptions {
  playableSec: number
  /** Longest clip that has to fit after the start point (e.g. the last hint step). */
  maxClipSec: number
  /** Seconds excluded at the beginning of the playable range. */
  marginStartSec: number
  /** Seconds excluded at the end of the playable range. */
  marginEndSec: number
  random?: () => number
}

/**
 * Random start point such that the longest clip fits and the margins are respected.
 * If the audio is too short for the margins, they are dropped rather than failing.
 */
export function pickRandomStart(options: RandomStartOptions): number {
  const { playableSec, maxClipSec, random = Math.random } = options
  let earliest = options.marginStartSec
  let latest = playableSec - options.marginEndSec - maxClipSec
  if (latest < earliest) {
    earliest = 0
    latest = playableSec - maxClipSec
  }
  if (latest <= 0) return 0
  return earliest + random() * (latest - earliest)
}

/**
 * Tries random start points until `isAudible` accepts one (e.g. not silence).
 * Falls back to the last candidate after `attempts` tries.
 */
export function pickAudibleRandomStart(
  options: RandomStartOptions,
  isAudible: (startSec: number) => boolean,
  attempts = 8,
): number {
  let candidate = 0
  for (let i = 0; i < attempts; i++) {
    candidate = pickRandomStart(options)
    if (isAudible(candidate)) return candidate
  }
  return candidate
}
