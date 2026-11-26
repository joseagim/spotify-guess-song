/** Helpers for the OAuth 2.0 Authorization Code flow with PKCE (RFC 7636). */

const UNRESERVED = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Cryptographically random string made of RFC 7636 "unreserved" characters. */
export function randomString(length: number): string {
  const values = crypto.getRandomValues(new Uint8Array(length))
  let out = ''
  for (const value of values) out += UNRESERVED[value % UNRESERVED.length]
  return out
}

export async function codeChallengeS256(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64UrlEncode(new Uint8Array(digest))
}
