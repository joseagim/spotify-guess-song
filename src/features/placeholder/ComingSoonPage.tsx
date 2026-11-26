import { Link } from 'react-router'
import { useT } from '../../i18n/useT'

type Feature = 'play' | 'library' | 'daily' | 'records'

export function ComingSoonPage({ feature }: { feature: Feature }) {
  const t = useT()
  return (
    <section className="max-w-xl py-10 md:py-20">
      <h1 className="text-4xl font-extrabold md:text-5xl">{t(`soon.title.${feature}`)}</h1>
      <p className="mt-5 text-lg leading-relaxed text-sage">{t(`soon.body.${feature}`)}</p>
      <p className="mt-3 text-lg leading-relaxed text-sage">{t('soon.lab')}</p>
      <Link
        to="/lab"
        className="mt-8 inline-flex rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-night hover:bg-[#5cf0a2]"
      >
        {t('soon.openLab')}
      </Link>
    </section>
  )
}
