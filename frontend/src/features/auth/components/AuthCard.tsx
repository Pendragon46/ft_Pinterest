import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { Logo } from '@/components/ui/Logo'

interface AuthCardProps {
  children: ReactNode
  /** Standalone route (direct /login or /register, no modal behind): renders a
      full-viewport split page. In a modal it stays the compact two-panel card. */
  standalone?: boolean
}

// Brand gradient shared by both surfaces (RTL flips the columns automatically).
const BRAND =
  'bg-gradient-to-b from-neutral-950 from-35% via-[#252c55] via-65% to-[#a9b5ea]'

// One shell, two surfaces: compact modal card vs edge-to-edge full-page split.
export function AuthCard({ children, standalone = false }: AuthCardProps) {
  const { t } = useTranslation('common')

  if (!standalone) {
    return (
      <div className="grid w-full md:grid-cols-2 md:p-1">
        <div
          aria-hidden="true"
          className={`hidden items-center justify-center rounded-xl ${BRAND} md:flex`}
        >
          <Logo withWordmark className="text-5xl text-white" />
        </div>
        <div className="flex flex-col justify-center gap-6 p-6 sm:p-10">
          {children}
        </div>
      </div>
    )
  }

  return (
    <main className="grid min-h-svh md:grid-cols-2">
      <div
        aria-hidden="true"
        className={`hidden items-center justify-center ${BRAND} md:flex`}
      >
        <Logo withWordmark className="text-6xl text-white" />
      </div>

      <div className="flex min-h-svh flex-col bg-white">
        <header className="flex items-center justify-between gap-4 p-6 sm:p-8">
          <Link
            to="/"
            aria-label={t('app.name')}
            className="inline-flex items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            <Logo withWordmark />
          </Link>
          <span className="inline-flex h-10 items-center rounded-full bg-neutral-100 px-3">
            <LanguageSwitcher />
          </span>
        </header>
        <div className="flex flex-1 items-center justify-center px-6 pb-12 sm:px-10">
          <div className="flex w-full max-w-md flex-col gap-6">{children}</div>
        </div>
      </div>
    </main>
  )
}
