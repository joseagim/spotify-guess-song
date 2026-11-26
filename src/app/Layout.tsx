import { useEffect, type ComponentType, type SVGProps } from 'react'
import { NavLink, Outlet } from 'react-router'
import {
  CalendarIcon,
  LabIcon,
  LibraryIcon,
  PlayIcon,
  SettingsIcon,
  TrophyIcon,
} from '../components/icons'
import { Logo } from '../components/Logo'
import { engines } from '../engines/registry'
import type { MessageKey } from '../i18n/translate'
import { useT } from '../i18n/useT'
import { useSettings } from '../store/settings'

interface NavItem {
  to: string
  label: MessageKey
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

const NAV: NavItem[] = [
  { to: '/', label: 'nav.play', icon: PlayIcon },
  { to: '/library', label: 'nav.library', icon: LibraryIcon },
  { to: '/daily', label: 'nav.daily', icon: CalendarIcon },
  { to: '/records', label: 'nav.records', icon: TrophyIcon },
  { to: '/lab', label: 'nav.lab', icon: LabIcon },
  { to: '/settings', label: 'nav.settings', icon: SettingsIcon },
]

export function Layout() {
  const t = useT()
  const language = useSettings((s) => s.language)
  const volume = useSettings((s) => s.volume)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    for (const engine of Object.values(engines)) engine.setVolume(volume)
  }, [volume])

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[14.5rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-10 border-r border-fern/70 px-5 py-7 md:flex">
        <Logo />
        <nav aria-label={t('nav.main')} className="flex flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.95rem] font-medium transition-colors ${
                  isActive
                    ? 'bg-moss-raised text-mist [&_svg]:text-signal'
                    : 'text-sage hover:bg-moss hover:text-mist'
                }`
              }
            >
              <item.icon />
              {t(item.label)}
            </NavLink>
          ))}
        </nav>
      </aside>

      <header className="flex items-center px-5 pt-5 md:hidden">
        <Logo />
      </header>

      <main className="px-5 pt-6 pb-28 md:px-12 md:py-12">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>

      <nav
        aria-label={t('nav.main')}
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-6 border-t border-fern/70 bg-night/95 backdrop-blur md:hidden"
      >
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[0.7rem] font-medium ${
                isActive ? 'text-signal' : 'text-sage'
              }`
            }
          >
            <item.icon />
            {t(item.label)}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
