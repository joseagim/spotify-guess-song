/**
 * Platform-neutral track. A track can come from Deezer, Spotify, a CSV or a manual list;
 * the IDs it knows about tell the engines how to find it.
 */
export interface Track {
  /** Stable internal key, e.g. "dz:3135556" or "sp:4uLU6hMCjMI75M1A2tKUQC". */
  key: string
  title: string
  artists: string[]
  album?: string
  coverUrl?: string
  /** Length of the full song in milliseconds. */
  durationMs: number
  isrc?: string
  deezerId?: number
  spotifyUri?: string
}
