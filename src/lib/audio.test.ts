import { describe, expect, it } from 'vitest'
import { computeRms, SILENCE_RMS_THRESHOLD } from './audio'

const RATE = 1000

function tone(seconds: number, amplitude: number): Float32Array {
  const out = new Float32Array(seconds * RATE)
  for (let i = 0; i < out.length; i++) out[i] = amplitude * Math.sin((2 * Math.PI * 50 * i) / RATE)
  return out
}

describe('computeRms', () => {
  it('is 0 for silence and below the threshold for very quiet audio', () => {
    expect(computeRms(new Float32Array(2 * RATE), RATE, 0, 1)).toBe(0)
    expect(computeRms(tone(2, 0.005), RATE, 0, 1)).toBeLessThan(SILENCE_RMS_THRESHOLD)
  })

  it('is about amplitude / sqrt(2) for a sine wave', () => {
    expect(computeRms(tone(2, 0.5), RATE, 0.5, 1)).toBeCloseTo(0.5 / Math.SQRT2, 2)
  })

  it('only measures the requested window', () => {
    const samples = new Float32Array(4 * RATE)
    samples.set(tone(1, 0.8), 2 * RATE)
    expect(computeRms(samples, RATE, 0, 1)).toBe(0)
    expect(computeRms(samples, RATE, 2, 1)).toBeGreaterThan(0.5)
  })

  it('handles windows outside the buffer', () => {
    expect(computeRms(tone(1, 0.5), RATE, 5, 1)).toBe(0)
  })
})
