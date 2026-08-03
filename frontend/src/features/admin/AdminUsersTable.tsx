import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, Trash2, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { AppRole } from '@/features/auth/useRole'

import type { AdminUserRow } from './admin.api'
import { RoleSelect } from './RoleSelect'
import { ALL_ROLES, ROLE_LABEL_KEY } from './roleBadge'
import { SafeImage } from '@/components/ui/SafeImage'
import { initialsOf } from '@/lib/avatar'

type SortKey = 'recent' | 'oldest' | 'name'
const PAGE_SIZES = [10, 25, 50] as const

interface Props {
  users: AdminUserRow[]
  canAdmin: boolean
  onDelete: (user: AdminUserRow) => void
  /** Open a user's profile preview (admin quick-view). */
  onViewProfile: (id: string) => void
}

// Recherche, filtre, tri et pagination — tout côté client : GET /users renvoie
// la liste complète, il n'y a pas de pagination serveur.
export function AdminUsersTable({ users, canAdmin, onDelete, onViewProfile }: Props) {
  const { t, i18n } = useTranslation('common')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | AppRole>('ALL')
  const [sort, setSort] = useState<SortKey>('recent')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(10)

  // Reset to page 1 whenever a filter/sort/size changes — done in the handlers
  // (not an effect) so we never setState synchronously inside an effect.
  const onFilterChange = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v)
    setPage(1)
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false
      if (!needle) return true
      return (
        u.username.toLowerCase().includes(needle) ||
        u.email.toLowerCase().includes(needle) ||
        (u.fullname?.toLowerCase().includes(needle) ?? false)
      )
    })
    return [...filtered].sort((a, b) => {
      if (sort === 'oldest') return a.createdAt.localeCompare(b.createdAt)
      if (sort === 'name') return a.username.localeCompare(b.username)
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [users, query, roleFilter, sort])

  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const rows = visible.slice((safePage - 1) * pageSize, safePage * pageSize)
  const from = visible.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const to = Math.min(safePage * pageSize, visible.length)

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  const control =
    'h-11 rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-700 focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              onFilterChange(setQuery)(event.target.value)
            }}
            aria-label={t('admin.search.label')}
            placeholder={t('admin.search.placeholder')}
            className={`${control} h-11 w-full ps-9`}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(event) => {
            onFilterChange(setRoleFilter)(event.target.value as 'ALL' | AppRole)
          }}
          aria-label={t('admin.filter.role')}
          className={control}
        >
          <option value="ALL">{t('admin.filter.allRoles')}</option>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>
              {t(ROLE_LABEL_KEY[r])}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(event) => {
            onFilterChange(setSort)(event.target.value as SortKey)
          }}
          aria-label={t('admin.sort.label')}
          className={control}
        >
          <option value="recent">{t('admin.sort.recent')}</option>
          <option value="oldest">{t('admin.sort.oldest')}</option>
          <option value="name">{t('admin.sort.name')}</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-start text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <th scope="col" className="px-4 py-3 text-start font-medium">{t('admin.table.user')}</th>
                <th scope="col" className="px-4 py-3 text-start font-medium">{t('admin.table.email')}</th>
                <th scope="col" className="px-4 py-3 text-start font-medium">{t('admin.table.role')}</th>
                <th scope="col" className="px-4 py-3 text-start font-medium">{t('admin.table.joined')}</th>
                <th scope="col" className="px-4 py-3 text-start font-medium">{t('admin.table.updated')}</th>
                <th scope="col" className="px-4 py-3 text-start font-medium">{t('admin.table.artworks')}</th>
                {canAdmin ? (
                  <th scope="col" className="px-4 py-3 text-end font-medium">{t('admin.table.actions')}</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={canAdmin ? 7 : 6} className="px-4 py-16 text-center">
                    <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                      <Users aria-hidden="true" className="size-6" />
                    </span>
                    <p className="mt-3 font-serif text-lg text-neutral-900">{t('admin.empty.title')}</p>
                    <p className="text-sm text-neutral-500">{t('admin.empty.body')}</p>
                  </td>
                </tr>
              ) : (
                rows.map((u) => (
                  <tr key={u.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/60">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          onViewProfile(u.id)
                        }}
                        className="group flex items-center gap-3 rounded-lg text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
                      >
                        {u.avatarUrl ? (
                          <SafeImage src={u.avatarUrl} alt="" fallback={initialsOf(u.fullname ?? u.username)} className="size-9 shrink-0 rounded-full object-cover" />
                        ) : (
                          <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-semibold text-white">
                            {(u.fullname ?? u.username).charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          {/* break-words, not truncate: a 50-character display
                              name typed as one run has no space to cut at, so
                              truncate simply widened the cell (issue #21). */}
                          <p className="break-words font-medium text-neutral-900 group-hover:underline">{u.fullname ?? u.username}</p>
                          <p className="break-words text-xs text-neutral-500">@{u.username}</p>
                        </div>
                      </button>
                    </td>
                    <td className="break-words px-4 py-3 text-neutral-600">{u.email}</td>
                    <td className="px-4 py-3"><RoleSelect user={u} canEdit={canAdmin} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-600">{fmtDate(u.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-500">{fmtDate(u.updatedAt)}</td>
                    <td className="px-4 py-3 text-neutral-600">{u._count.artworks}</td>
                    {canAdmin ? (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              onDelete(u)
                            }}
                            aria-label={t('admin.action.delete')}
                            className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 motion-reduce:transition-none"
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-neutral-200 px-4 py-3 sm:flex-row">
          <p className="text-sm text-neutral-500">
            {t('admin.pagination.showing', { from, to, total: visible.length })}
          </p>
          <div className="flex items-center gap-2">
            <nav aria-label={t('admin.table.actions')} className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => {
                  setPage(Math.max(1, safePage - 1))
                }}
                aria-label={t('admin.pagination.previous')}
                className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </button>
              <span aria-current="page" className="min-w-9 rounded-lg bg-neutral-900 px-3 py-1.5 text-center text-sm text-white">
                {safePage}
              </span>
              <span className="text-sm text-neutral-400">/ {pageCount}</span>
              <button
                type="button"
                disabled={safePage >= pageCount}
                onClick={() => {
                  setPage(Math.min(pageCount, safePage + 1))
                }}
                aria-label={t('admin.pagination.next')}
                className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            </nav>
            <select
              value={pageSize}
              onChange={(event) => {
                onFilterChange(setPageSize)(Number(event.target.value))
              }}
              aria-label={t('admin.pagination.perPage', { n: pageSize })}
              className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm text-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-200"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {t('admin.pagination.perPage', { n })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
