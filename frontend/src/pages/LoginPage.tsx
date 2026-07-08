import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { Divider } from '@/components/ui/Divider'
import { GoogleIcon } from '@/components/ui/GoogleIcon'
import { Input } from '@/components/ui/Input'
import { TextLink } from '@/components/ui/TextLink'
import { validateEmail, validatePassword } from '@/features/auth/auth.validation'
import type { AuthErrorKey } from '@/features/auth/auth.validation'
import { AuthCard } from '@/features/auth/components/AuthCard'

interface LoginErrors {
  email?: AuthErrorKey
  password?: AuthErrorKey
}

// Login screen (Figma design). Two rendering contexts:
// - modal: we arrived with location.state.background — the Modal provides
//   the white card, we only render the content;
// - standalone /login (direct URL, refresh): AuthCard brings its own
//   centered page chrome.
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

  // Validate on submit only; each field clears its own error as soon as it
  // is edited again (less noisy than validating every keystroke).
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: LoginErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    }
    setErrors(nextErrors)
    if (nextErrors.email || nextErrors.password) return

    // TODO(backend): POST /auth/login with { email, password } through a
    // TanStack Query mutation, then useAuthStore login(user) — the store
    // interface is ready (see features/auth/auth.store.ts).
  }

  return (
    <AuthCard standalone={!background}>
      <div className="flex flex-col gap-1">
        <h1 id="login-title" className="text-4xl">
          {t('login.title')}
        </h1>
        <p className="text-neutral-500">{t('login.subtitle')}</p>
      </div>

      {/* noValidate: we own the validation UX — the browser's native bubbles
          are not translatable and clash with the design. */}
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
      </form>

      <Divider>{t('divider.or')}</Divider>

      {/* Non-functional UI until the backend OAuth flow exists (Context.MD). */}
      <Button variant="outline" fullWidth>
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
