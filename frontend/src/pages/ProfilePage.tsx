import { useTranslation } from 'react-i18next'

export function ProfilePage() {
  const { t } = useTranslation('common')

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-4xl">{t('profile.title')}</h1>
      <p className="text-neutral-500">{t('profile.subtitle')}</p>
    </main>
  )
}
