import { useState } from 'react'
import { Button } from '../../components/ui'
import { useSpotifyLog } from '../../engines/hooks'
import { useT } from '../../i18n/useT'

/** Spotify player event log, so a failed connection can be diagnosed remotely. */
export function Diagnostics() {
  const t = useT()
  const log = useSpotifyLog()
  const [copied, setCopied] = useState(false)

  const text = log.map((entry) => `+${entry.at} ms  ${entry.message}`).join('\n')

  function copy() {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => undefined)
  }

  return (
    <details className="group rounded-xl border border-fern/70 bg-moss/60">
      <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-sage marker:hidden hover:text-mist group-open:text-mist">
        {t('lab.diagnostics')}
        <span className="ml-2 tabular-nums">({log.length})</span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-fern/70 px-5 py-4">
        <p className="text-sm text-sage">{t('lab.diagnostics.hint')}</p>
        {log.length === 0 ? (
          <p className="text-sm text-sage">{t('lab.diagnostics.empty')}</p>
        ) : (
          <pre className="max-h-72 overflow-auto rounded-lg bg-night p-3 text-xs leading-relaxed text-sage">
            {text}
          </pre>
        )}
        <div>
          <Button variant="secondary" onClick={copy} disabled={log.length === 0}>
            {copied ? t('lab.diagnostics.copied') : t('lab.diagnostics.copy')}
          </Button>
        </div>
      </div>
    </details>
  )
}
