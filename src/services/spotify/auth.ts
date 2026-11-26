import { SPOTIFY_SCOPES } from '../../config/app'
import { EngineUnavailableError, HttpError, LoginError, NetworkError } from '../../lib/errors'
import { codeChallengeS256, randomString } from '../../lib/pkce'

/**
 * Spotify login with Authorization Code + PKCE, entirely in the browser (no client secret).
 * Tokens live in localStorage; this is a local, single-user app.
 */

interface StoredToken {
  accessToken: string
  refreshToken: string
  /** Epoch ms. */
  expiresAt: number
  scope: string
}

interface PendingLogin {
  verifier: string
  state: string
  returnTo: string
}

interface TokenResponse {
  access_token: string
  token_type: string
  scope: string
  expires_in: number
  refresh_token?: string
}

const TOKEN_KEY = 'gs.spotify.token'
const PENDING_KEY = 'gs.spotify.pending'
const ACCOUNTS = 'https://accounts.spotify.com'
const EXPIRY_MARGIN_MS = 60_000

const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getClientId(): string | null {
  const id = import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim()
  return id ? id : null
}

export function getRedirectUri(): string {
  return `${window.location.origin}/callback`
}

function readToken(): StoredToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    return raw ? (JSON.parse(raw) as StoredToken) : null
  } catch {
    return null
  }
}

function writeToken(token: StoredToken | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, JSON.stringify(token))
  else localStorage.removeItem(TOKEN_KEY)
  emit()
}

function storeResponse(response: TokenResponse, previousRefreshToken?: string): void {
  writeToken({
    accessToken: response.access_token,
    // Spotify may or may not rotate the refresh token.
    refreshToken: response.refresh_token ?? previousRefreshToken ?? '',
    expiresAt: Date.now() + response.expires_in * 1000,
    scope: response.scope,
  })
}

export function isLoggedIn(): boolean {
  return readToken() !== null
}

export async function beginLogin(returnTo: string): Promise<void> {
  const clientId = getClientId()
  if (!clientId) throw new EngineUnavailableError('spotify', 'no-client-id')

  const verifier = randomString(64)
  const state = randomString(16)
  const challenge = await codeChallengeS256(verifier)
  const pending: PendingLogin = { verifier, state, returnTo }
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending))

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SPOTIFY_SCOPES.join(' '),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    redirect_uri: getRedirectUri(),
    state,
  })
  window.location.assign(`${ACCOUNTS}/authorize?${params.toString()}`)
}

async function requestToken(body: URLSearchParams): Promise<TokenResponse> {
  let response: Response
  try {
    response = await fetch(`${ACCOUNTS}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
  } catch {
    throw new NetworkError('Spotify')
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new HttpError('Spotify', response.status, detail)
  }
  return (await response.json()) as TokenResponse
}

// React StrictMode runs effects twice in development; an authorization code can only be
// exchanged once, so concurrent calls for the same code share one promise.
const exchanges = new Map<string, Promise<string>>()

/** Handles the /callback redirect. Resolves with the path to return to. */
export function completeLogin(search: string): Promise<string> {
  const params = new URLSearchParams(search)
  const code = params.get('code') ?? ''
  const existing = exchanges.get(code)
  if (existing) return existing

  const exchange = (async () => {
    const error = params.get('error')
    if (error) throw new LoginError(error)
    if (!code) throw new LoginError('missing_code')

    const raw = sessionStorage.getItem(PENDING_KEY)
    if (!raw) throw new LoginError('missing_verifier')
    const pending = JSON.parse(raw) as PendingLogin
    if (params.get('state') !== pending.state) throw new LoginError('state_mismatch')

    const clientId = getClientId()
    if (!clientId) throw new EngineUnavailableError('spotify', 'no-client-id')

    const response = await requestToken(
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: getRedirectUri(),
        client_id: clientId,
        code_verifier: pending.verifier,
      }),
    )
    storeResponse(response)
    sessionStorage.removeItem(PENDING_KEY)
    return pending.returnTo || '/settings'
  })()

  exchanges.set(code, exchange)
  return exchange
}

let refreshing: Promise<string | null> | null = null

async function refresh(): Promise<string | null> {
  const token = readToken()
  const clientId = getClientId()
  if (!token || !clientId || !token.refreshToken) {
    writeToken(null)
    return null
  }
  try {
    const response = await requestToken(
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
        client_id: clientId,
      }),
    )
    storeResponse(response, token.refreshToken)
    return response.access_token
  } catch (error) {
    if (error instanceof HttpError && (error.status === 400 || error.status === 401)) {
      // Another tab may have refreshed first and rotated the refresh token.
      const latest = readToken()
      if (latest && latest.refreshToken !== token.refreshToken && latest.expiresAt > Date.now()) {
        return latest.accessToken
      }
      // Otherwise the refresh token was rejected: the session is over.
      writeToken(null)
      return null
    }
    throw error
  }
}

/** Refreshes the access token now (deduplicated across callers). */
export function forceRefresh(): Promise<string | null> {
  refreshing ??= refresh().finally(() => {
    refreshing = null
  })
  return refreshing
}

/** A valid access token, refreshed if it is about to expire; null when logged out. */
export async function getAccessToken(): Promise<string | null> {
  const token = readToken()
  if (!token) return null
  if (token.expiresAt - EXPIRY_MARGIN_MS > Date.now()) return token.accessToken
  return forceRefresh()
}

export function logout(): void {
  writeToken(null)
}

// Keep tabs in sync: logging in or out in one tab updates the others.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === TOKEN_KEY) emit()
  })
}
