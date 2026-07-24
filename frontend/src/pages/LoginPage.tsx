import { useState } from 'react'
import type { FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { Divider } from '@/components/ui/Divider'
import { GoogleIcon } from '@/components/ui/GoogleIcon'
import { Input } from '@/components/ui/Input'
import { TextLink } from '@/components/ui/TextLink'
import { login as loginRequest, fetchMe } from '@/features/auth/auth.api'
import { useAuthStore } from '@/features/auth/auth.store'
import { validateEmail, validatePassword } from '@/features/auth/auth.validation'
import type { AuthErrorKey } from '@/features/auth/auth.validation'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { tokenStore } from '@/features/auth/token'
import { isApiError } from '@/lib/http'

interface LoginErrors {
  email?: AuthErrorKey
  password?: AuthErrorKey
}

// Renders as modal (location.state.background) or standalone page.
export function LoginPage() {
  const { t } = useTranslation('common')
  const location = useLocation()
  const navigate = useNavigate()
  // Preserve the background so toggling login ↔ register stays in modal mode.
  const background = (
    location.state as { background?: ReturnType<typeof useLocation> } | null
  )?.background
  const inModal = Boolean(background)

  const storeLogin = useAuthStore((state) => state.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<LoginErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Validate on submit; each field clears its own error on edit.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: LoginErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    }
    setErrors(nextErrors)
    if (nextErrors.email || nextErrors.password) return

    setSubmitting(true)
    setFormError(null)
    try {
      const token = await loginRequest(email, password)
      tokenStore.set(token)
      const user = await fetchMe()
      storeLogin(user)
      if (inModal) navigate(-1)
      else navigate('/')
    } catch (error) {
      tokenStore.clear()
      // 401 = wrong email/password; anything else is a transport/server fault.
      setFormError(
        isApiError(error) && error.status === 401
          ? t('auth.invalidCredentials')
          : t('errors.network'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogle = () => {
    window.location.href = '/api/auth/google'
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
        {formError ? (
          <p role="alert" className="text-sm text-red-600">
            {formError}
          </p>
        ) : null}

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

        <Button type="submit" fullWidth loading={submitting}>
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

      <Button variant="outline" fullWidth onClick={handleGoogle}>
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
