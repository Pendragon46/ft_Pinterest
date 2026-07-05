import { useTranslation } from 'react-i18next'

export function NotFoundPage() {
  const { t } = useTranslation('common')

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-4xl">{t('notFound.title')}</h1>
      <p className="text-neutral-500">{t('notFound.subtitle')}</p>
    </main>
  )
}
