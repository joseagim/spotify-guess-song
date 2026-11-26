import { describe, expect, it } from 'vitest'
import { base64UrlEncode, codeChallengeS256, randomString } from './pkce'

describe('PKCE helpers', () => {
  it('computes the RFC 7636 appendix B example challenge', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    expect(await codeChallengeS256(verifier)).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })

  it('base64url-encodes without padding or unsafe characters', () => {
    expect(base64UrlEncode(new Uint8Array([251, 255, 254]))).toBe('-__-')
  })

  it('generates random strings of the requested length and charset', () => {
    const value = randomString(64)
    expect(value).toHaveLength(64)
    expect(value).toMatch(/^[A-Za-z0-9\-._~]+$/)
    expect(randomString(64)).not.toBe(value)
  })
})
