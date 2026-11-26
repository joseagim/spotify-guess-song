import { PlayIcon, StopIcon } from '../../components/icons'
import { Button, ErrorText, StatusDot } from '../../components/ui'
import { useEngineStatus } from '../../engines/hooks'
import { engines } from '../../engines/registry'
import { ENGINE_NAMES, type EngineId, type EngineStatus } from '../../engines/types'
import { describeError, describeFailure } from '../../i18n/describeError'
import { formatNumber } from '../../i18n/format'
import { useT } from '../../i18n/useT'
import { beginLogin } from '../../services/spotify/auth'
import { useSettings } from '../../store/settings'
import type { EngineSlot } from './SoundLabPage'

interface EngineRowProps {
  engine: EngineId
  slot: EngineSlot
  clipSec: number
  onPlay: () => void
  onStop: () => void
}

function tone(status: EngineStatus): 'ok' | 'busy' | 'off' | 'bad' {
  switch (status.state) {
    case 'ready':
      return 'ok'
    case 'connecting':
      return 'busy'
    case 'error':
      return 'bad'
    default:
      return 'off'
  }
}

export function EngineRow({ engine, slot, clipSec, onPlay, onStop }: EngineRowProps) {
  const t = useT()
  const language = useSettings((s) => s.language)
  const status = useEngineStatus(engines[engine])
  const name = ENGINE_NAMES[engine]

  const needsLogin = status.state === 'needs-auth'
  const playable = slot.prepared?.playableLengthSec ?? 0
  const misconfigured = status.state === 'error' && status.failure === 'no-client-id'
  const canPlay = !needsLogin && !misconfigured && slot.phase !== 'preparing'

  return (
    <div className="grid gap-4 py-6 sm:grid-cols-[1fr_auto] sm:items-start">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold">{name}</h3>
          <span className="flex items-center gap-2 text-sm text-sage">
            <StatusDot tone={tone(status)} />
            {t(`status.${status.state}`)}
          </span>
        </div>
        <p className="max-w-prose text-sm leading-relaxed text-sage">{t(`lab.${engine}.note`)}</p>

        {slot.prepared && (
          <ClipLane
            playableSec={playable}
            startSec={slot.startSec}
            clipSec={clipSec}
            playing={slot.playing}
          />
        )}
        {slot.prepared && (
          <p className="text-sm text-sage tabular-nums">
            {t('lab.startsAt', {
              seconds: formatNumber(language, slot.startSec),
              total: formatNumber(language, playable, 0),
            })}
          </p>
        )}
        {slot.last && (
          <p className="text-sm font-semibold text-mist tabular-nums">
            {t('lab.measured', { actual: slot.last.actualMs, requested: slot.last.requestedMs })}
          </p>
        )}
        {slot.phase === 'preparing' && <p className="text-sm text-sage">{t('lab.preparing')}</p>}
        {status.state === 'error' && <ErrorText>{describeFailure(status.failure, t)}</ErrorText>}
        {slot.error !== undefined && status.state !== 'error' && (
          <ErrorText>{describeError(slot.error, t)}</ErrorText>
        )}
      </div>

      <div className="flex items-center gap-2 sm:justify-end">
        {needsLogin ? (
          <Button
            variant="secondary"
            onClick={() => void beginLogin('/lab').catch(() => undefined)}
          >
            {t('spotify.connect')}
          </Button>
        ) : slot.playing ? (
          <Button
            variant="secondary"
            onClick={onStop}
            aria-label={t('lab.stop')}
            className="size-14 p-0"
          >
            <StopIcon width={22} height={22} />
          </Button>
        ) : slot.phase === 'failed' ? (
          // A failed song may be a transient error (network, rate limit): offer a retry.
          <Button variant="secondary" onClick={onPlay} disabled={misconfigured}>
            {t('lab.retry')}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={onPlay}
            disabled={!canPlay}
            aria-label={t('lab.play', { engine: name })}
            className="size-14 p-0"
          >
            <PlayIcon width={24} height={24} />
          </Button>
        )}
      </div>
    </div>
  )
}

interface ClipLaneProps {
  playableSec: number
  startSec: number
  clipSec: number
  playing: boolean
}

/** Where the clip sits inside the audio this engine can play. */
function ClipLane({ playableSec, startSec, clipSec, playing }: ClipLaneProps) {
  if (playableSec <= 0) return null
  const left = (startSec / playableSec) * 100
  const width = Math.max((clipSec / playableSec) * 100, 0.8)
  return (
    <div className="relative h-3 w-full max-w-xl rounded-full bg-moss-raised" aria-hidden="true">
      <span
        className={`absolute inset-y-0 rounded-full bg-signal ${playing ? 'clip-playing' : ''}`}
        style={{ left: `${Math.min(left, 100 - width)}%`, width: `${width}%`, minWidth: '6px' }}
      />
    </div>
  )
}
