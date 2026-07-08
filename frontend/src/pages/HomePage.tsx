import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { Logo } from '@/components/ui/Logo'
import { AuthButton } from '@/features/auth/components/AuthButton'
import { ArtworkCanvas } from '@/features/artworks/canvas/ArtworkCanvas'

// The discovery home: a full-viewport infinite canvas with a floating top bar
// (brand pill on the start side, language + auth on the end side). The bar is
// pointer-events-none so drags pass through to the map, and each interactive
// island re-enables pointer events for itself.
export function HomePage() {
  const { t } = useTranslation('common')

  return (
    <main className="relative h-svh overflow-hidden">
      <ArtworkCanvas />

      {/* Floating chrome. top-12 clears the TEMPORARY DevNav bar; drop it back
          to top-0 (or inset-0) once DevNav is removed for production. */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-4 p-4">
        <Link
          to="/"
          aria-label={t('app.name')}
          className="pointer-events-auto inline-flex items-center rounded-full bg-white/85 px-4 py-2 text-lg text-neutral-900 shadow-sm backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
        >
          <Logo withWordmark />
        </Link>

        <div className="pointer-events-auto flex items-center gap-2">
          <span className="rounded-full bg-white/85 px-3 py-1.5 shadow-sm backdrop-blur">
            <LanguageSwitcher />
          </span>
          <AuthButton />
        </div>
      </header>
    </main>
  )
}
