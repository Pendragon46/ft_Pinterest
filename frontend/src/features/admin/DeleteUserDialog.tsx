import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/features/auth/auth.store'
import { useToast } from '@/lib/toast.store'

import { adminKeys, deleteUserAsAdmin, type AdminUserRow } from './admin.api'

interface Props {
  /** The user to delete, or null when the dialog is closed. */
  user: AdminUserRow | null
  onClose: () => void
}

// Suppression d'un compte par un admin. Confirmation obligatoire (maquette).
export function DeleteUserDialog({ user, onClose }: Props) {
  const { t } = useTranslation('common')
  const qc = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const authUser = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const mutation = useMutation({
    mutationFn: (id: string) => deleteUserAsAdmin(id),
    onSuccess: (result, id) => {
      if (!result.ok) {
        toast({ variant: 'error', message: t('admin.error.roleRefused') })
        return
      }
      onClose()
      // Deleting your own account ends the session — go home instead of refetching (401).
      if (authUser && id === authUser.id) {
        logout()
        qc.clear()
        navigate('/', { replace: true })
        return
      }
      void qc.invalidateQueries({ queryKey: adminKeys.users() })
    },
    onError: () => {
      toast({ variant: 'error', message: t('errors.network') })
    },
  })

  if (!user) return null

  return (
    <Modal isOpen onClose={onClose} labelledBy="admin-delete-title" size="md">
      <div className="flex flex-col gap-5 p-6">
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600"
        >
          <Trash2 className="size-6" />
        </span>
        <div className="flex flex-col gap-2">
          <h2
            id="admin-delete-title"
            className="font-serif text-2xl text-neutral-900"
          >
            {t('admin.delete.title')}
          </h2>
          <p className="text-sm text-neutral-600">
            {t('admin.delete.body', {
              name: user.fullname ?? user.username,
              handle: user.username,
            })}
          </p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            {t('admin.delete.cancel')}
          </Button>
          <Button
            variant="danger"
            loading={mutation.isPending}
            onClick={() => {
              mutation.mutate(user.id)
            }}
          >
            {t('admin.delete.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
