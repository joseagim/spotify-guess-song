import { useEffect, useId, useState, type ReactNode } from 'react'
import { Button, ErrorText, Segmented, StatusDot } from '../../components/ui'
import { useEngineStatus, useSpotifyLoggedIn } from '../../engines/hooks'
import { spotifyEngine } from '../../engines/registry'
import { ENGINE_IDS, ENGINE_NAMES } from '../../engines/types'
import { describeError, describeFailure } from '../../i18n/describeError'
import { LANGUAGE_NAMES, LANGUAGES } from '../../i18n/translate'
import { useT } from '../../i18n/useT'
import { getProfile } from '../../services/spotify/api'
import { beginLogin, logout } from '../../services/spotify/auth'
import { useSettings } from '../../store/settings'

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 py-8 md:grid-cols-[16rem_1fr] md:gap-10">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        {hint && <p className="mt-2 text-sm leading-relaxed text-sage">{hint}</p>}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}

export function SettingsPage() {
  const t = useT()
  const volumeId = useId()
  const { language, setLanguage, defaultEngine, setDefaultEngine, volume, setVolume } =
    useSettings()

  return (
    <div>
      <h1 className="text-4xl font-extrabold md:text-5xl">{t('settings.title')}</h1>

      <div className="mt-6 divide-y divide-fern/70 border-b border-fern/70">
        <Section title={t('settings.language')} hint={t('settings.language.hint')}>
          <Segmented
            label={t('settings.language')}
            value={language}
            onChange={setLanguage}
            options={LANGUAGES.map((value) => ({ value, label: LANGUAGE_NAMES[value] }))}
          />
        </Section>

        <Section title={t('settings.engine')} hint={t('settings.engine.hint')}>
          <div role="radiogroup" aria-label={t('settings.engine')} className="flex flex-col gap-2">
            {ENGINE_IDS.map((engine) => {
              const selected = engine === defaultEngine
              return (
                <button
                  key={engine}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setDefaultEngine(engine)}
                  className={`flex max-w-lg items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    selected ? 'border-signal bg-moss-raised' : 'border-fern hover:border-sage'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-1 size-4 shrink-0 rounded-full border-2 ${
                      selected
                        ? 'border-signal bg-signal shadow-[inset_0_0_0_3px_var(--color-moss-raised)]'
                        : 'border-sage'
                    }`}
                  />
                  <span>
                    <span className="block font-semibold">{ENGINE_NAMES[engine]}</span>
                    <span className="block text-sm text-sage">
                      {t(`settings.engine.${engine}`)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </Section>

        <Section title={t('settings.volume')}>
          <div className="flex max-w-sm items-center gap-4">
            <input
              id={volumeId}
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              aria-label={t('settings.volume')}
              className="w-full accent-signal"
            />
            <output htmlFor={volumeId} className="w-10 text-right text-sm tabular-nums text-sage">
              {Math.round(volume * 100)}
            </output>
          </div>
        </Section>

        <Section title={t('settings.spotify')} hint={t('settings.spotify.hint')}>
          <SpotifyAccount />
        </Section>
      </div>
    </div>
  )
}

function SpotifyAccount() {
  const t = useT()
  const loggedIn = useSpotifyLoggedIn()
  const status = useEngineStatus(spotifyEngine)
  const [name, setName] = useState<string | null>(null)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    if (!loggedIn) return
    let active = true
    getProfile()
      .then((profile) => {
        if (active) setName(profile.display_name ?? profile.id)
      })
      .catch((err: unknown) => {
        if (active) setError(err)
      })
    return () => {
      active = false
    }
  }, [loggedIn])

  function connect() {
    setError(null)
    beginLogin('/settings').catch((err: unknown) => setError(err))
  }

  function disconnect() {
    logout()
    setName(null)
    setError(null)
  }

  return (
    <>
      <p className="flex items-center gap-2 font-semibold">
        <StatusDot tone={loggedIn ? 'ok' : 'off'} />
        {loggedIn
          ? name
            ? t('settings.spotify.connectedAs', { name })
            : t('settings.spotify.connected')
          : t('settings.spotify.notConnected')}
      </p>
      {status.state === 'error' && <ErrorText>{describeFailure(status.failure, t)}</ErrorText>}
      {error !== null && <ErrorText>{describeError(error, t)}</ErrorText>}
      <div>
        {loggedIn ? (
          <Button variant="secondary" onClick={disconnect}>
            {t('spotify.disconnect')}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={connect}
            disabled={status.state === 'error' && status.failure === 'no-client-id'}
          >
            {t('spotify.connect')}
          </Button>
        )}
      </div>
    </>
  )
}
