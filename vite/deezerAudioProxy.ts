import type { Connect, Plugin } from 'vite'
import { isAllowedDeezerAudioUrl } from '../src/lib/deezerAudioUrl.ts'

const MAX_REDIRECTS = 3
const TIMEOUT_MS = 15_000

/**
 * Fetches an allowed Deezer CDN URL, following redirects only while they stay on
 * *.dzcdn.net, so the proxy can never be used to reach other hosts.
 */
async function fetchAllowed(url: string): Promise<Response | null> {
  let target = url
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isAllowedDeezerAudioUrl(target)) return null
    const response = await fetch(target, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const location = response.headers.get('location')
    if (response.status >= 300 && response.status < 400 && location) {
      target = new URL(location, target).toString()
      continue
    }
    return response
  }
  return null
}

/**
 * Serves Deezer preview MP3s from our own origin so the Web Audio API can decode them
 * (the Deezer CDN sends no CORS headers). Only *.dzcdn.net URLs are fetched: this is
 * deliberately not an open proxy.
 *
 * Usage from the app: GET /api/deezer-audio?url=<encoded preview URL>
 */
export function deezerAudioProxy(): Plugin {
  const handler: Connect.NextHandleFunction = (req, res) => {
    void (async () => {
      try {
        const target = new URL(req.url ?? '', 'http://proxy.local').searchParams.get('url')
        const upstream = target ? await fetchAllowed(target) : null
        if (!upstream) {
          res.statusCode = 400
          res.end('Invalid or disallowed audio URL')
          return
        }
        if (!upstream.ok) {
          res.statusCode = upstream.status
          res.end(`Deezer CDN responded with ${upstream.status}`)
          return
        }
        res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'audio/mpeg')
        res.setHeader('Cache-Control', 'no-store')
        res.end(Buffer.from(await upstream.arrayBuffer()))
      } catch {
        res.statusCode = 502
        res.end('Audio proxy could not reach the Deezer CDN')
      }
    })()
  }

  return {
    name: 'deezer-audio-proxy',
    configureServer(server) {
      server.middlewares.use('/api/deezer-audio', handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/deezer-audio', handler)
    },
  }
}
