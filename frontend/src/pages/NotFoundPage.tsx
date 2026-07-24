import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { Logo } from '@/components/ui/Logo'
import { AuthButton } from '@/features/auth/components/AuthButton'

// The "4 ◈ 4" mark — the middle zero is the Atlaas compass. Decorative: the
// heading conveys the error, so it's hidden from assistive tech.
function Compass404() {
  return (
    <svg
      viewBox="0 0 235 87"
      fill="currentColor"
      aria-hidden="true"
      className="h-20 w-auto text-white sm:h-24"
    >
      <path d="M25.7269 87V83.324L31.2662 82.5887C33.8922 82.1803 35.6976 81.4042 36.6824 80.2606C37.6671 79.0352 38.1595 77.0338 38.1595 74.2563V58.5718H0V55.7535L43.4526 0H48.6226V50.8521H61.5476V52.6901L59.0857 58.5718H48.6226V75.4817C48.6226 78.0141 48.9919 79.7704 49.7305 80.7507C50.5511 81.6493 52.1924 82.3028 54.6543 82.7113L58.3471 83.324V87H25.7269ZM38.1595 55.2634V11.6408L39.2674 13.1113L8.12429 54.6507L5.53929 50.8521H42.2217L38.1595 55.2634Z" />
      <path d="M115.883 32.2088C122.206 31.3269 128.044 35.7251 128.913 42.0233C129.782 48.3216 125.352 54.1254 119.025 54.9747C112.721 55.8211 106.92 51.4273 106.054 45.1521C105.188 38.877 109.583 33.0874 115.883 32.2088Z" />
      <path d="M117.233 4.40022C124.032 4.47185 133.014 17.9026 135.817 23.642C129.403 19.9484 125.681 18.1779 118.182 17.689C110.526 17.6818 105.589 19.9887 99.1876 23.6869C101.886 17.9078 110.742 5.26214 117.233 4.40022Z" />
      <path d="M99.2966 63.7571C99.7151 63.8872 102.466 65.439 103.033 65.7426C105.189 66.9128 107.473 67.8271 109.843 68.4667C119.808 71.2206 127.224 68.4797 135.818 63.6426C134.166 66.7392 132.581 69.1315 130.574 71.9822C127.472 75.9331 120.941 84.6019 115.386 82.1794C109.365 79.5547 102.151 69.5937 99.2966 63.7571Z" />
      <path d="M138.471 26.2842C142.925 27.8015 151.425 35.0625 154.527 38.5211C160.667 45.3671 152.201 51.4633 146.618 55.8663C144.046 57.8253 141.308 59.5596 138.435 61.0498C145.81 46.8355 145.91 40.5258 138.471 26.2842Z" />
      <path d="M96.2888 26.3549L96.3266 26.3927C96.3832 26.7806 95.8688 27.5812 95.6581 27.9644C92.0122 34.5953 90.0751 41.604 91.6954 49.1366C92.6748 53.6948 94.4215 56.9436 96.607 60.9888C93.6469 59.4399 91.5922 58.0575 88.9344 56.1379C84.03 52.4458 74.4669 45.7792 80.0106 39.1657C84.527 33.7779 90.2088 29.7725 96.2888 26.3549Z" />
      <path d="M199.179 87V83.324L204.719 82.5887C207.345 82.1803 209.15 81.4042 210.135 80.2606C211.12 79.0352 211.612 77.0338 211.612 74.2563V58.5718H173.452V55.7535L216.905 0H222.075V50.8521H235V52.6901L232.538 58.5718H222.075V75.4817C222.075 78.0141 222.444 79.7704 223.183 80.7507C224.003 81.6493 225.645 82.3028 228.107 82.7113L231.8 83.324V87H199.179ZM211.612 55.2634V11.6408L212.72 13.1113L181.577 54.6507L178.992 50.8521H215.674L211.612 55.2634Z" />
    </svg>
  )
}

// The `*` catch-all route: a full-screen, dark "off the map" page in the brand's
// exploration voice, with the same chrome as the rest of the app.
export function NotFoundPage() {
  const { t } = useTranslation('common')

  return (
    <main className="relative flex min-h-svh flex-col overflow-hidden bg-neutral-950 text-white">
      <header className="flex items-start justify-between gap-4 p-4">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            aria-label={t('app.name')}
            className="inline-flex h-10 cursor-pointer items-center rounded-full bg-white/10 px-4 text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
          >
            <Logo withWordmark />
          </Link>
          <span className="inline-flex h-10 items-center rounded-full bg-white/10 px-3">
            <LanguageSwitcher tone="light" />
          </span>
        </div>
        <AuthButton />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <Compass404 />
        <h1 className="mt-8 max-w-md font-serif text-5xl leading-tight">
          {t('notFound.title')}
        </h1>
        <p className="mt-4 max-w-md text-lg text-neutral-400">
          {t('notFound.subtitle')}
        </p>
        <Link
          to="/"
          className="mt-10 inline-flex h-11 cursor-pointer items-center rounded-full bg-white px-6 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 motion-reduce:transition-none"
        >
          {t('notFound.action')}
        </Link>
      </div>

      <footer className="flex justify-end p-4">
        <nav className="flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm text-white/70">
          <Link
            to="/privacy"
            className="rounded-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
          >
            {t('legal.privacy')}
          </Link>
          <span aria-hidden="true">·</span>
          <Link
            to="/terms"
            className="rounded-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
          >
            {t('legal.terms')}
          </Link>
        </nav>
      </footer>
    </main>
  )
}
