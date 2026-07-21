import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Flag,
  Plus,
  RefreshCw,
  Settings,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { Logo } from '@/components/ui/Logo'
import { TextLink } from '@/components/ui/TextLink'
import { AuthButton } from '@/features/auth/components/AuthButton'
import { RequireRole } from '@/features/auth/RequireRole'
import { useAuthStore } from '@/features/auth/auth.store'
import { useRole } from '@/features/auth/useRole'
import { adminKeys, fetchAllUsers, type AdminUserRow } from '@/features/admin/admin.api'
import { AddUserDialog } from '@/features/admin/AddUserDialog'
import { AdminStats } from '@/features/admin/AdminStats'
import { AdminUsersTable } from '@/features/admin/AdminUsersTable'
import { DeleteUserDialog } from '@/features/admin/DeleteUserDialog'

export function AdminPage() {
  const { canViewDashboard } = useRole()
  return (
    <RequireRole allow={canViewDashboard}>
      <AdminDashboard />
    </RequireRole>
  )
}

function AdminDashboard() {
  const { t } = useTranslation('common')
  const { canAdmin } = useRole()
  const currentUser = useAuthStore((s) => s.user)
  const [toDelete, setToDelete] = useState<AdminUserRow | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const query = useQuery({
    queryKey: adminKeys.users(),
    queryFn: fetchAllUsers,
  })
  const users = query.data ?? []

  const navItem =
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors motion-reduce:transition-none'

  return (
    <div className="flex min-h-svh bg-neutral-50">
      {/* Sidebar — desktop only; mobile gets the top bar's chrome. */}
      <aside className="hidden w-64 shrink-0 flex-col border-e border-neutral-200 bg-white lg:flex">
        <div className="flex items-center justify-between p-4">
          <Link to="/" aria-label={t('app.name')} className="text-lg text-neutral-900">
            <Logo withWordmark />
          </Link>
          <span className="inline-flex h-9 items-center rounded-full bg-neutral-100 px-2.5">
            <LanguageSwitcher />
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            {t('admin.breadcrumb.root')}
          </p>
          <span className={`${navItem} bg-neutral-900 text-white`} aria-current="page">
            <Users aria-hidden="true" className="size-4" />
            {t('admin.nav.users')}
          </span>
          {/* Not implemented → visibly inert, no dead link. */}
          <span className={`${navItem} cursor-not-allowed text-neutral-400`} aria-disabled="true" title={t('admin.nav.comingSoon')}>
            <Flag aria-hidden="true" className="size-4" />
            {t('admin.nav.reports')}
          </span>
          <span className={`${navItem} cursor-not-allowed text-neutral-400`} aria-disabled="true" title={t('admin.nav.comingSoon')}>
            <Settings aria-hidden="true" className="size-4" />
            {t('admin.nav.settings')}
          </span>

          <p className="mt-4 px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            {t('admin.nav.other')}
          </p>
          <TextLink to="/privacy" className="px-3 py-2 text-sm text-neutral-600">
            {t('legal.privacy')}
          </TextLink>
          <TextLink to="/terms" className="px-3 py-2 text-sm text-neutral-600">
            {t('legal.terms')}
          </TextLink>
        </nav>
        {currentUser ? (
          <div className="border-t border-neutral-200 p-3">
            <div className="flex items-center gap-3 rounded-xl bg-neutral-900 p-2.5 text-white">
              <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-sm font-semibold">
                {(currentUser.fullname ?? currentUser.username).charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{currentUser.fullname ?? currentUser.username}</p>
                <p className="truncate text-xs text-neutral-300">@{currentUser.username}</p>
              </div>
            </div>
          </div>
        ) : null}
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-neutral-200 bg-white/80 px-4 py-3 backdrop-blur sm:px-6">
          <p className="text-sm text-neutral-500">
            <span className="font-semibold text-neutral-900">{t('admin.breadcrumb.root')}</span>
            <span className="mx-2" aria-hidden="true">·</span>
            {t('admin.nav.users')}
          </p>
          <AuthButton />
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            {/* Title + actions */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="font-serif text-3xl text-neutral-900 sm:text-4xl">{t('admin.title')}</h1>
                <p className="mt-1 text-neutral-500">{t('admin.subtitle')}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void query.refetch()}
                  aria-label={t('admin.refresh')}
                  className="flex size-11 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 motion-reduce:transition-none"
                >
                  <RefreshCw aria-hidden="true" className={`size-4 ${query.isFetching ? 'animate-spin' : ''}`} />
                </button>
                {canAdmin ? (
                  <Button onClick={() => setAddOpen(true)}>
                    <Plus aria-hidden="true" className="size-4" />
                    {t('admin.add.button')}
                  </Button>
                ) : null}
              </div>
            </div>

            <AdminStats users={users} loading={query.isPending} />

            {query.isError ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-16 text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <AlertTriangle aria-hidden="true" className="size-6" />
                </span>
                <p className="font-serif text-lg text-neutral-900">{t('admin.error.title')}</p>
                <p className="text-sm text-neutral-500">{t('admin.error.body')}</p>
                <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                  <RefreshCw aria-hidden="true" className="size-4" />
                  {t('admin.error.retry')}
                </Button>
              </div>
            ) : query.isPending ? (
              <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                {[0, 1, 2, 3, 4, 5].map((row) => (
                  <div key={row} className="flex items-center gap-3 border-b border-neutral-100 p-4 last:border-0">
                    <span className="size-9 shrink-0 animate-pulse rounded-full bg-neutral-200" />
                    <span className="h-4 flex-1 animate-pulse rounded bg-neutral-200" />
                  </div>
                ))}
              </div>
            ) : (
              <AdminUsersTable users={users} canAdmin={canAdmin} onDelete={setToDelete} />
            )}
          </div>
        </main>
      </div>

      <DeleteUserDialog user={toDelete} onClose={() => setToDelete(null)} />
      <AddUserDialog isOpen={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
