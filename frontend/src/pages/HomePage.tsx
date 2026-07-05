import { useTranslation } from 'react-i18next'

import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

// Placeholder route (eventually the Discovery canvas). For now it doubles as
// a smoke test for i18n (every string via a key, RTL flip on Arabic) and for
// the two project fonts: headings render in Hedvig Letters Serif, body in Inter.
export function HomePage() {
  const { t } = useTranslation('common')

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col items-start gap-4 p-6">
      <LanguageSwitcher />
      {/* h1 → Hedvig Letters Serif (heading default from the base layer). */}
      <h1 className="text-5xl">{t('home.title')}</h1>
      {/* body → Inter (global default). */}
      <p className="text-neutral-500">{t('home.subtitle')}</p>
      {/* explicit `font-serif` utility → Hedvig Letters Serif. */}
      <p className="font-serif text-xl text-neutral-400">{t('app.tagline')}</p>
    </main>
  )
}
