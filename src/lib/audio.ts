/** Root-mean-square loudness (0..1) of a window of PCM samples. */
export function computeRms(
  samples: Float32Array,
  sampleRate: number,
  startSec: number,
  durationSec: number,
): number {
  const from = Math.max(0, Math.floor(startSec * sampleRate))
  const to = Math.min(samples.length, Math.ceil((startSec + durationSec) * sampleRate))
  if (to <= from) return 0
  let sum = 0
  for (let i = from; i < to; i++) {
    const s = samples[i] ?? 0
    sum += s * s
  }
  return Math.sqrt(sum / (to - from))
}

/** Roughly -40 dBFS: quieter than this sounds like silence in a short clip. */
export const SILENCE_RMS_THRESHOLD = 0.01
