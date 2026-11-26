import { describe, expect, it } from 'vitest'
import { isAllowedDeezerAudioUrl, toProxiedAudioUrl } from './deezerAudioUrl'

describe('isAllowedDeezerAudioUrl', () => {
  it('accepts Deezer CDN preview hosts', () => {
    expect(
      isAllowedDeezerAudioUrl('https://cdnt-preview.dzcdn.net/api/1/1/a/b/c/0/abc.mp3?hdnea=x'),
    ).toBe(true)
    expect(isAllowedDeezerAudioUrl('https://cdns-preview-5.dzcdn.net/stream/c-123.mp3')).toBe(true)
  })

  it('rejects other hosts and look-alikes', () => {
    expect(isAllowedDeezerAudioUrl('https://example.com/a.mp3')).toBe(false)
    expect(isAllowedDeezerAudioUrl('https://evildzcdn.net/a.mp3')).toBe(false)
    expect(isAllowedDeezerAudioUrl('https://dzcdn.net.evil.com/a.mp3')).toBe(false)
  })

  it('rejects non-http protocols and garbage', () => {
    expect(isAllowedDeezerAudioUrl('file:///etc/passwd')).toBe(false)
    expect(isAllowedDeezerAudioUrl('not a url')).toBe(false)
  })
})

describe('toProxiedAudioUrl', () => {
  it('encodes the preview URL as a query parameter', () => {
    expect(toProxiedAudioUrl('https://cdnt-preview.dzcdn.net/x.mp3?a=1&b=2')).toBe(
      '/api/deezer-audio?url=https%3A%2F%2Fcdnt-preview.dzcdn.net%2Fx.mp3%3Fa%3D1%26b%3D2',
    )
  })
})
