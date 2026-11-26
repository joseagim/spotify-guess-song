/**
 * Deezer preview MP3s live on *.dzcdn.net. Only those hosts may go through the
 * local audio proxy (see vite/deezerAudioProxy.ts).
 */
export function isAllowedDeezerAudioUrl(raw: string): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  const protocolOk = url.protocol === 'https:' || url.protocol === 'http:'
  const hostOk = url.hostname === 'dzcdn.net' || url.hostname.endsWith('.dzcdn.net')
  return protocolOk && hostOk
}

/** Path on our own origin that serves the given preview through the proxy. */
export function toProxiedAudioUrl(previewUrl: string): string {
  return `/api/deezer-audio?url=${encodeURIComponent(previewUrl)}`
}
