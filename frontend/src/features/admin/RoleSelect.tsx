import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { AppRole } from '@/features/auth/useRole'
import { isApiError } from '@/lib/http'
import { useToast } from '@/lib/toast.store'

import { adminKeys, updateUserRole, type AdminUserRow } from './admin.api'
import { ALL_ROLES, ROLE_BADGE, ROLE_LABEL_KEY } from './roleBadge'

interface Props {
  user: AdminUserRow
  /** Only ADMIN may change roles; others see a static badge. */
  canEdit: boolean
}

// Sélecteur de rôle par ligne. `<select>` natif (accessible clavier/mobile
// gratuitement) stylé en pastille ; mise à jour optimiste avec rollback si le
// serveur refuse (dernier admin, auto-rétrogradation).
export function RoleSelect({ user, canEdit }: Props) {
  const { t } = useTranslation('common')
  const qc = useQueryClient()
  const toast = useToast()

  const mutation = useMutation({
    mutationFn: (role: AppRole) => updateUserRole(user.id, role),
    onMutate: async (role) => {
      await qc.cancelQueries({ queryKey: adminKeys.users() })
      const previous = qc.getQueryData<AdminUserRow[]>(adminKeys.users())
      qc.setQueryData<AdminUserRow[]>(adminKeys.users(), (old) =>
        old?.map((u) => (u.id === user.id ? { ...u, role } : u)),
      )
      return { previous }
    },
    onError: (error, _role, context) => {
      if (context?.previous) {
        qc.setQueryData(adminKeys.users(), context.previous)
      }
      // 403 = refus métier (dernier admin / auto-rétrogradation) : message dédié.
      toast({
        variant: 'error',
        message:
          isApiError(error) && error.status === 403
            ? t('admin.error.roleRefused')
            : t('errors.network'),
      })
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.users() })
    },
  })

  const badge = `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_BADGE[user.role]}`

  if (!canEdit) {
    return <span className={badge}>{t(ROLE_LABEL_KEY[user.role])}</span>
  }

  return (
    <span className={`relative ${badge}`}>
      <select
        aria-label={t('admin.action.changeRole')}
        value={user.role}
        disabled={mutation.isPending}
        onChange={(event) => {
          mutation.mutate(event.target.value as AppRole)
        }}
        className="cursor-pointer appearance-none bg-transparent pe-4 font-semibold uppercase focus:outline-none disabled:cursor-wait"
      >
        {ALL_ROLES.map((role) => (
          <option key={role} value={role}>
            {t(ROLE_LABEL_KEY[role])}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute end-1.5 top-1/2 size-3 -translate-y-1/2"
      />
    </span>
  )
}
