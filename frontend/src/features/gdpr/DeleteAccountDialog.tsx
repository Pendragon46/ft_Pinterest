import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/features/auth/auth.store'
import type { User } from '@/features/auth/auth.types'
import { tokenStore } from '@/features/auth/token'
import { useToast } from '@/lib/toast.store'

import { deleteMyAccount } from './gdpr.api'

interface Props {
  isOpen: boolean
  onClose: () => void
  user: User
}

// Suppression de compte — irréversible. La saisie du nom d'utilisateur est
// exigée pour écarter les clics accidentels (exigence RGPD « deletion with
// confirmation »).
export function DeleteAccountDialog({ isOpen, onClose, user }: Props) {
  const { t } = useTranslation('common')
  const [typed, setTyped] = useState('')
  const navigate = useNavigate()
  const qc = useQueryClient()
  const logout = useAuthStore((s) => s.logout)
  const toast = useToast()

  const canConfirm = typed === user.username

  const mutation = useMutation({
    mutationFn: () => deleteMyAccount(user.id),
    onSuccess: () => {
      // Le compte n'existe plus : purger toute trace locale avant de rediriger,
      // sinon un refetch partirait avec un token orphelin.
      tokenStore.clear()
      logout()
      qc.clear()
      navigate('/', { replace: true })
    },
    onError: () => {
      toast({ variant: 'error', message: t('gdpr.delete.error') })
    },
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="delete-account-title"
      size="md"
    >
      <div className="flex flex-col gap-5 p-6">
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600"
        >
          <Trash2 className="size-6" />
        </span>
        <div className="flex flex-col gap-2">
          <h2
            id="delete-account-title"
            className="font-serif text-2xl text-neutral-900"
          >
            {t('gdpr.delete.title')}
          </h2>
          <p className="text-sm text-neutral-600">{t('gdpr.delete.warning')}</p>
          <p className="text-sm text-neutral-500">
            {t('gdpr.delete.willDelete')}
          </p>
        </div>

        <Input
          label={t('gdpr.delete.confirmLabel', { username: user.username })}
          value={typed}
          onChange={(event) => {
            setTyped(event.target.value)
          }}
          placeholder={t('gdpr.delete.confirmPlaceholder')}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            {t('gdpr.delete.cancel')}
          </Button>
          <Button
            variant="danger"
            disabled={!canConfirm}
            loading={mutation.isPending}
            onClick={() => {
              mutation.mutate()
            }}
          >
            {mutation.isPending
              ? t('gdpr.delete.deleting')
              : t('gdpr.delete.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
