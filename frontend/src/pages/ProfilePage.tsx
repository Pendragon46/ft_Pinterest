import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { AppHeader } from '@/components/AppHeader'
import { Button } from '@/components/ui/Button'
import {
  ProfileArtworkCard,
  ProfileArtworkCardSkeleton,
} from '@/features/artworks/components/ProfileArtworkCard'
import { useAuthStore } from '@/features/auth/auth.store'
import {
  fetchFollowerCount,
  fetchFollowingCount,
  fetchProfile,
  fetchUserLiked,
  fetchUserWorks,
  userKeys,
} from '@/features/users/user.api'
import { useCompact } from '@/lib/useCompact'

type Tab = 'works' | 'liked'

const GRID = 'grid grid-cols-2 gap-x-5 gap-y-6 md:grid-cols-3 xl:grid-cols-4'

export function ProfilePage() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const compact = useCompact()
  const authUser = useAuthStore((state) => state.user)
  // Own profile only this version; identity is a single input so /profile/:username
  // (other users) is a later extension, not a rewrite.
  const userId = authUser?.id ?? 'dev-user'
  const isOwnProfile = true

  const [tab, setTab] = useState<Tab>('works')
  const [shareHint, setShareHint] = useState(false)

  const profileQuery = useQuery({
    queryKey: userKeys.profile(userId),
    queryFn: () => fetchProfile(userId),
    retry: false,
  })
  const worksQuery = useQuery({
    queryKey: userKeys.works(userId),
    queryFn: () => fetchUserWorks(userId),
  })
  const likedQuery = useQuery({
    queryKey: userKeys.liked(userId),
    queryFn: () => fetchUserLiked(userId),
  })
  const followerQuery = useQuery({
    queryKey: userKeys.followerCount(userId),
    queryFn: () => fetchFollowerCount(userId),
  })
  const followingQuery = useQuery({
    queryKey: userKeys.followingCount(userId),
    queryFn: () => fetchFollowingCount(userId),
  })

  const handleShare = () => {
    void navigator.clipboard
      ?.writeText(`${window.location.origin}/profile`)
      .then(() => {
        setShareHint(true)
        window.setTimeout(() => {
          setShareHint(false)
        }, 1600)
      })
      .catch(() => {
        /* best-effort */
      })
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'works', label: t('profile.tabWorks') },
    { id: 'liked', label: t('profile.tabLiked') },
  ]

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const rtl = document.documentElement.dir === 'rtl'
    const forward = (event.key === 'ArrowRight') !== rtl
    const index = tabs.findIndex((entry) => entry.id === tab)
    const next = tabs[(index + (forward ? 1 : -1) + tabs.length) % tabs.length]
    setTab(next.id)
    document.getElementById(`profile-tab-${next.id}`)?.focus()
  }

  const activeQuery = tab === 'works' ? worksQuery : likedQuery
  const items = activeQuery.data ?? []
  const profile = profileQuery.data

  return (
    <div className="min-h-svh bg-white">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        {profileQuery.isPending ? (
          <ProfileHeaderSkeleton />
        ) : profileQuery.isError || !profile ? (
          <div className="flex flex-col items-start gap-3 py-12">
            <p className="text-neutral-700">{t('profile.loadError')}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void profileQuery.refetch()
              }}
            >
              {t('artwork.retry')}
            </Button>
          </div>
        ) : (
          <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-5">
              <img
                src={profile.avatarUrl}
                alt={profile.fullname ?? profile.username}
                className="size-24 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0">
                <h1 className="font-serif text-3xl text-neutral-900">
                  {profile.fullname ?? `@${profile.username}`}
                </h1>
                <p className="text-neutral-500">@{profile.username}</p>
                {profile.bio ? (
                  <p className="mt-2 max-w-xl text-neutral-700">{profile.bio}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-neutral-500">
                  <span>
                    <b className="text-neutral-900">
                      {compact(worksQuery.data?.length ?? 0)}
                    </b>{' '}
                    {t('profile.stats.works')}
                  </span>
                  <span>
                    <b className="text-neutral-900">
                      {compact(followerQuery.data ?? 0)}
                    </b>{' '}
                    {t('profile.stats.followers')}
                  </span>
                  <span>
                    <b className="text-neutral-900">
                      {compact(followingQuery.data ?? 0)}
                    </b>{' '}
                    {t('profile.stats.following')}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {isOwnProfile ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigate('/settings')
                  }}
                >
                  {t('profile.edit')}
                </Button>
              ) : (
                // Follow branch — unreachable until auth exists (isOwnProfile is
                // always true in this version); wired so adding it later is trivial.
                <Button size="sm">{t('artwork.follow')}</Button>
              )}
              <div className="relative">
                <Button variant="outline" size="sm" onClick={handleShare}>
                  {t('profile.share')}
                </Button>
                {shareHint ? (
                  <span
                    role="status"
                    className="absolute end-0 top-full mt-1 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs text-white"
                  >
                    {t('artwork.linkCopied')}
                  </span>
                ) : null}
              </div>
            </div>
          </header>
        )}

        {profile ? (
          <>
            <div
              role="tablist"
              aria-label={t('profile.title')}
              className="mt-8 flex gap-6 border-b border-neutral-200"
            >
              {tabs.map((entry) => (
                <button
                  key={entry.id}
                  id={`profile-tab-${entry.id}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === entry.id}
                  aria-controls={`profile-panel-${entry.id}`}
                  tabIndex={tab === entry.id ? 0 : -1}
                  onClick={() => {
                    setTab(entry.id)
                  }}
                  onKeyDown={onTabKey}
                  className={`-mb-px cursor-pointer border-b-2 px-1 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 motion-reduce:transition-none ${
                    tab === entry.id
                      ? 'border-neutral-900 text-neutral-900'
                      : 'border-transparent text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            <div
              id={`profile-panel-${tab}`}
              role="tabpanel"
              aria-labelledby={`profile-tab-${tab}`}
              tabIndex={0}
              className="mt-6 focus-visible:outline-none"
            >
              {activeQuery.isPending ? (
                <div className={GRID}>
                  {Array.from({ length: 8 }).map((_, index) => (
                    <ProfileArtworkCardSkeleton key={index} />
                  ))}
                </div>
              ) : activeQuery.isError ? (
                <div className="flex flex-col items-start gap-3 py-12">
                  <p className="text-neutral-700">{t('profile.loadError')}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void activeQuery.refetch()
                    }}
                  >
                    {t('artwork.retry')}
                  </Button>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <span aria-hidden="true" className="text-4xl">
                    🧭
                  </span>
                  <p className="max-w-sm text-neutral-500">
                    {tab === 'works'
                      ? isOwnProfile
                        ? t('profile.worksEmptyOwn')
                        : t('profile.worksEmptyOther')
                      : t('profile.likedEmpty')}
                  </p>
                </div>
              ) : (
                <div className={GRID}>
                  {items.map((artwork) => (
                    <ProfileArtworkCard key={artwork.id} artwork={artwork} />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </main>
    </div>
  )
}

// Header placeholder while the profile loads (§2.6).
function ProfileHeaderSkeleton() {
  return (
    <div className="flex gap-5" aria-hidden="true">
      <div className="size-24 shrink-0 rounded-full bg-neutral-200/80" />
      <div className="flex-1 space-y-2.5 py-2">
        <div className="h-7 w-48 rounded bg-neutral-200/80" />
        <div className="h-4 w-24 rounded bg-neutral-200/80" />
        <div className="h-4 w-72 max-w-full rounded bg-neutral-200/80" />
      </div>
    </div>
  )
}
