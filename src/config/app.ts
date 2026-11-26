/** Working title. Change here once the final name is chosen (see REQUIREMENTS.md §16). */
export const APP_NAME = 'Guess Song'

export const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-read-playback-state',
  'user-modify-playback-state',
] as const

/** Clip lengths offered in the Sound Lab, in seconds. */
export const LAB_CLIP_LENGTHS_SEC = [0.1, 0.3, 0.5, 1, 2, 5] as const

export const DEFAULT_VOLUME = 0.8
