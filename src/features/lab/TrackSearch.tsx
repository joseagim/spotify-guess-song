import { useEffect, useId, useState } from 'react'
import { describeError } from '../../i18n/describeError'
import { useT } from '../../i18n/useT'
import { searchTracks } from '../../services/deezer/api'
import type { Track } from '../../types/music'

interface SearchResult {
  query: string
  tracks: Track[]
  error?: unknown
}

const MIN_QUERY = 2
const DEBOUNCE_MS = 300

interface TrackSearchProps {
  selectedKey: string | null
  onSelect: (track: Track) => void
}

/** Deezer song search (no login needed). */
export function TrackSearch({ selectedKey, onSelect }: TrackSearchProps) {
  const t = useT()
  const inputId = useId()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const trimmed = query.trim()

  useEffect(() => {
    if (trimmed.length < MIN_QUERY) return
    let active = true
    const timer = setTimeout(() => {
      searchTracks(trimmed)
        .then((tracks) => {
          if (active) setResult({ query: trimmed, tracks })
        })
        .catch((error: unknown) => {
          if (active) setResult({ query: trimmed, tracks: [], error })
        })
    }, DEBOUNCE_MS)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [trimmed])

  const searching = trimmed.length >= MIN_QUERY
  const current = searching && result?.query === trimmed ? result : null

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={inputId} className="text-sm font-semibold text-sage">
        {t('lab.search.label')}
      </label>
      <input
        id={inputId}
        type="search"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('lab.search.placeholder')}
        className="w-full rounded-xl border border-fern bg-moss px-4 py-3 text-base text-mist placeholder:text-sage/70 focus:border-signal focus:outline-none"
      />

      <div aria-live="polite" className="min-h-6 text-sm text-sage">
        {!searching && t('lab.search.hint')}
        {searching && !current && t('lab.search.loading')}
        {current?.error !== undefined && (
          <span className="text-coral">{describeError(current.error, t)}</span>
        )}
        {current &&
          current.error === undefined &&
          current.tracks.length === 0 &&
          t('lab.search.none', { query: trimmed })}
      </div>

      {current && current.tracks.length > 0 && (
        <ul className="flex flex-col">
          {current.tracks.map((track) => {
            const selected = track.key === selectedKey
            return (
              <li key={track.key}>
                <button
                  type="button"
                  onClick={() => onSelect(track)}
                  aria-pressed={selected}
                  className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
                    selected ? 'bg-moss-raised' : 'hover:bg-moss'
                  }`}
                >
                  {track.coverUrl ? (
                    <img
                      src={track.coverUrl}
                      alt=""
                      className="size-11 shrink-0 rounded-md"
                      loading="lazy"
                    />
                  ) : (
                    <span className="size-11 shrink-0 rounded-md bg-moss-raised" />
                  )}
                  <span className="min-w-0">
                    <span
                      className={`block truncate font-semibold ${selected ? 'text-signal' : 'text-mist'}`}
                    >
                      {track.title}
                    </span>
                    <span className="block truncate text-sm text-sage">
                      {track.artists.join(', ')}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
