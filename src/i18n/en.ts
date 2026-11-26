/** English UI strings. Every key must also exist in es.ts. */
export const en = {
  'nav.play': 'Play',
  'nav.library': 'Library',
  'nav.daily': 'Daily',
  'nav.records': 'Records',
  'nav.lab': 'Sound Lab',
  'nav.settings': 'Settings',
  'nav.main': 'Main navigation',

  'soon.title.play': 'Game modes are on their way',
  'soon.title.library': 'Your library is on its way',
  'soon.title.daily': 'Daily songs are on their way',
  'soon.title.records': 'Records are on their way',
  'soon.body.play': 'Classic and Pasapalabra arrive in milestones 3 and 4.',
  'soon.body.library': 'Importing from Spotify and saving Deezer playlists arrive in milestone 2.',
  'soon.body.daily': 'One song per category every day arrives in milestone 5.',
  'soon.body.records': 'Your best scores and streaks arrive with the game modes in milestone 3.',
  'soon.lab': 'Meanwhile, open the Sound Lab to compare both audio engines.',
  'soon.openLab': 'Open the Sound Lab',

  'lab.title': 'Sound Lab',
  'lab.intro':
    'Pick a song and play the same clip with Deezer and with Spotify. Use it to decide which engine sounds right to you.',
  'lab.search.label': 'Search a song',
  'lab.search.placeholder': 'Song or artist, e.g. Ni Borracho',
  'lab.search.hint': 'Type at least 2 characters.',
  'lab.search.loading': 'Searching…',
  'lab.search.none': 'No songs found for “{query}”.',
  'lab.pick': 'Choose a song from the results to try it.',
  'lab.clip.length': 'Clip length',
  'lab.clip.start': 'Start point',
  'lab.clip.fromStart': 'From the start',
  'lab.clip.random': 'Random',
  'lab.clip.reroll': 'New random point',
  'lab.playBoth': 'Play Deezer, then Spotify',
  'lab.play': 'Play {engine}',
  'lab.stop': 'Stop',
  'lab.startsAt': 'Starts at {seconds} s of {total} s',
  'lab.measured': 'Played {actual} ms of the {requested} ms asked for',
  'lab.preparing': 'Loading the song…',
  'lab.deezer.note':
    'Plays the 30-second preview. Clip length is exact. “From the start” means the start of the preview, not of the song.',
  'lab.spotify.note':
    'Plays the full song with your Premium account, so “From the start” is the real intro. Very short clips can come out a bit longer or shorter.',
  'lab.diagnostics': 'Spotify diagnostics',
  'lab.diagnostics.hint':
    'If Spotify fails, copy this log and send it over: it shows exactly where the player got stuck.',
  'lab.diagnostics.empty': 'No events yet.',
  'lab.diagnostics.copy': 'Copy log',
  'lab.diagnostics.copied': 'Copied',

  'status.idle': 'Not started',
  'status.needs-auth': 'Not connected',
  'status.connecting': 'Connecting…',
  'status.ready': 'Ready',
  'status.error': 'Not available',

  'spotify.connect': 'Connect Spotify',
  'spotify.disconnect': 'Disconnect',
  'lab.retry': 'Try again',

  'failure.no-client-id':
    'The Spotify Client ID is missing. Add VITE_SPOTIFY_CLIENT_ID to .env.local and restart the dev server.',
  'failure.not-connected': 'Connect your Spotify account to use this engine.',
  'failure.user-not-allowed':
    'This Spotify account is not on the app’s user list. Add it under User Management in the Spotify Developer Dashboard.',
  'failure.account':
    'Spotify won’t allow web playback for this account. A full Premium plan is required; Premium Lite and Mini don’t work.',
  'failure.init':
    'This browser can’t play Spotify: it needs Chrome, Edge or Firefox on a computer, with protected content (DRM) allowed. Mobile browsers don’t work.',
  'failure.auth': 'Spotify rejected the login. Disconnect and connect again.',
  'failure.connect-timeout':
    'The Spotify player didn’t finish connecting within 20 seconds. Copy the diagnostics log below and send it over.',
  'failure.device-offline':
    'The Spotify player went offline and didn’t come back. Press play to reconnect, or reload the page.',
  'failure.playback':
    'Spotify couldn’t play this clip. Try again; if it keeps failing, copy the diagnostics log below.',

  'errors.network': 'Couldn’t reach {service}. Check your connection and try again.',
  'errors.rateLimit': '{service} is receiving too many requests. Try again in {seconds} s.',
  'errors.http': '{service} answered with an error ({status}).',
  'errors.trackUnavailable': 'This song isn’t available on {engine}.',
  'errors.login': 'Spotify login didn’t complete ({code}). Try connecting again.',
  'errors.unknown': 'Something went wrong: {message}',

  'callback.working': 'Finishing the Spotify login…',
  'callback.failed': 'Spotify login didn’t complete',
  'callback.back': 'Back to Settings',

  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.language.hint': 'Starts in your browser’s language.',
  'settings.engine': 'Default audio engine',
  'settings.engine.hint': 'You can still switch engines when you set up each game.',
  'settings.engine.deezer': 'Exact short clips from a 30-second preview. No login needed.',
  'settings.engine.spotify': 'The real song and its intro. Needs Premium and a computer.',
  'settings.volume': 'Volume',
  'settings.spotify': 'Spotify account',
  'settings.spotify.hint':
    'Used for the Spotify engine and, later, to import your playlists. Requires Premium and a desktop browser.',
  'settings.spotify.connectedAs': 'Connected as {name}',
  'settings.spotify.connected': 'Connected',
  'settings.spotify.notConnected': 'Not connected',
} satisfies Record<string, string>

export type MessageKey = keyof typeof en
