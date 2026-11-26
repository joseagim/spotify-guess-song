import type { MessageKey } from './en'

/** Spanish UI strings. Must define every key in en.ts. */
export const es: Record<MessageKey, string> = {
  'nav.play': 'Jugar',
  'nav.library': 'Biblioteca',
  'nav.daily': 'Diaria',
  'nav.records': 'Récords',
  'nav.lab': 'Sound Lab',
  'nav.settings': 'Ajustes',
  'nav.main': 'Navegación principal',

  'soon.title.play': 'Los modos de juego están en camino',
  'soon.title.library': 'Tu biblioteca está en camino',
  'soon.title.daily': 'Las canciones del día están en camino',
  'soon.title.records': 'Los récords están en camino',
  'soon.body.play': 'Clásico y Pasapalabra llegan en los hitos 3 y 4.',
  'soon.body.library': 'Importar desde Spotify y guardar playlists de Deezer llega en el hito 2.',
  'soon.body.daily': 'Una canción por categoría cada día llega en el hito 5.',
  'soon.body.records':
    'Tus mejores puntuaciones y rachas llegan con los modos de juego en el hito 3.',
  'soon.lab': 'Mientras tanto, abre el Sound Lab para comparar los dos motores de audio.',
  'soon.openLab': 'Abrir el Sound Lab',

  'lab.title': 'Sound Lab',
  'lab.intro':
    'Elige una canción y reproduce el mismo clip con Deezer y con Spotify. Te sirve para decidir qué motor te convence más.',
  'lab.search.label': 'Busca una canción',
  'lab.search.placeholder': 'Canción o artista, p. ej. Ni Borracho',
  'lab.search.hint': 'Escribe al menos 2 caracteres.',
  'lab.search.loading': 'Buscando…',
  'lab.search.none': 'No hay canciones para «{query}».',
  'lab.pick': 'Elige una canción de los resultados para probarla.',
  'lab.clip.length': 'Duración del clip',
  'lab.clip.start': 'Punto de inicio',
  'lab.clip.fromStart': 'Desde el inicio',
  'lab.clip.random': 'Aleatorio',
  'lab.clip.reroll': 'Otro punto aleatorio',
  'lab.playBoth': 'Reproducir Deezer y luego Spotify',
  'lab.play': 'Reproducir {engine}',
  'lab.stop': 'Parar',
  'lab.startsAt': 'Empieza en el segundo {seconds} de {total}',
  'lab.measured': 'Sonaron {actual} ms de los {requested} ms pedidos',
  'lab.preparing': 'Cargando la canción…',
  'lab.deezer.note':
    'Reproduce el fragmento de 30 segundos. La duración del clip es exacta. «Desde el inicio» es el inicio del fragmento, no de la canción.',
  'lab.spotify.note':
    'Reproduce la canción completa con tu cuenta Premium, así que «Desde el inicio» es la intro real. Los clips muy cortos pueden durar algo más o algo menos.',
  'lab.diagnostics': 'Diagnóstico de Spotify',
  'lab.diagnostics.hint':
    'Si Spotify falla, copia este registro y pásamelo: muestra exactamente dónde se atascó el reproductor.',
  'lab.diagnostics.empty': 'Todavía no hay eventos.',
  'lab.diagnostics.copy': 'Copiar registro',
  'lab.diagnostics.copied': 'Copiado',

  'status.idle': 'Sin iniciar',
  'status.needs-auth': 'Sin conectar',
  'status.connecting': 'Conectando…',
  'status.ready': 'Listo',
  'status.error': 'No disponible',

  'spotify.connect': 'Conectar Spotify',
  'spotify.disconnect': 'Desconectar',
  'lab.retry': 'Reintentar',

  'failure.no-client-id':
    'Falta el Client ID de Spotify. Añade VITE_SPOTIFY_CLIENT_ID a .env.local y reinicia el servidor de desarrollo.',
  'failure.not-connected': 'Conecta tu cuenta de Spotify para usar este motor.',
  'failure.user-not-allowed':
    'Esta cuenta de Spotify no está en la lista de usuarios de la app. Añádela en User Management del panel de desarrolladores de Spotify.',
  'failure.account':
    'Spotify no permite la reproducción web con esta cuenta. Hace falta Premium completo; Premium Lite y Mini no sirven.',
  'failure.init':
    'Este navegador no puede reproducir Spotify: necesita Chrome, Edge o Firefox en un ordenador, con el contenido protegido (DRM) permitido. Los navegadores del móvil no sirven.',
  'failure.auth': 'Spotify rechazó el inicio de sesión. Desconecta y vuelve a conectar.',
  'failure.connect-timeout':
    'El reproductor de Spotify no terminó de conectarse en 20 segundos. Copia el registro de diagnóstico de abajo y pásamelo.',
  'failure.device-offline':
    'El reproductor de Spotify se desconectó y no volvió. Pulsa reproducir para reconectar o recarga la página.',
  'failure.playback':
    'Spotify no pudo reproducir este clip. Vuelve a intentarlo; si sigue fallando, copia el registro de diagnóstico de abajo.',

  'errors.network': 'No se pudo conectar con {service}. Revisa tu conexión y vuelve a intentarlo.',
  'errors.rateLimit':
    '{service} está recibiendo demasiadas peticiones. Vuelve a intentarlo en {seconds} s.',
  'errors.http': '{service} respondió con un error ({status}).',
  'errors.trackUnavailable': 'Esta canción no está disponible en {engine}.',
  'errors.login': 'El inicio de sesión en Spotify no se completó ({code}). Vuelve a conectar.',
  'errors.unknown': 'Algo ha fallado: {message}',

  'callback.working': 'Terminando el inicio de sesión en Spotify…',
  'callback.failed': 'El inicio de sesión en Spotify no se completó',
  'callback.back': 'Volver a Ajustes',

  'settings.title': 'Ajustes',
  'settings.language': 'Idioma',
  'settings.language.hint': 'Empieza en el idioma de tu navegador.',
  'settings.engine': 'Motor de audio por defecto',
  'settings.engine.hint': 'Puedes cambiar de motor al preparar cada partida.',
  'settings.engine.deezer':
    'Clips cortos exactos de un fragmento de 30 segundos. Sin iniciar sesión.',
  'settings.engine.spotify': 'La canción real y su intro. Necesita Premium y un ordenador.',
  'settings.volume': 'Volumen',
  'settings.spotify': 'Cuenta de Spotify',
  'settings.spotify.hint':
    'Se usa para el motor de Spotify y, más adelante, para importar tus playlists. Necesita Premium y un navegador de ordenador.',
  'settings.spotify.connectedAs': 'Conectado como {name}',
  'settings.spotify.connected': 'Conectado',
  'settings.spotify.notConnected': 'Sin conectar',
}
