import { useCallback, useSyncExternalStore } from 'react'
import { isLoggedIn, subscribeAuth } from '../services/spotify/auth'
import { spotifyEngine } from './registry'
import type { DiagnosticEntry } from './spotify/SpotifyEngine'
import type { AudioEngine, EngineStatus } from './types'

export function useEngineStatus(engine: AudioEngine): EngineStatus {
  const subscribe = useCallback((listener: () => void) => engine.subscribe(listener), [engine])
  const getSnapshot = useCallback(() => engine.getStatus(), [engine])
  return useSyncExternalStore(subscribe, getSnapshot)
}

const subscribeSpotify = (listener: () => void) => spotifyEngine.subscribe(listener)
const getSpotifyLog = () => spotifyEngine.getLog()

export function useSpotifyLog(): readonly DiagnosticEntry[] {
  return useSyncExternalStore(subscribeSpotify, getSpotifyLog)
}

export function useSpotifyLoggedIn(): boolean {
  return useSyncExternalStore(subscribeAuth, isLoggedIn)
}
