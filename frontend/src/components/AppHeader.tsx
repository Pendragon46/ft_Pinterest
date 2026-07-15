import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

import { AuthButton } from '@/features/auth/components/AuthButton'
import { useRequireAuth } from '@/features/auth/useRequireAuth'

import { LanguageSwitcher } from './ui/LanguageSwitcher'
import { Logo } from './ui/Logo'

// Shared light top-bar for the standalone pages (Profile, Settings). Sticky, with
// a bottom border; the logo links home. The canvas home has its own floating
// chrome and the legal/404 pages their dark headers — this is the light-page one.
export function AppHeader() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const requireAuth = useRequireAuth()

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            aria-label={t('app.name')}
            className="inline-flex h-10 cursor-pointer items-center rounded-full bg-neutral-100 px-4 text-neutral-900 transition-colors hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            <Logo withWordmark />
          </Link>
          <span className="inline-flex h-10 items-center rounded-full bg-neutral-100 px-3">
            <LanguageSwitcher />
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Always visible; gated on click (discoverability over surprise, §2). */}
          <button
            type="button"
            onClick={() => {
              requireAuth(() => {
                navigate('/create')
              })
            }}
            className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            <Plus aria-hidden="true" className="size-4" />
            {t('create.cta')}
          </button>
          <AuthButton />
        </div>
      </div>
    </header>
  )
}
