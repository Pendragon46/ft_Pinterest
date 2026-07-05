import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

// Placeholder — works both full-page and inside the Modal (no overlay here).
export function RegisterPage() {
  const { t } = useTranslation('common')
  const location = useLocation()
  // Preserve the background so toggling register ↔ login stays in modal mode.
  const background = (
    location.state as { background?: ReturnType<typeof useLocation> } | null
  )?.background

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 id="register-title" className="text-4xl">
          {t('register.title')}
        </h1>
        <p className="text-neutral-500">{t('register.subtitle')}</p>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <label className="flex flex-col gap-1 text-sm text-neutral-700">
          {t('form.emailLabel')}
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder={t('form.emailPlaceholder')}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-base text-neutral-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-700">
          {t('form.passwordLabel')}
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder={t('form.passwordPlaceholder')}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-base text-neutral-900"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-800"
        >
          {t('actions.signUp')}
        </button>
      </form>

      <p className="text-sm text-neutral-500">
        {t('register.haveAccount')}{' '}
        <Link
          to="/login"
          replace
          state={{ background }}
          className="text-neutral-900 underline"
        >
          {t('register.loginLink')}
        </Link>
      </p>
    </div>
  )
}
