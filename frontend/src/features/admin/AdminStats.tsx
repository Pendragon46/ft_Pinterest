import { useMemo } from 'react'
import { Shield, User as UserIcon, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { AdminUserRow } from './admin.api'

// Statistiques dérivées de la liste déjà chargée (pas d'endpoint dédié).
export function AdminStats({
  users,
  loading,
}: {
  users: AdminUserRow[]
  loading: boolean
}) {
  const { t } = useTranslation('common')

  const stats = useMemo(() => {
    const admins = users.filter((u) => u.role === 'ADMIN').length
    return {
      total: users.length,
      admins,
      // « Utilisateurs » = comptes non-admin.
      members: users.length - admins,
    }
  }, [users])

  const cards = [
    { key: 'total', value: stats.total, label: t('admin.stats.total'), icon: Users, tint: 'bg-violet-100 text-violet-600' },
    { key: 'admins', value: stats.admins, label: t('admin.stats.admins'), icon: Shield, tint: 'bg-blue-100 text-blue-600' },
    { key: 'members', value: stats.members, label: t('admin.stats.members'), icon: UserIcon, tint: 'bg-emerald-100 text-emerald-600' },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5"
        >
          <span
            aria-hidden="true"
            className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${card.tint}`}
          >
            <card.icon className="size-5" />
          </span>
          <div className="min-w-0">
            {loading ? (
              <span className="block h-7 w-10 animate-pulse rounded bg-neutral-200" />
            ) : (
              <p className="text-2xl font-semibold text-neutral-900">
                {card.value}
              </p>
            )}
            <p className="truncate text-sm text-neutral-500">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
