import { useTranslation } from 'react-i18next'

export function TermsPage() {
  const { t } = useTranslation('common')

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-4 p-8">
      <h1 className="text-4xl">{t('terms.title')}</h1>
      <p className="text-neutral-600">{t('terms.subtitle')}</p>
    </main>
  )
}
