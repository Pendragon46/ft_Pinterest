import { useState } from 'react'
import type { FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { Divider } from '@/components/ui/Divider'
import { GoogleIcon } from '@/components/ui/GoogleIcon'
import { Input } from '@/components/ui/Input'
import { TextLink } from '@/components/ui/TextLink'
import { validateEmail, validatePassword } from '@/features/auth/auth.validation'
import type { AuthErrorKey } from '@/features/auth/auth.validation'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { useDevSignIn } from '@/features/auth/useDevSignIn'

interface LoginErrors {
  email?: AuthErrorKey
  password?: AuthErrorKey
}

// Renders as modal (location.state.background) or standalone page.
export function LoginPage() {
  const { t } = useTranslation('common')
  const location = useLocation()
  // Preserve the background so toggling login ↔ register stays in modal mode.
  const background = (
    location.state as { background?: ReturnType<typeof useLocation> } | null
  )?.background

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<LoginErrors>({})
  const signIn = useDevSignIn()

  // Validate on submit; each field clears its own error on edit.
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: LoginErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    }
    setErrors(nextErrors)
    if (nextErrors.email || nextErrors.password) return

    // TODO(backend): POST /auth/login with { email, password } then
    // useAuthStore.login(user). Dev stopgap below signs in a mock user.
    signIn(email)
  }

  return (
    <AuthCard standalone={!background}>
      <div className="flex flex-col gap-1">
        <h1 id="login-title" className="text-4xl">
          {t('login.title')}
        </h1>
        <p className="text-neutral-500">{t('login.subtitle')}</p>
      </div>

      {/* noValidate: we own validation UX (native bubbles aren't translatable). */}
      <form noValidate className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <Input
          label={t('form.emailLabel')}
          type="email"
          name="email"
          autoComplete="email"
          placeholder={t('form.emailPlaceholder')}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            setErrors((prev) => ({ ...prev, email: undefined }))
          }}
          error={errors.email ? t(errors.email) : undefined}
        />

        <div className="flex flex-col gap-2">
          <Input
            label={t('form.passwordLabel')}
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder={t('form.passwordPlaceholder')}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setErrors((prev) => ({ ...prev, password: undefined }))
            }}
            error={errors.password ? t(errors.password) : undefined}
          />
          {/* Route to build later — the 404 catches it meanwhile (decision D2). */}
          <TextLink to="/forgot-password" className="self-end">
            {t('login.forgotPassword')}
          </TextLink>
        </div>

        <Button type="submit" fullWidth>
          {t('actions.signIn')}
        </Button>

        {/* Consent microcopy — the links open the real legal pages. */}
        <p className="text-center text-sm text-neutral-500">
          <Trans
            t={t}
            i18nKey="form.consent"
            components={{
              terms: <TextLink to="/terms" />,
              privacy: <TextLink to="/privacy" />,
            }}
          />
        </p>
      </form>

      <Divider>{t('divider.or')}</Divider>

      {/* TODO(backend): real Google OAuth. Dev stopgap signs in a mock user. */}
      <Button
        variant="outline"
        fullWidth
        onClick={() => {
          signIn('you@atlaas.app')
        }}
      >
        <GoogleIcon />
        {t('actions.continueWithGoogle')}
      </Button>

      <p className="text-center font-serif text-neutral-600">
        {t('login.noAccount')}{' '}
        <TextLink to="/register" replace state={{ background }}>
          {t('login.registerLink')}
        </TextLink>
      </p>
    </AuthCard>
  )
}
