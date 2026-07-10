import { lazy, Suspense, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Heart, MessageCircle, Bookmark, Share2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { SilentBoundary } from '@/components/ui/SilentBoundary'
import { Spinner } from '@/components/ui/Spinner'
import { useAuthStore } from '@/features/auth/auth.store'
import { useRequireAuth } from '@/features/auth/useRequireAuth'

import { artworkKeys, fetchArtworkComments } from '../artwork.api'
import type { ArtworkComment, ArtworkDetail as Detail } from '../artwork.types'

// Lazy so lottie-web is code-split out of the main bundle (loaded on first like).
const HeartBurst = lazy(() => import('./HeartBurst'))

interface ArtworkDetailProps {
  artwork: Detail
  /** Present only in the modal; adds a close button. */
  onClose?: () => void
}

// Localized compact view counts (12000 → "12K").
function useCompact() {
  const { i18n } = useTranslation()
  return (value: number) =>
    new Intl.NumberFormat(i18n.language, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
}

// Mutating actions gated behind useRequireAuth; counts are static placeholders.
export function ArtworkDetail({ artwork, onClose }: ArtworkDetailProps) {
  const { t } = useTranslation('common')
  const compact = useCompact()
  const requireAuth = useRequireAuth()
  const currentUser = useAuthStore((state) => state.user)

  const [liked, setLiked] = useState(false)
  /** Bumped each time the user likes, to replay the heart burst. */
  const [likeBurst, setLikeBurst] = useState(0)
  const [saved, setSaved] = useState(false)
  const [following, setFollowing] = useState(false)
  const [shareHint, setShareHint] = useState(false)
  const [draft, setDraft] = useState('')
  /** Comments posted this session, prepended to the fetched list. */
  const [posted, setPosted] = useState<ArtworkComment[]>([])

  const commentsQuery = useQuery({
    queryKey: artworkKeys.comments(artwork.id),
    queryFn: () => fetchArtworkComments(artwork.id),
  })

  const handleShare = () => {
    // clipboard can reject (permission / insecure context) — never throw.
    void navigator.clipboard
      ?.writeText(`${window.location.origin}/artwork/${artwork.id}`)
      .then(() => {
        setShareHint(true)
        window.setTimeout(() => {
          setShareHint(false)
        }, 1600)
      })
      .catch(() => {
        /* ignore — sharing is best-effort */
      })
  }

  const handlePost = () => {
    const content = draft.trim()
    if (!content) return
    requireAuth(() => {
      if (!currentUser) return // type-narrowing; requireAuth guarantees it
      // TODO(backend): POST /artworks/:id/comments via a TanStack mutation,
      // then invalidate artworkKeys.comments(id). For now, echo locally.
      setPosted((prev) => [
        {
          id: `local_${Date.now()}`,
          author: {
            id: currentUser.id,
            username: currentUser.username,
            handle: currentUser.username,
            color: '#525252',
          },
          content,
          likeCount: 0,
          hoursAgo: 0,
        },
        ...prev,
      ])
      setDraft('')
    })
  }

  const comments = [...posted, ...(commentsQuery.data ?? [])]

  return (
    <article className="grid max-h-[85svh] grid-rows-[auto_1fr] overflow-hidden rounded-xl md:grid-cols-[1.15fr_1fr] md:grid-rows-1">
      {/* Placeholder color stands in for the future image. */}
      <div
        className="relative flex h-44 items-end justify-start p-5 md:h-auto"
        style={{ backgroundColor: artwork.color }}
      >
        <span className="font-serif text-sm uppercase tracking-[0.35em] text-white/70">
          {t(`category.${artwork.category}`)}
        </span>
      </div>

      <div className="flex min-h-0 flex-col">
        <header className="flex items-center gap-3 border-b border-neutral-100 p-4">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: artwork.author.color }}
          >
            {artwork.author.username.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-neutral-900">
              {artwork.author.username}
            </p>
            <p className="truncate text-sm text-neutral-500">
              @{artwork.author.handle}
            </p>
          </div>
          <Button
            variant={following ? 'outline' : 'primary'}
            size="sm"
            onClick={() => {
              requireAuth(() => {
                setFollowing((value) => !value)
              })
            }}
          >
            {following ? t('artwork.following') : t('artwork.follow')}
          </Button>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label={t('artwork.close')}
              className="flex cursor-pointer size-9 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 motion-reduce:transition-none"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <h1 id="artwork-title" className="font-serif text-2xl text-neutral-900">
            {artwork.title}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {t('artwork.views', { views: compact(artwork.viewCount) })} ·{' '}
            {t(`category.${artwork.category}`)}
          </p>

          {artwork.description ? (
            <p className="mt-3 text-neutral-700">{artwork.description}</p>
          ) : null}

          <ul className="mt-3 flex flex-wrap gap-2">
            {artwork.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600"
              >
                #{tag}
              </li>
            ))}
          </ul>

          {/* Like/Save toggle locally; counts stay static until the backend owns them. */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-y border-neutral-100 py-3">
            <ActionChip
              active={liked}
              onClick={() => {
                requireAuth(() => {
                  const next = !liked
                  setLiked(next)
                  if (next) setLikeBurst((count) => count + 1)
                })
              }}
              label={liked ? t('artwork.liked') : t('artwork.like')}
              count={compact(artwork.likeCount + (liked ? 1 : 0))}
              icon={
                <span className="relative inline-flex">
                  <Heart aria-hidden="true" className={liked ? "size-4 text-red-500" : "size-4"} fill={liked ? "currentColor" : "none"} />
                  {likeBurst > 0 ? (
                    <SilentBoundary key={likeBurst}>
                      <Suspense fallback={null}>
                        <HeartBurst />
                      </Suspense>
                    </SilentBoundary>
                  ) : null}
                </span>
              }
            />
            <ActionChip
              active={false}
              onClick={() => undefined}
              label={t('artwork.commentsTitle')}
              count={compact(artwork.commentCount)}
              icon={<MessageCircle aria-hidden="true" className="size-4" />}
              as="span"
            />
            <ActionChip
              active={saved}
              onClick={() => {
                requireAuth(() => {
                  setSaved((value) => !value)
                })
              }}
              label={t('artwork.saved')}
              icon={<Bookmark aria-hidden="true" className="size-4" fill={saved ? "currentColor" : "none"} />}
            />
            <div className="relative ms-auto">
              <ActionChip
                active={false}
                onClick={handleShare}
                label={t('artwork.share')}
                icon={<Share2 aria-hidden="true" className="size-4" />}
              />
              {shareHint ? (
                <span
                  role="status"
                  className="absolute bottom-full end-0 mb-1 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs text-white"
                >
                  {t('artwork.linkCopied')}
                </span>
              ) : null}
            </div>
          </div>

          <section className="mt-4">
            <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {t('artwork.commentsTitle')}
            </h2>
            {commentsQuery.isPending ? (
              <div className="flex justify-center py-6 text-neutral-400">
                <Spinner size="md" />
              </div>
            ) : (
              <ul className="mt-3 flex flex-col gap-4">
                {comments.map((comment) => (
                  <li key={comment.id} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: comment.author.color }}
                    >
                      {comment.author.username.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm">
                        <span className="font-serif text-neutral-900">
                          {comment.author.username}
                        </span>{' '}
                        <span className="text-neutral-400">
                          ·{' '}
                          {comment.hoursAgo === 0
                            ? t('artwork.timeNow')
                            : t('artwork.timeHours', { hours: comment.hoursAgo })}
                        </span>
                      </p>
                      <p className="text-neutral-700">{comment.content}</p>
                      <button
                        type="button"
                        onClick={() => {
                          requireAuth(() => undefined)
                        }}
                        className="mt-0.5 cursor-pointer text-xs text-neutral-400 transition-colors hover:text-neutral-700 focus-visible:outline-none focus-visible:underline motion-reduce:transition-none"
                      >
                        {t('artwork.reply')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex items-center gap-2 border-t border-neutral-100 p-3">
          <input
            type="text"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handlePost()
              }
            }}
            placeholder={t('artwork.commentPlaceholder')}
            aria-label={t('artwork.commentPlaceholder')}
            className="min-w-0 flex-1 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white motion-reduce:transition-none"
          />
          <Button
            size="sm"
            onClick={handlePost}
            disabled={draft.trim().length === 0}
          >
            {t('artwork.post')}
          </Button>
        </div>
      </div>
    </article>
  )
}

interface ActionChipProps {
  active: boolean
  onClick: () => void
  label: string
  count?: string
  icon: ReactNode
  /** 'span' for the non-interactive comment counter. */
  as?: 'button' | 'span'
}

function ActionChip({
  active,
  onClick,
  label,
  count,
  icon,
  as = 'button',
}: ActionChipProps) {
  const className = `inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors motion-reduce:transition-none ${
    active
      ? 'bg-neutral-900 text-white'
      : 'text-neutral-600 hover:bg-neutral-100'
  }`
  const content = (
    <>
      {icon}
      <span>{label}</span>
      {count ? <span className="text-xs opacity-70">{count}</span> : null}
    </>
  )
  if (as === 'span') {
    return <span className={className}>{content}</span>
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${className} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2`}
    >
      {content}
    </button>
  )
}
