import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { Logo } from '@/components/ui/Logo'
import { TextLink } from '@/components/ui/TextLink'
import { ArtworkCanvas } from '@/features/artworks/canvas/ArtworkCanvas'
import { AuthButton } from '@/features/auth/components/AuthButton'

// Full-viewport canvas with floating chrome; pointer-events-none lets drags
// pass through to the map, each island re-enables pointer events for itself.
export function HomePage() {
  const { t } = useTranslation('common')

  return (
    <main className="relative h-svh overflow-hidden">
      <ArtworkCanvas />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-4">
        <div className="pointer-events-auto flex items-center gap-2">
          <Link
            to="/"
            aria-label={t('app.name')}
            className="inline-flex h-10 items-center rounded-full bg-white/85 px-4 text-lg text-neutral-900 shadow-sm backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            <Logo withWordmark />
          </Link>
          <span className="inline-flex h-10 items-center rounded-full bg-white/85 px-3 shadow-sm backdrop-blur">
            <LanguageSwitcher />
          </span>
        </div>

        <div className="pointer-events-auto">
          <AuthButton />
        </div>
      </header>

      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-end p-4">
        <nav className="pointer-events-auto flex h-10 items-center gap-2 rounded-full bg-white/85 px-4 text-sm text-neutral-600 shadow-sm backdrop-blur">
          <TextLink to="/privacy">{t('legal.privacy')}</TextLink>
          <span aria-hidden="true">·</span>
          <TextLink to="/terms">{t('legal.terms')}</TextLink>
        </nav>
      </footer>
    </main>
  )
}
