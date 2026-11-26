import { HttpError, NetworkError, RateLimitError } from '../../lib/errors'
import type { Track } from '../../types/music'

/** Same-origin path proxied to https://api.deezer.com by the Vite dev server. */
const BASE = '/api/deezer'

export interface DeezerArtistRef {
  id: number
  name: string
}

export interface DeezerAlbumRef {
  id: number
  title: string
  cover_small?: string
  cover_medium?: string
  cover_big?: string
}

export interface DeezerTrack {
  id: number
  title: string
  title_short?: string
  title_version?: string
  /** Full song length in seconds. */
  duration: number
  /** Signed 30-second preview URL. Expires: never persist it. */
  preview: string
  readable?: boolean
  isrc?: string
  artist: DeezerArtistRef
  contributors?: DeezerArtistRef[]
  album: DeezerAlbumRef
}

interface DeezerList<T> {
  data: T[]
  total?: number
  next?: string
}

interface DeezerErrorBody {
  error: { type?: string; message?: string; code?: number }
}

/** Deezer reports errors inside a 200 response. Codes: https://developers.deezer.com/api/errors */
const DEEZER_QUOTA = 4
const DEEZER_DATA_NOT_FOUND = 800

class DeezerNotFound extends Error {}

async function deezerGet<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin)
  for (const [name, value] of Object.entries(params ?? {}))
    url.searchParams.set(name, String(value))

  let response: Response
  try {
    response = await fetch(url)
  } catch {
    throw new NetworkError('Deezer')
  }
  if (!response.ok) throw new HttpError('Deezer', response.status)

  const body = (await response.json()) as T | DeezerErrorBody
  if (body !== null && typeof body === 'object' && 'error' in body) {
    const { code, message } = body.error
    if (code === DEEZER_QUOTA) throw new RateLimitError('Deezer', 5)
    if (code === DEEZER_DATA_NOT_FOUND) throw new DeezerNotFound(message)
    throw new HttpError('Deezer', response.status, message ?? `code ${code ?? '?'}`)
  }
  return body
}

export function deezerTrackToTrack(track: DeezerTrack): Track {
  const artists = track.contributors?.length
    ? track.contributors.map((c) => c.name)
    : [track.artist.name]
  return {
    key: `dz:${track.id}`,
    title: track.title,
    artists,
    album: track.album.title,
    coverUrl: track.album.cover_medium ?? track.album.cover_small,
    durationMs: track.duration * 1000,
    isrc: track.isrc,
    deezerId: track.id,
  }
}

export async function searchTracks(query: string, limit = 10): Promise<Track[]> {
  const result = await deezerGet<DeezerList<DeezerTrack>>('/search', { q: query, limit })
  return result.data.filter((t) => t.readable !== false).map(deezerTrackToTrack)
}

export async function getTrack(id: number): Promise<DeezerTrack | null> {
  try {
    return await deezerGet<DeezerTrack>(`/track/${id}`)
  } catch (error) {
    if (error instanceof DeezerNotFound) return null
    throw error
  }
}

export async function getTrackByIsrc(isrc: string): Promise<DeezerTrack | null> {
  try {
    return await deezerGet<DeezerTrack>(`/track/isrc:${encodeURIComponent(isrc)}`)
  } catch (error) {
    if (error instanceof DeezerNotFound) return null
    throw error
  }
}
