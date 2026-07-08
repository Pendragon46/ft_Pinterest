import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { Divider } from '@/components/ui/Divider'
import { GoogleIcon } from '@/components/ui/GoogleIcon'
import { Input } from '@/components/ui/Input'
import { TextLink } from '@/components/ui/TextLink'
import {
  validateEmail,
  validatePassword,
  validateUsername,
} from '@/features/auth/auth.validation'
import type { AuthErrorKey } from '@/features/auth/auth.validation'
import { AuthCard } from '@/features/auth/components/AuthCard'

interface RegisterErrors {
  username?: AuthErrorKey
  email?: AuthErrorKey
  password?: AuthErrorKey
}

// Register screen — mirrors LoginPage (same shell, same two contexts),
// plus the username field required by the backend's user model.
export function RegisterPage() {
  const { t } = useTranslation('common')
  const location = useLocation()
  const background = (
    location.state as { background?: ReturnType<typeof useLocation> } | null
  )?.background

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<RegisterErrors>({})

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: RegisterErrors = {
      username: validateUsername(username),
      email: validateEmail(email),
      password: validatePassword(password),
    }
    setErrors(nextErrors)
    if (nextErrors.username || nextErrors.email || nextErrors.password) return

    // TODO(backend): POST /users exists, but CreateUserDto currently requires
    // bio and avatarUrl (Prisma marks them optional) — blocked until the DTO
    // gets @IsOptional() on both. See the backend note in the guide.
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

        <Button type="submit" fullWidth>
          {t('actions.signUp')}
        </Button>
      </form>

      <Divider>{t('divider.or')}</Divider>

      {/* Non-functional UI until the backend OAuth flow exists (Context.MD). */}
      <Button variant="outline" fullWidth>
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
