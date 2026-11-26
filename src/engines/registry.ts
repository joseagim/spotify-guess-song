import { DeezerEngine } from './deezer/DeezerEngine'
import { SpotifyEngine } from './spotify/SpotifyEngine'
import type { AudioEngine, EngineId } from './types'

export const deezerEngine = new DeezerEngine()
export const spotifyEngine = new SpotifyEngine()

export const engines: Record<EngineId, AudioEngine> = {
  deezer: deezerEngine,
  spotify: spotifyEngine,
}
