import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { AppRole } from '@/features/auth/useRole'
import type { AuthErrorKey } from '@/features/auth/auth.validation'
import {
  fieldErrorKey,
  FULLNAME_MAX,
  USERNAME_MAX,
  validateEmail,
  validateFullname,
  validatePassword,
  validateUsername,
} from '@/features/auth/auth.validation'
import { isApiError } from '@/lib/http'
import { useToast } from '@/lib/toast.store'

import { adminKeys, createUserAsAdmin } from './admin.api'
import { ALL_ROLES, ROLE_LABEL_KEY } from './roleBadge'

interface Props {
  isOpen: boolean
  onClose: () => void
}

// Création d'un compte par un admin. Le backend n'a pas d'endpoint dédié : on
// réutilise l'inscription (POST /users), qui EXIGE un mot de passe fort — d'où
// le champ mot de passe absent de la maquette mais nécessaire ici.
export function AddUserDialog({ isOpen, onClose }: Props) {
  const { t } = useTranslation('common')
  const qc = useQueryClient()
  const toast = useToast()
  const [fullname, setFullname] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<AppRole>('USER')
  const [errors, setErrors] = useState<{
    fullname?: AuthErrorKey
    username?: AuthErrorKey
    email?: AuthErrorKey
    password?: AuthErrorKey
  }>({})

  const reset = () => {
    setFullname('')
    setUsername('')
    setEmail('')
    setPassword('')
    setRole('USER')
    setErrors({})
  }

  const mutation = useMutation({
    mutationFn: () =>
      createUserAsAdmin({
        fullname: fullname.trim() || undefined,
        username: username.trim(),
        email: email.trim(),
        password,
        role,
      }),
    onSuccess: (result) => {
      if (!result.ok) {
        // Register answers 2xx with i18n conflict keys (email / username taken).
        const fe = result.fieldErrors
        if (fe?.username || fe?.email) {
          setErrors({
            username: fe.username as AuthErrorKey | undefined,
            email: fe.email as AuthErrorKey | undefined,
          })
        } else {
          toast({ variant: 'error', message: t('errors.network') })
        }
        return
      }
      void qc.invalidateQueries({ queryKey: adminKeys.users() })
      reset()
      onClose()
      toast({ message: t('admin.userCreated') })
    },
    onError: (error) => {
      // Safety net: a ValidationPipe 400 slipped past the client-side rules
      // above. Land it on the field it names rather than on a generic toast —
      // that mismatch is what left issue #21 showing only a console error.
      const mapped: typeof errors = {}
      if (isApiError(error) && error.fieldErrors) {
        for (const field of Object.keys(error.fieldErrors)) {
          const key = fieldErrorKey(field)
          if (key) mapped[field as keyof typeof errors] = key
        }
      }
      if (Object.keys(mapped).length > 0) {
        setErrors(mapped)
        return
      }
      toast({ variant: 'error', message: t('errors.network') })
    },
  })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    // Validate on submit so the reason is shown, instead of only greying out
    // the button and leaving the admin to guess which field is at fault.
    const nextErrors = {
      fullname: validateFullname(fullname),
      username: validateUsername(username),
      email: validateEmail(email),
      password: validatePassword(password),
    }
    setErrors(nextErrors)
    if (
      nextErrors.fullname ||
      nextErrors.username ||
      nextErrors.email ||
      nextErrors.password
    ) {
      return
    }
    mutation.mutate()
  }

  const field =
    'w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 transition-colors hover:border-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 motion-reduce:transition-none'

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="admin-add-title" size="wide">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6 sm:p-8">
        <div className="flex flex-col gap-1">
          <h2 id="admin-add-title" className="font-serif text-2xl text-neutral-900">
            {t('admin.add.title')}
          </h2>
          <p className="text-sm text-neutral-500">{t('admin.add.subtitle')}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('admin.add.fullname')}
            value={fullname}
            onChange={(event) => {
              setFullname(event.target.value)
              setErrors((prev) => ({ ...prev, fullname: undefined }))
            }}
            error={errors.fullname ? t(errors.fullname) : undefined}
            maxLength={FULLNAME_MAX}
            placeholder="Maya Chen"
          />
          <Input
            label={t('admin.add.username')}
            value={username}
            onChange={(event) => {
              setUsername(event.target.value)
              setErrors((prev) => ({ ...prev, username: undefined }))
            }}
            error={errors.username ? t(errors.username) : undefined}
            maxLength={USERNAME_MAX}
            placeholder="mayac"
            autoCapitalize="off"
          />
        </div>
        <Input
          label={t('admin.add.email')}
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            setErrors((prev) => ({ ...prev, email: undefined }))
          }}
          error={errors.email ? t(errors.email) : undefined}
          placeholder="maya@example.com"
        />
        <Input
          label={t('admin.add.password')}
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            setErrors((prev) => ({ ...prev, password: undefined }))
          }}
          error={errors.password ? t(errors.password) : undefined}
          autoComplete="new-password"
          helperText={t('admin.add.passwordHint')}
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="admin-add-role"
            className="font-serif text-lg text-neutral-900"
          >
            {t('admin.add.role')}
          </label>
          <select
            id="admin-add-role"
            value={role}
            onChange={(event) => {
              setRole(event.target.value as AppRole)
            }}
            className={field}
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {t(ROLE_LABEL_KEY[r])}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" type="button" onClick={onClose}>
            {t('admin.add.cancel')}
          </Button>
          {/* Not gated on validity: a disabled button hides *why* it is
              disabled. Submitting runs the checks and shows the reason. */}
          <Button type="submit" loading={mutation.isPending}>
            <Plus aria-hidden="true" className="size-4" />
            {t('admin.add.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
