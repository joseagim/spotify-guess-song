import { describe, expect, it } from 'vitest'
import { clampStart, pickAudibleRandomStart, pickRandomStart } from './clip'

describe('clampStart', () => {
  it('keeps the clip inside the playable range', () => {
    expect(clampStart(5, 2, 30)).toBe(5)
    expect(clampStart(29.5, 2, 30)).toBe(28)
    expect(clampStart(-1, 2, 30)).toBe(0)
  })

  it('returns 0 when the clip is longer than the audio', () => {
    expect(clampStart(3, 40, 30)).toBe(0)
  })
})

describe('pickRandomStart', () => {
  const base = { playableSec: 200, maxClipSec: 2, marginStartSec: 10, marginEndSec: 10 }

  it('respects margins and leaves room for the longest clip', () => {
    expect(pickRandomStart({ ...base, random: () => 0 })).toBe(10)
    expect(pickRandomStart({ ...base, random: () => 1 })).toBe(188)
  })

  it('drops margins when the audio is too short for them', () => {
    const start = pickRandomStart({ ...base, playableSec: 15, random: () => 1 })
    expect(start).toBe(13)
  })

  it('returns 0 when nothing fits', () => {
    expect(pickRandomStart({ ...base, playableSec: 1, random: () => 0.5 })).toBe(0)
  })
})

describe('pickAudibleRandomStart', () => {
  it('skips candidates rejected by the audibility check', () => {
    const values = [0, 0.5]
    let call = 0
    const start = pickAudibleRandomStart(
      {
        playableSec: 30,
        maxClipSec: 2,
        marginStartSec: 0,
        marginEndSec: 0,
        random: () => values[call++] ?? 0.5,
      },
      (s) => s > 1,
    )
    expect(start).toBe(14)
  })
})
