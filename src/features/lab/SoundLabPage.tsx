import { useCallback, useEffect, useRef, useState } from 'react'
import { ShuffleIcon } from '../../components/icons'
import { Button, Segmented } from '../../components/ui'
import { LAB_CLIP_LENGTHS_SEC } from '../../config/app'
import { useSpotifyLoggedIn } from '../../engines/hooks'
import { engines, spotifyEngine } from '../../engines/registry'
import { ENGINE_IDS, type ClipResult, type EngineId, type PreparedTrack } from '../../engines/types'
import { formatNumber } from '../../i18n/format'
import { useT } from '../../i18n/useT'
import { ClipCancelledError } from '../../lib/errors'
import { useSettings } from '../../store/settings'
import type { Track } from '../../types/music'
import { Diagnostics } from './Diagnostics'
import { EngineRow } from './EngineRow'
import { TrackSearch } from './TrackSearch'

type StartMode = 'start' | 'random'

export interface EngineSlot {
  phase: 'empty' | 'preparing' | 'ready' | 'failed'
  prepared?: PreparedTrack
  startSec: number
  playing: boolean
  last?: ClipResult
  error?: unknown
}

type Slots = Record<EngineId, EngineSlot>

const EMPTY_SLOT: EngineSlot = { phase: 'empty', startSec: 0, playing: false }
const INITIAL_SLOTS: Slots = { deezer: EMPTY_SLOT, spotify: EMPTY_SLOT }
const PAUSE_BETWEEN_ENGINES_MS = 700

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function chooseStart(
  engine: EngineId,
  prepared: PreparedTrack,
  mode: StartMode,
  clipSec: number,
): number {
  return mode === 'start' ? 0 : engines[engine].pickRandomStart(prepared, clipSec)
}

function stopAll(): void {
  for (const engine of ENGINE_IDS) engines[engine].stop()
}

export function SoundLabPage() {
  const t = useT()
  const language = useSettings((s) => s.language)
  const spotifyLoggedIn = useSpotifyLoggedIn()

  const [track, setTrack] = useState<Track | null>(null)
  const [clipSec, setClipSec] = useState<number>(1)
  const [startMode, setStartMode] = useState<StartMode>('start')
  const [slots, setSlots] = useState<Slots>(INITIAL_SLOTS)
  const [sequenceRunning, setSequenceRunning] = useState(false)

  // Async handlers read the latest slots from here instead of a stale render.
  const slotsRef = useRef<Slots>(INITIAL_SLOTS)
  // Bumped on every song change: late results for an older song are ignored.
  const selection = useRef(0)
  // Bumped on every stop: cancels a running "play both" sequence.
  const run = useRef(0)

  // Connect the Spotify player as soon as the lab opens, so its status is visible early.
  useEffect(() => {
    if (spotifyLoggedIn && spotifyEngine.getStatus().state === 'idle') {
      spotifyEngine.init().catch(() => undefined)
    }
  }, [spotifyLoggedIn])

  useEffect(() => stopAll, [])

  const commit = useCallback((next: Slots) => {
    slotsRef.current = next
    setSlots(next)
  }, [])

  /** Updates one engine's slot, but only if the song hasn't changed since `token`. */
  const patch = useCallback(
    (engine: EngineId, changes: Partial<EngineSlot>, token: number) => {
      if (token !== selection.current) return
      const current = slotsRef.current
      commit({ ...current, [engine]: { ...current[engine], ...changes } })
    },
    [commit],
  )

  const prepare = useCallback(
    async (engine: EngineId, song: Track, token: number, mode: StartMode, clip: number) => {
      patch(
        engine,
        { phase: 'preparing', prepared: undefined, last: undefined, error: undefined },
        token,
      )
      try {
        const prepared = await engines[engine].prepare(song)
        const startSec = chooseStart(engine, prepared, mode, clip)
        patch(engine, { phase: 'ready', prepared, startSec }, token)
        return token === selection.current ? { prepared, startSec } : null
      } catch (error) {
        patch(engine, { phase: 'failed', error }, token)
        return null
      }
    },
    [patch],
  )

  function selectTrack(song: Track) {
    stopAll()
    run.current++
    const token = ++selection.current
    setTrack(song)
    commit(INITIAL_SLOTS)
    for (const engine of ENGINE_IDS) {
      if (engine === 'spotify' && !spotifyLoggedIn) continue
      void prepare(engine, song, token, startMode, clipSec)
    }
  }

  function rechooseStarts(mode: StartMode, clip: number) {
    const current = slotsRef.current
    const next = { ...current }
    for (const engine of ENGINE_IDS) {
      const slot = current[engine]
      if (slot.prepared) {
        next[engine] = { ...slot, startSec: chooseStart(engine, slot.prepared, mode, clip) }
      }
    }
    commit(next)
  }

  function changeStartMode(mode: StartMode) {
    setStartMode(mode)
    rechooseStarts(mode, clipSec)
  }

  function changeClip(clip: number) {
    setClipSec(clip)
    // A longer clip may no longer fit after the current random point.
    if (startMode === 'random') rechooseStarts(startMode, clip)
  }

  /** Plays one engine's clip. Resolves true if it played to the end. */
  async function play(engine: EngineId): Promise<boolean> {
    if (!track) return false
    const token = selection.current
    for (const other of ENGINE_IDS) if (other !== engine) engines[other].stop()

    let { prepared, startSec } = slotsRef.current[engine]
    if (!prepared) {
      const result = await prepare(engine, track, token, startMode, clipSec)
      if (!result) return false
      ;({ prepared, startSec } = result)
    }

    patch(engine, { playing: true, error: undefined }, token)
    try {
      const last = await engines[engine].playClip(prepared, startSec, clipSec)
      patch(engine, { playing: false, last }, token)
      return true
    } catch (error) {
      const cancelled = error instanceof ClipCancelledError
      patch(engine, cancelled ? { playing: false } : { playing: false, error }, token)
      return false
    }
  }

  async function playBoth() {
    const sequence = ++run.current
    setSequenceRunning(true)
    try {
      const finished = await play('deezer')
      if (!finished || sequence !== run.current) return
      await sleep(PAUSE_BETWEEN_ENGINES_MS)
      if (sequence !== run.current) return
      await play('spotify')
    } finally {
      setSequenceRunning(false)
    }
  }

  function stop(engine: EngineId) {
    run.current++
    engines[engine].stop()
  }

  const busy = sequenceRunning || ENGINE_IDS.some((engine) => slots[engine].playing)

  return (
    <div className="flex flex-col gap-10">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-extrabold md:text-5xl">{t('lab.title')}</h1>
        <p className="mt-4 text-lg leading-relaxed text-sage">{t('lab.intro')}</p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <TrackSearch selectedKey={track?.key ?? null} onSelect={selectTrack} />

        <section aria-label={t('lab.title')} className="flex flex-col gap-8">
          {track ? (
            <>
              <div className="flex items-center gap-5">
                {track.coverUrl ? (
                  <img
                    src={track.coverUrl}
                    alt=""
                    className="size-24 rounded-xl shadow-lg shadow-black/40"
                  />
                ) : (
                  <span className="size-24 rounded-xl bg-moss-raised" />
                )}
                <div className="min-w-0">
                  <h2 className="truncate text-3xl font-bold">{track.title}</h2>
                  <p className="mt-1 truncate text-sage">{track.artists.join(', ')}</p>
                </div>
              </div>

              <div className="flex flex-col gap-5 sm:flex-row sm:gap-10">
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-sage">{t('lab.clip.length')}</span>
                  <Segmented
                    label={t('lab.clip.length')}
                    value={clipSec}
                    onChange={changeClip}
                    options={LAB_CLIP_LENGTHS_SEC.map((value) => ({
                      value,
                      label: `${formatNumber(language, value)} s`,
                    }))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-sage">{t('lab.clip.start')}</span>
                  <div className="flex items-center gap-2">
                    <Segmented
                      label={t('lab.clip.start')}
                      value={startMode}
                      onChange={changeStartMode}
                      options={[
                        { value: 'start', label: t('lab.clip.fromStart') },
                        { value: 'random', label: t('lab.clip.random') },
                      ]}
                    />
                    {startMode === 'random' && (
                      <Button
                        variant="quiet"
                        onClick={() => rechooseStarts('random', clipSec)}
                        aria-label={t('lab.clip.reroll')}
                        title={t('lab.clip.reroll')}
                        className="px-2"
                      >
                        <ShuffleIcon />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col divide-y divide-fern/70 border-y border-fern/70">
                {ENGINE_IDS.map((engine) => (
                  <EngineRow
                    key={engine}
                    engine={engine}
                    slot={slots[engine]}
                    clipSec={clipSec}
                    onPlay={() => void play(engine)}
                    onStop={() => stop(engine)}
                  />
                ))}
              </div>

              <div>
                <Button
                  variant="primary"
                  onClick={() => void playBoth()}
                  disabled={busy}
                  className="px-6 py-3"
                >
                  {t('lab.playBoth')}
                </Button>
              </div>
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-fern px-6 py-10 text-sage">
              {t('lab.pick')}
            </p>
          )}

          <Diagnostics />
        </section>
      </div>
    </div>
  )
}
