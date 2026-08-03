import { useState } from 'react'
import type { FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { Divider } from '@/components/ui/Divider'
import { GoogleIcon } from '@/components/ui/GoogleIcon'
import { Input } from '@/components/ui/Input'
import { TextLink } from '@/components/ui/TextLink'
import { register as registerRequest, fetchMe } from '@/features/auth/auth.api'
import { useAuthStore } from '@/features/auth/auth.store'
import {
  USERNAME_MAX,
  validateEmail,
  validatePassword,
  validateUsername,
} from '@/features/auth/auth.validation'
import type { AuthErrorKey } from '@/features/auth/auth.validation'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { useIntroStore } from '@/features/auth/intro.store'
import { tokenStore } from '@/features/auth/token'
import { formatShortName } from '@/lib/name'

interface RegisterErrors {
  username?: AuthErrorKey
  email?: AuthErrorKey
  password?: AuthErrorKey
}

// Hold the submit button in its loading state for at least this long so a fast
// register still reads as "loading…" before the welcome reveal takes over.
const MIN_SUBMIT_MS = 600

// Backend register conflict keys (auth.emailTaken / auth.usernameTaken) are valid
// AuthErrorKeys, so a 409 fieldErrors payload maps straight onto the inputs.
function mapFieldErrors(
  fieldErrors: Record<string, string> | undefined,
): RegisterErrors {
  if (!fieldErrors) return {}
  const next: RegisterErrors = {}
  if (fieldErrors.username)
    next.username = fieldErrors.username as AuthErrorKey
  if (fieldErrors.email) next.email = fieldErrors.email as AuthErrorKey
  return next
}

// Mirrors LoginPage, plus the username field required by the user model.
export function RegisterPage() {
  const { t } = useTranslation('common')
  const location = useLocation()
  const navigate = useNavigate()
  const background = (
    location.state as { background?: ReturnType<typeof useLocation> } | null
  )?.background
  const inModal = Boolean(background)

  const storeLogin = useAuthStore((state) => state.login)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<RegisterErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: RegisterErrors = {
      username: validateUsername(username),
      email: validateEmail(email),
      password: validatePassword(password),
    }
    setErrors(nextErrors)
    if (nextErrors.username || nextErrors.email || nextErrors.password) return

    setSubmitting(true)
    setFormError(null)
    const startedAt = Date.now()
    try {
      // register signs a token, so we can log in without a second round-trip.
      const result = await registerRequest({ username, email, password })
      if (!result.ok) {
        if (result.fieldErrors) {
          setErrors((prev) => ({ ...prev, ...mapFieldErrors(result.fieldErrors) }))
        } else {
          setFormError(t('errors.network'))
        }
        return
      }
      tokenStore.set(result.token)
      const user = await fetchMe()
      storeLogin(user)
      const elapsed = Date.now() - startedAt
      if (elapsed < MIN_SUBMIT_MS) {
        await new Promise((resolve) =>
          setTimeout(resolve, MIN_SUBMIT_MS - elapsed),
        )
      }
      useIntroStore.getState().playWelcome(formatShortName(user))
      if (inModal) navigate(-1)
      else navigate('/')
    } catch {
      tokenStore.clear()
      setFormError(t('errors.network'))
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
        <h1 id="register-title" className="text-4xl">
          {t('register.title')}
        </h1>
        <p className="text-neutral-500">{t('register.subtitle')}</p>
      </div>

      <form noValidate className="flex flex-col gap-5" onSubmit={handleSubmit}>
        {formError ? (
          <p role="alert" className="text-sm text-red-600">
            {formError}
          </p>
        ) : null}

        <Input
          label={t('form.usernameLabel')}
          type="text"
          name="username"
          autoComplete="username"
          placeholder={t('form.usernamePlaceholder')}
          value={username}
          onChange={(event) => {
            setUsername(event.target.value)
            setErrors((prev) => ({ ...prev, username: undefined }))
          }}
          error={errors.username ? t(errors.username) : undefined}
          maxLength={USERNAME_MAX}
        />

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

        <Input
          label={t('form.passwordLabel')}
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder={t('form.passwordPlaceholder')}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            setErrors((prev) => ({ ...prev, password: undefined }))
          }}
          error={errors.password ? t(errors.password) : undefined}
        />

        <Button type="submit" fullWidth loading={submitting}>
          {t('actions.signUp')}
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
        {t('register.haveAccount')}{' '}
        <TextLink to="/login" replace state={{ background }}>
          {t('register.loginLink')}
        </TextLink>
      </p>
    </AuthCard>
  )
}
