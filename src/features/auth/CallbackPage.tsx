import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { describeError } from '../../i18n/describeError'
import { useT } from '../../i18n/useT'
import { completeLogin } from '../../services/spotify/auth'

/** Spotify redirects here after login (http://127.0.0.1:5173/callback). */
export function CallbackPage() {
  const t = useT()
  const navigate = useNavigate()
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let active = true
    completeLogin(window.location.search)
      .then((returnTo) => {
        if (active) void navigate(returnTo, { replace: true })
      })
      .catch((err: unknown) => {
        if (active) setError(err)
      })
    return () => {
      active = false
    }
  }, [navigate])

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6">
      {error ? (
        <>
          <h1 className="text-3xl font-extrabold">{t('callback.failed')}</h1>
          <p className="mt-4 leading-relaxed text-sage">{describeError(error, t)}</p>
          <Link
            to="/settings"
            className="mt-8 font-semibold text-signal underline-offset-4 hover:underline"
          >
            {t('callback.back')}
          </Link>
        </>
      ) : (
        <p className="text-lg text-sage">{t('callback.working')}</p>
      )}
    </main>
  )
}
