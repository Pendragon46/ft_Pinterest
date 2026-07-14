import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { AppHeader } from '@/components/AppHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useAuthStore } from '@/features/auth/auth.store'
import type { AuthErrorKey } from '@/features/auth/auth.validation'
import {
  validateEmail,
  validatePassword,
  validateUsername,
} from '@/features/auth/auth.validation'
import { updateAccount, updateProfile, userKeys } from '@/features/users/user.api'
import { DEFAULT_AVATAR } from '@/lib/avatar'

type Section = 'account' | 'appearance'

export function SettingsPage() {
  const { t } = useTranslation('common')
  const authUser = useAuthStore((state) => state.user)
  const login = useAuthStore((state) => state.login)
  const queryClient = useQueryClient()
  const userId = authUser?.id ?? 'dev-user'

  const [section, setSection] = useState<Section>('account')

  // Profile form (seeded from the current identity).
  const fileRef = useRef<HTMLInputElement>(null)
  const [fullname, setFullname] = useState(authUser?.fullname ?? '')
  const [username, setUsername] = useState(authUser?.username ?? '')
  const [bio, setBio] = useState(authUser?.bio ?? '')
  const [avatarPreview, setAvatarPreview] = useState(
    authUser?.avatarUrl ?? DEFAULT_AVATAR,
  )
  const [profileError, setProfileError] = useState<AuthErrorKey | undefined>()
  const [profileSaved, setProfileSaved] = useState(false)

  // Email & password form.
  const [email, setEmail] = useState(authUser?.email ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [accountErrors, setAccountErrors] = useState<{
    email?: AuthErrorKey
    password?: AuthErrorKey
    confirm?: 'settings.passwordMismatch'
  }>({})
  const [accountSaved, setAccountSaved] = useState(false)

  const profileMutation = useMutation({
    // TODO(backend): PATCH /users/:id (multipart if avatar changed).
    mutationFn: () =>
      updateProfile(userId, {
        loggedUser: userId,
        fullname: fullname.trim() || null,
        username: username.trim(),
        bio: bio.trim() || null,
        avatarUrl: avatarPreview,
      }),
    onSuccess: (updated) => {
      login(updated) // reflect the new identity in the header/avatar immediately
      void queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) })
      setProfileSaved(true)
      window.setTimeout(() => {
        setProfileSaved(false)
      }, 2000)
    },
  })

  const accountMutation = useMutation({
    // TODO(backend): PATCH /users/:id with { email?, password? }.
    mutationFn: () =>
      updateAccount(userId, {
        loggedUser: userId,
        email: email.trim() !== authUser?.email ? email.trim() : undefined,
        password: password || undefined,
      }),
    onSuccess: (updated) => {
      login(updated)
      void queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) })
      setAccountSaved(true)
      setPassword('')
      setConfirm('')
      window.setTimeout(() => {
        setAccountSaved(false)
      }, 2000)
    },
  })

  const onAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    // Mock: preview only. The real save sends multipart/form-data (field `avatar`).
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setAvatarPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleProfileSave = (event: FormEvent) => {
    event.preventDefault()
    const usernameError = validateUsername(username)
    setProfileError(usernameError)
    if (usernameError) return
    setProfileSaved(false)
    profileMutation.mutate()
  }

  const handleAccountSave = (event: FormEvent) => {
    event.preventDefault()
    const emailError = validateEmail(email)
    const passwordError = password ? validatePassword(password) : undefined
    const confirmError =
      password && password !== confirm ? 'settings.passwordMismatch' : undefined
    setAccountErrors({
      email: emailError,
      password: passwordError,
      confirm: confirmError,
    })
    if (emailError || passwordError || confirmError) return
    setAccountSaved(false)
    accountMutation.mutate()
  }

  const sections: { id: Section; label: string }[] = [
    { id: 'account', label: t('settings.navAccount') },
    { id: 'appearance', label: t('settings.navAppearance') },
  ]

  return (
    <div className="min-h-svh bg-white">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-serif text-4xl text-neutral-900">
          {t('settings.title')}
        </h1>

        <div className="mt-8 grid gap-8 md:grid-cols-[13rem_1fr]">
          <nav aria-label={t('settings.title')}>
            <ul className="flex flex-row gap-1 md:flex-col">
              {sections.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    aria-current={section === entry.id ? 'page' : undefined}
                    onClick={() => {
                      setSection(entry.id)
                    }}
                    className={`w-full cursor-pointer rounded-lg px-4 py-2.5 text-start text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 motion-reduce:transition-none ${
                      section === entry.id
                        ? 'bg-neutral-100 font-medium text-neutral-900'
                        : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800'
                    }`}
                  >
                    {entry.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0">
            {section === 'account' ? (
              <div className="flex flex-col gap-6">
                {/* Profile card */}
                <form
                  onSubmit={handleProfileSave}
                  className="flex flex-col gap-5 rounded-2xl border border-neutral-200 p-6"
                >
                  <h2 className="font-serif text-xl text-neutral-900">
                    {t('settings.profileHeading')}
                  </h2>
                  <div className="flex items-center gap-4">
                    <img
                      src={avatarPreview}
                      alt=""
                      className="size-16 rounded-full object-cover"
                    />
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={onAvatarChange}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        fileRef.current?.click()
                      }}
                    >
                      {t('settings.changeAvatar')}
                    </Button>
                  </div>
                  <Input
                    label={t('settings.displayName')}
                    value={fullname}
                    onChange={(event) => {
                      setFullname(event.target.value)
                    }}
                  />
                  <Input
                    label={t('settings.username')}
                    value={username}
                    onChange={(event) => {
                      setUsername(event.target.value)
                    }}
                    error={profileError ? t(profileError) : undefined}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="settings-bio"
                      className="font-serif text-lg text-neutral-900"
                    >
                      {t('settings.bio')}
                    </label>
                    <textarea
                      id="settings-bio"
                      value={bio}
                      onChange={(event) => {
                        setBio(event.target.value)
                      }}
                      rows={3}
                      className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 transition-colors placeholder:text-neutral-400 hover:border-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 motion-reduce:transition-none"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button type="submit" loading={profileMutation.isPending}>
                      {t('settings.save')}
                    </Button>
                    <p role="status" className="text-sm text-green-700">
                      {profileSaved ? t('settings.saved') : ''}
                    </p>
                  </div>
                </form>

                {/* Email & password card */}
                <form
                  onSubmit={handleAccountSave}
                  className="flex flex-col gap-5 rounded-2xl border border-neutral-200 p-6"
                >
                  <h2 className="font-serif text-xl text-neutral-900">
                    {t('settings.emailPasswordHeading')}
                  </h2>
                  <Input
                    label={t('settings.email')}
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                    }}
                    error={accountErrors.email ? t(accountErrors.email) : undefined}
                  />
                  <Input
                    label={t('settings.newPassword')}
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                    }}
                    error={
                      accountErrors.password ? t(accountErrors.password) : undefined
                    }
                  />
                  <Input
                    label={t('settings.confirmPassword')}
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(event) => {
                      setConfirm(event.target.value)
                    }}
                    error={
                      accountErrors.confirm ? t(accountErrors.confirm) : undefined
                    }
                  />
                  <div className="flex items-center gap-3">
                    <Button type="submit" loading={accountMutation.isPending}>
                      {t('settings.save')}
                    </Button>
                    <p role="status" className="text-sm text-green-700">
                      {accountSaved ? t('settings.saved') : ''}
                    </p>
                  </div>
                </form>
              </div>
            ) : (
              /* Appearance section */
              <div className="flex flex-col gap-5 rounded-2xl border border-neutral-200 p-6">
                <h2 className="font-serif text-xl text-neutral-900">
                  {t('settings.appearanceHeading')}
                </h2>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-900">{t('settings.language')}</span>
                  <LanguageSwitcher />
                </div>
                {/* Theme: a documented placeholder — not a functional toggle yet. */}
                <div className="flex items-center justify-between border-t border-neutral-100 pt-5">
                  <span className="text-neutral-400">{t('settings.theme')}</span>
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-400">
                    {t('settings.themeSoon')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
