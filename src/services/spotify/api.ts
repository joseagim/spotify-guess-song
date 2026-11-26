import { EngineUnavailableError, HttpError, NetworkError, RateLimitError } from '../../lib/errors'
import type { Track } from '../../types/music'
import { forceRefresh, getAccessToken } from './auth'

/**
 * Minimal Spotify Web API client for Development Mode (2026 rules):
 * search limit is 10, batch endpoints and `popularity` are gone. See CLAUDE.md.
 */

const API = 'https://api.spotify.com/v1'
const SEARCH_LIMIT_MAX = 10

interface SpotifyImage {
  url: string
  width: number | null
  height: number | null
}

export interface SpotifyTrack {
  id: string
  uri: string
  name: string
  duration_ms: number
  is_playable?: boolean
  external_ids?: { isrc?: string }
  artists: { id: string; name: string }[]
  album: { id: string; name: string; images: SpotifyImage[] }
}

interface SearchResponse {
  tracks?: { items: SpotifyTrack[] }
}

export interface SpotifyProfile {
  id: string
  display_name: string | null
}

async function spotifyFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = await getAccessToken()
  if (!token) throw new EngineUnavailableError('spotify', 'not-connected')

  let response: Response
  try {
    response = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    })
  } catch {
    throw new NetworkError('Spotify')
  }

  if (response.status === 401 && retry) {
    const refreshed = await forceRefresh()
    if (!refreshed) throw new EngineUnavailableError('spotify', 'not-connected')
    return spotifyFetch(path, init, false)
  }
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('Retry-After') ?? '5')
    throw new RateLimitError('Spotify', Number.isFinite(retryAfter) ? retryAfter : 5)
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    // Development Mode answers 403 for accounts that are not on the app's user list.
    if (response.status === 403 && /not registered|user may not be registered/i.test(detail)) {
      throw new EngineUnavailableError('spotify', 'user-not-allowed', detail)
    }
    throw new HttpError('Spotify', response.status, detail)
  }
  return response
}

export function spotifyTrackToTrack(track: SpotifyTrack): Track {
  const images = track.album.images
  return {
    key: `sp:${track.id}`,
    title: track.name,
    artists: track.artists.map((a) => a.name),
    album: track.album.name,
    coverUrl: (images[1] ?? images[0])?.url,
    durationMs: track.duration_ms,
    isrc: track.external_ids?.isrc,
    spotifyUri: track.uri,
  }
}

export async function getProfile(): Promise<SpotifyProfile> {
  const response = await spotifyFetch('/me')
  return (await response.json()) as SpotifyProfile
}

export async function searchTracks(
  query: string,
  limit = SEARCH_LIMIT_MAX,
): Promise<SpotifyTrack[]> {
  const params = new URLSearchParams({
    q: query,
    type: 'track',
    limit: String(Math.min(limit, SEARCH_LIMIT_MAX)),
  })
  const response = await spotifyFetch(`/search?${params.toString()}`)
  const body = (await response.json()) as SearchResponse
  return body.tracks?.items ?? []
}

const lowered = (s: string) => s.toLocaleLowerCase()

export interface SpotifyMatch {
  uri: string
  /** Length of the Spotify recording, which can differ slightly from other platforms. */
  durationMs: number
}

/**
 * Finds a track coming from another platform on Spotify.
 * M1 version: ISRC first, then exact title + primary artist. M2 replaces this with the
 * full matching rules and a persistent cache (REQUIREMENTS.md §4.3).
 */
export async function findSpotifyTrack(track: Track): Promise<SpotifyMatch | null> {
  if (track.spotifyUri) return { uri: track.spotifyUri, durationMs: track.durationMs }

  if (track.isrc) {
    const [hit] = await searchTracks(`isrc:${track.isrc}`, 1)
    if (hit) return { uri: hit.uri, durationMs: hit.duration_ms }
  }

  const primaryArtist = track.artists[0]
  if (!primaryArtist) return null
  const candidates = await searchTracks(`track:${track.title} artist:${primaryArtist}`, 5)
  const hit = candidates.find(
    (c) =>
      lowered(c.name) === lowered(track.title) &&
      c.artists.some((a) => lowered(a.name) === lowered(primaryArtist)),
  )
  return hit ? { uri: hit.uri, durationMs: hit.duration_ms } : null
}

/** Starts `uri` at `positionMs` on our Web Playback SDK device. */
export async function startPlayback(
  deviceId: string,
  uri: string,
  positionMs: number,
): Promise<void> {
  await spotifyFetch(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
    method: 'PUT',
    body: JSON.stringify({ uris: [uri], position_ms: Math.max(0, Math.round(positionMs)) }),
  })
}
