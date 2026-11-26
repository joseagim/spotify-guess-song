import { APP_NAME } from '../config/app'

/** Three rising bars: the hint ladder, which is the core idea of the game. */
export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <rect width="32" height="32" rx="8" className="fill-moss-raised" />
        <rect x="7" y="17" width="4" height="6" rx="2" className="fill-signal" />
        <rect x="14" y="12" width="4" height="11" rx="2" className="fill-signal" />
        <rect x="21" y="7" width="4" height="16" rx="2" className="fill-signal" />
      </svg>
      <span className="font-display text-xl font-extrabold tracking-tight text-mist">
        {APP_NAME}
      </span>
    </span>
  )
}
