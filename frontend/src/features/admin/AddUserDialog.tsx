import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { AppRole } from '@/features/auth/useRole'
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

  const reset = () => {
    setFullname('')
    setUsername('')
    setEmail('')
    setPassword('')
    setRole('USER')
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.users() })
      reset()
      onClose()
    },
    onError: (error) => {
      // 409 = username/email pris ; 400 = validation (mot de passe faible…).
      toast({
        variant: 'error',
        message: isApiError(error) ? error.message : t('errors.network'),
      })
    },
  })

  const canSubmit =
    username.trim().length >= 3 && email.includes('@') && password.length >= 8

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (canSubmit) mutation.mutate()
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
            }}
            placeholder="Maya Chen"
          />
          <Input
            label={t('admin.add.username')}
            value={username}
            onChange={(event) => {
              setUsername(event.target.value)
            }}
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
          }}
          placeholder="maya@example.com"
        />
        <Input
          label={t('admin.add.password')}
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
          }}
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
          <Button type="submit" loading={mutation.isPending} disabled={!canSubmit}>
            <Plus aria-hidden="true" className="size-4" />
            {t('admin.add.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
