import { NetworkError } from '../../lib/errors'

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js'
const SDK_LOAD_TIMEOUT_MS = 15_000

let loading: Promise<void> | null = null

/** Loads the Spotify Web Playback SDK script once. Rejects if it doesn't load in time. */
export function loadSpotifySdk(): Promise<void> {
  if ('Spotify' in window) return Promise.resolve()
  if (loading) return loading

  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    const fail = () => {
      loading = null
      script.remove()
      reject(new NetworkError('Spotify'))
    }
    const timer = setTimeout(fail, SDK_LOAD_TIMEOUT_MS)
    window.onSpotifyWebPlaybackSDKReady = () => {
      clearTimeout(timer)
      resolve()
    }
    script.src = SDK_URL
    script.async = true
    script.onerror = () => {
      clearTimeout(timer)
      fail()
    }
    document.body.appendChild(script)
  })
  return loading
}

export type PlaybackSupport = 'ok' | 'mobile' | 'no-drm'

/**
 * The Web Playback SDK needs a desktop browser with Widevine DRM (REQUIREMENTS.md §4.2).
 * Premium itself can't be checked up front: the Web API no longer exposes the plan, so it
 * only shows up as an `account_error` from the player.
 */
export async function checkPlaybackSupport(): Promise<PlaybackSupport> {
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData
  const mobile = uaData?.mobile ?? /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  if (mobile) return 'mobile'

  if (typeof navigator.requestMediaKeySystemAccess !== 'function') return 'no-drm'
  try {
    await navigator.requestMediaKeySystemAccess('com.widevine.alpha', [
      {
        initDataTypes: ['cenc'],
        audioCapabilities: [{ contentType: 'audio/mp4; codecs="mp4a.40.2"' }],
      },
    ])
    return 'ok'
  } catch {
    return 'no-drm'
  }
}
