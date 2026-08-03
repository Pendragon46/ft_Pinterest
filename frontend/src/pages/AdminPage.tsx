import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Image as ImageIcon,
  Plus,
  RefreshCw,
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
import { AdminAnalytics } from '@/features/admin/AdminAnalytics'
import { AdminArtworksPanel } from '@/features/admin/AdminArtworksPanel'
import { AdminStats } from '@/features/admin/AdminStats'
import { AdminStatusPanel } from '@/features/admin/AdminStatusPanel'
import { AdminUsersTable } from '@/features/admin/AdminUsersTable'
import { DeleteUserDialog } from '@/features/admin/DeleteUserDialog'
import { UserProfileModal } from '@/features/users/UserProfileModal'

type AdminTab = 'overview' | 'users' | 'artworks' | 'status'

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
  const [tab, setTab] = useState<AdminTab>('overview')
  const [toDelete, setToDelete] = useState<AdminUserRow | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [viewUserId, setViewUserId] = useState<string | null>(null)

  const query = useQuery({
    queryKey: adminKeys.users(),
    queryFn: fetchAllUsers,
    // Live overview: poll so user counts move during a demo without a reload.
    refetchInterval: 15_000,
  })
  const users = query.data ?? []

  const navItem =
    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 motion-reduce:transition-none'
  const navState = (active: boolean) =>
    active ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'

  const tabLabel =
    tab === 'overview'
      ? t('admin.nav.overview')
      : tab === 'users'
        ? t('admin.nav.users')
        : tab === 'artworks'
          ? t('admin.nav.artworks')
          : t('admin.nav.status')

  return (
    <div className="flex min-h-svh bg-neutral-50">
      <aside className="hidden w-64 shrink-0 flex-col border-e border-neutral-200 bg-white lg:flex print:hidden">
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
          <button
            type="button"
            onClick={() => setTab('overview')}
            aria-current={tab === 'overview' ? 'page' : undefined}
            className={`${navItem} ${navState(tab === 'overview')}`}
          >
            <BarChart3 aria-hidden="true" className="size-4" />
            {t('admin.nav.overview')}
          </button>
          <button
            type="button"
            onClick={() => setTab('users')}
            aria-current={tab === 'users' ? 'page' : undefined}
            className={`${navItem} ${navState(tab === 'users')}`}
          >
            <Users aria-hidden="true" className="size-4" />
            {t('admin.nav.users')}
          </button>
          <button
            type="button"
            onClick={() => setTab('artworks')}
            aria-current={tab === 'artworks' ? 'page' : undefined}
            className={`${navItem} ${navState(tab === 'artworks')}`}
          >
            <ImageIcon aria-hidden="true" className="size-4" />
            {t('admin.nav.artworks')}
          </button>
          <button
            type="button"
            onClick={() => setTab('status')}
            aria-current={tab === 'status' ? 'page' : undefined}
            className={`${navItem} ${navState(tab === 'status')}`}
          >
            <Activity aria-hidden="true" className="size-4" />
            {t('admin.nav.status')}
          </button>

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

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-neutral-200 bg-white/80 px-4 py-3 backdrop-blur sm:px-6 print:hidden">
          <p className="text-sm text-neutral-500">
            <span className="font-semibold text-neutral-900">{t('admin.breadcrumb.root')}</span>
            <span className="mx-2" aria-hidden="true">·</span>
            {tabLabel}
          </p>
          <AuthButton />
        </header>

        <div className="flex gap-1 border-b border-neutral-200 bg-white px-4 sm:px-6 lg:hidden print:hidden">
          <button
            type="button"
            onClick={() => setTab('overview')}
            aria-current={tab === 'overview' ? 'page' : undefined}
            className={`-mb-px border-b-2 px-3 py-3 text-sm font-medium ${tab === 'overview' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500'}`}
          >
            {t('admin.nav.overview')}
          </button>
          <button
            type="button"
            onClick={() => setTab('users')}
            aria-current={tab === 'users' ? 'page' : undefined}
            className={`-mb-px border-b-2 px-3 py-3 text-sm font-medium ${tab === 'users' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500'}`}
          >
            {t('admin.nav.users')}
          </button>
          <button
            type="button"
            onClick={() => setTab('artworks')}
            aria-current={tab === 'artworks' ? 'page' : undefined}
            className={`-mb-px border-b-2 px-3 py-3 text-sm font-medium ${tab === 'artworks' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500'}`}
          >
            {t('admin.nav.artworks')}
          </button>
          <button
            type="button"
            onClick={() => setTab('status')}
            aria-current={tab === 'status' ? 'page' : undefined}
            className={`-mb-px border-b-2 px-3 py-3 text-sm font-medium ${tab === 'status' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500'}`}
          >
            {t('admin.nav.status')}
          </button>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="font-serif text-3xl text-neutral-900 sm:text-4xl">
                  {tab === 'overview'
                    ? t('admin.analytics.title')
                    : tab === 'users'
                      ? t('admin.title')
                      : tab === 'artworks'
                        ? t('admin.artworks.title')
                        : t('admin.status.title')}
                </h1>
                <p className="mt-1 text-neutral-500">
                  {tab === 'overview'
                    ? t('admin.analytics.subtitle')
                    : tab === 'users'
                      ? t('admin.subtitle')
                      : tab === 'artworks'
                        ? t('admin.artworks.subtitle')
                        : t('admin.status.subtitle')}
                </p>
              </div>
              {tab === 'users' ? (
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
              ) : null}
            </div>

            {tab === 'overview' ? (
              query.isError ? (
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
              ) : (
                <>
                  <AdminStats users={users} loading={query.isPending} />
                  <AdminAnalytics users={users} usersLoading={query.isPending} />
                </>
              )
            ) : tab === 'users' ? (
              <>
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
                  <AdminUsersTable
                    users={users}
                    canAdmin={canAdmin}
                    onDelete={setToDelete}
                    onViewProfile={setViewUserId}
                  />
                )}
              </>
            ) : tab === 'artworks' ? (
              <AdminArtworksPanel canAdmin={canAdmin} />
            ) : (
              <AdminStatusPanel />
            )}
          </div>
        </main>
      </div>

      <DeleteUserDialog user={toDelete} onClose={() => setToDelete(null)} />
      <AddUserDialog isOpen={addOpen} onClose={() => setAddOpen(false)} />
      <UserProfileModal userId={viewUserId} onClose={() => setViewUserId(null)} />
    </div>
  )
}
