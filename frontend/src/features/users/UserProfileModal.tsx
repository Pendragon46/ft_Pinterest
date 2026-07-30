import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Modal } from '@/components/ui/Modal'
import { SafeImage } from '@/components/ui/SafeImage'
import { ROLE_BADGE, ROLE_LABEL_KEY } from '@/features/admin/roleBadge'
import type { AppRole } from '@/features/auth/useRole'
import {
  fetchFollowerCount,
  fetchFollowingCount,
  fetchProfile,
  fetchUserWorks,
  userKeys,
} from './user.api'

interface Props {
  /** The user to preview, or null when the modal is closed. */
  userId: string | null
  onClose: () => void
}

// Aperçu du profil d'un utilisateur en modal (usage admin) : avatar, nom, rôle,
// bio, compteurs et un aperçu de ses œuvres, sans quitter le dashboard.
export function UserProfileModal({ userId, onClose }: Props) {
  const { t } = useTranslation('common')
  const enabled = userId !== null
  const id = userId ?? ''

  const profile = useQuery({ queryKey: userKeys.profile(id), queryFn: () => fetchProfile(id), enabled })
  const works = useQuery({ queryKey: userKeys.works(id), queryFn: () => fetchUserWorks(id), enabled })
  const followers = useQuery({ queryKey: userKeys.followerCount(id), queryFn: () => fetchFollowerCount(id), enabled })
  const following = useQuery({ queryKey: userKeys.followingCount(id), queryFn: () => fetchFollowingCount(id), enabled })

  if (!userId) return null

  const u = profile.data
  const role = (u?.role ?? 'USER') as AppRole
  const workList = works.data ?? []

  const stat = (value: number | undefined, label: string) => (
    <div className="flex flex-col">
      <span className="text-lg font-semibold text-neutral-900">{value ?? '—'}</span>
      <span className="text-xs text-neutral-500">{label}</span>
    </div>
  )

  return (
    <Modal isOpen onClose={onClose} labelledBy="user-profile-title" size="wide">
      <div className="flex max-h-[85svh] flex-col gap-5 overflow-y-auto p-6">
        {profile.isPending ? (
          <div className="flex items-center gap-4">
            <span className="size-16 animate-pulse rounded-full bg-neutral-200" />
            <div className="flex-1 space-y-2">
              <span className="block h-5 w-1/3 animate-pulse rounded bg-neutral-200" />
              <span className="block h-4 w-1/4 animate-pulse rounded bg-neutral-200" />
            </div>
          </div>
        ) : profile.isError || !u ? (
          <p role="alert" className="py-8 text-center text-sm text-red-600">
            {t('profile.loadError')}
          </p>
        ) : (
          <>
            <header className="flex items-center gap-4">
              <SafeImage
                src={u.avatarUrl}
                alt=""
                className="size-16 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="user-profile-title" className="truncate font-serif text-2xl text-neutral-900">
                    {u.fullname ?? u.username}
                  </h2>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_BADGE[role]}`}>
                    {t(ROLE_LABEL_KEY[role])}
                  </span>
                </div>
                <p className="truncate text-sm text-neutral-500">@{u.username}</p>
                <p className="truncate text-sm text-neutral-500">{u.email}</p>
              </div>
            </header>

            {u.bio ? <p className="text-neutral-700">{u.bio}</p> : null}

            <div className="flex gap-8 border-y border-neutral-100 py-3">
              {stat(workList.length, t('userModal.works'))}
              {stat(followers.data, t('userModal.followers'))}
              {stat(following.data, t('userModal.following'))}
            </div>

            {/* Aperçu des œuvres (vignettes non cliquables pour rester dans le modal). */}
            {works.isPending ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {[0, 1, 2, 3].map((n) => (
                  <span key={n} className="aspect-square animate-pulse rounded-lg bg-neutral-200" />
                ))}
              </div>
            ) : workList.length === 0 ? (
              <p className="text-sm text-neutral-400">{t('userModal.noWorks')}</p>
            ) : (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {workList.slice(0, 8).map((w) => (
                  <li key={w.id} className="aspect-square overflow-hidden rounded-lg bg-neutral-100">
                    {w.mediaUrl ? (
                      <SafeImage src={w.mediaUrl} alt={w.title} loading="lazy" draggable={false} className="size-full object-cover" />
                    ) : (
                      <span aria-hidden="true" className="block size-full bg-neutral-200" />
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex justify-end">
              <Link
                to={`/profile/${u.id}`}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
              >
                <ExternalLink aria-hidden="true" className="size-4" />
                {t('userModal.viewFull')}
              </Link>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
