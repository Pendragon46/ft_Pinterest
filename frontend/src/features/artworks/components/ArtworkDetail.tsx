import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, MessageCircle, Bookmark, Share2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { SilentBoundary } from '@/components/ui/SilentBoundary'
import { useAuthStore } from '@/features/auth/auth.store'
import { useRequireAuth } from '@/features/auth/useRequireAuth'
import { useToast } from '@/lib/toast.store'
import { useCompact } from '@/lib/useCompact'

import {
  artworkKeys,
  fetchArtworkComments,
  postArtworkComment,
  setArtworkLike,
  setArtworkSave,
} from '../artwork.api'
import type {
  ArtworkComment,
  ArtworkDetail as Detail,
  AuthorSummary,
} from '../artwork.types'
import { FollowButton } from './FollowButton'

// Lazy so lottie-web is code-split out of the main bundle (loaded on first like).
const HeartBurst = lazy(() => import('./HeartBurst'))

// Fixed outer height so the modal frame never changes with comment count (§3.1):
// mobile fills the viewport, desktop is a stable "~4 comments then scroll" frame.
// The scroll region absorbs the difference; the frame stays put.
const SHELL =
  'grid h-[85svh] max-h-[85svh] grid-rows-[auto_1fr] overflow-hidden rounded-xl md:h-[40rem] md:grid-cols-[1.15fr_1fr] md:grid-rows-1'

interface ArtworkDetailProps {
  artwork: Detail
  /** Present only in the modal; adds a close button. */
  onClose?: () => void
}

/** Optimistic-post rollback context: the pre-insert list + the temp row's id. */
interface CommentPostContext {
  previous: ArtworkComment[] | undefined
  tempId: string
}

// Mutating actions gated behind useRequireAuth. Comment posting is optimistic and
// cache-backed (§4); like/save/follow stay local toggles until the backend owns them.
export function ArtworkDetail({ artwork, onClose }: ArtworkDetailProps) {
  const { t } = useTranslation('common')
  const compact = useCompact()
  const requireAuth = useRequireAuth()
  const currentUser = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const toast = useToast()

  const [liked, setLiked] = useState(false)
  /** Bumped each time the user likes, to replay the heart burst. */
  const [likeBurst, setLikeBurst] = useState(0)
  const [saved, setSaved] = useState(false)
  const [shareHint, setShareHint] = useState(false)
  const [draft, setDraft] = useState('')
  const [postStatus, setPostStatus] = useState<'idle' | 'posted' | 'failed'>(
    'idle',
  )
  const composerRef = useRef<HTMLInputElement>(null)
  const shareTimerRef = useRef<number | undefined>(undefined)

  const commentsQuery = useQuery({
    queryKey: artworkKeys.comments(artwork.id),
    queryFn: () => fetchArtworkComments(artwork.id),
  })
  // The comments cache is the single source of truth: the list and the count chip
  // both read it, so an optimistic post can never make them disagree (§7).
  const comments = commentsQuery.data ?? []

  /** Author stamped on this user's own optimistic comments. */
  const selfAuthor = (): AuthorSummary | null =>
    currentUser
      ? {
          id: currentUser.id,
          username: currentUser.username,
          handle: currentUser.username,
          color: '#525252',
        }
      : null

  // §4: post straight into the comments cache so the write feels local while
  // detail and comments stay independent queries — optimistic add, rollback on
  // error (keeping the draft), reconcile the temp row with the server one.
  const postMutation = useMutation<ArtworkComment, Error, string, CommentPostContext>({
    mutationFn: (content: string) => {
      const author = selfAuthor()
      if (!author) throw new Error('unauthenticated')
      // TODO(backend): write seam — swap for POST /artworks/:id/comments.
      return postArtworkComment(artwork.id, { content, author })
    },
    onMutate: async (content: string) => {
      setPostStatus('idle')
      await queryClient.cancelQueries({
        queryKey: artworkKeys.comments(artwork.id),
      })
      const previous = queryClient.getQueryData<ArtworkComment[]>(
        artworkKeys.comments(artwork.id),
      )
      const tempId = `temp_${Date.now()}`
      const author = selfAuthor()
      if (author) {
        const optimistic: ArtworkComment = {
          id: tempId,
          author,
          content,
          likeCount: 0,
          hoursAgo: 0,
        }
        queryClient.setQueryData<ArtworkComment[]>(
          artworkKeys.comments(artwork.id),
          (old) => [optimistic, ...(old ?? [])],
        )
      }
      return { previous, tempId }
    },
    onError: (_error, content, context) => {
      // Roll the optimistic insert back and hand the draft back — but only if the
      // composer is empty, so a newer draft typed during the post isn't clobbered.
      queryClient.setQueryData<ArtworkComment[]>(
        artworkKeys.comments(artwork.id),
        (old) =>
          context?.previous ?? (old ?? []).filter((c) => c.id !== context?.tempId),
      )
      setDraft((current) => (current.length > 0 ? current : content))
      setPostStatus('failed')
      toast({
        variant: 'error',
        message: t('artwork.commentFailed'),
        action: {
          label: t('artwork.retry'),
          onClick: () => {
            // Clear the composer only if it still shows this failed comment, so a
            // retry that succeeds can't leave stale text that invites a re-post —
            // while a newer draft typed since the failure is preserved.
            setDraft((current) => (current === content ? '' : current))
            postMutation.mutate(content)
          },
        },
      })
    },
    onSuccess: () => {
      // The mock persists the comment, so a refetch returns it: invalidate to
      // reconcile with the server's canonical list (real id/timestamp) and to
      // restore anything a mid-load post interrupted — exactly the backend path.
      void queryClient.invalidateQueries({
        queryKey: artworkKeys.comments(artwork.id),
      })
      setPostStatus('posted')
      composerRef.current?.focus()
    },
  })

  // P0 — like/save are optimistic: flip now, roll back + retry-toast on error. The
  // count stays local-optimistic and reconciles on the next detail fetch.
  const applyLike = (next: boolean) => {
    setLiked(next)
    if (next) setLikeBurst((count) => count + 1)
  }
  const likeMutation = useMutation({
    mutationFn: (next: boolean) =>
      setArtworkLike({
        id: artwork.id,
        liked: next,
        loggedUser: currentUser?.id ?? '',
      }),
    // Flip in onMutate and snapshot the pre-flip value as context, so rollback
    // restores the exact prior state — never replaying the celebratory burst on an
    // un-like, and safe if two opposite toggles interleave — rather than inverting
    // this call's `next`.
    onMutate: (next: boolean) => {
      const previous = liked
      applyLike(next)
      return { previous }
    },
    onError: (_error, next, context) => {
      setLiked(context?.previous ?? !next)
      toast({
        variant: 'error',
        message: t('toast.saveFailed'),
        action: {
          label: t('artwork.retry'),
          onClick: () => {
            likeMutation.mutate(next)
          },
        },
      })
    },
  })
  const doLike = (next: boolean) => {
    likeMutation.mutate(next)
  }

  const saveMutation = useMutation({
    mutationFn: (next: boolean) =>
      setArtworkSave({
        id: artwork.id,
        saved: next,
        loggedUser: currentUser?.id ?? '',
      }),
    onMutate: (next: boolean) => {
      const previous = saved
      setSaved(next)
      return { previous }
    },
    onError: (_error, next, context) => {
      setSaved(context?.previous ?? !next)
      toast({
        variant: 'error',
        message: t('toast.saveFailed'),
        action: {
          label: t('artwork.retry'),
          onClick: () => {
            saveMutation.mutate(next)
          },
        },
      })
    },
  })
  const doSave = (next: boolean) => {
    saveMutation.mutate(next)
  }

  const handleShare = () => {
    // clipboard can reject (permission / insecure context) — never throw.
    void navigator.clipboard
      ?.writeText(`${window.location.origin}/artwork/${artwork.id}`)
      .then(() => {
        setShareHint(true)
        window.clearTimeout(shareTimerRef.current)
        shareTimerRef.current = window.setTimeout(() => {
          setShareHint(false)
        }, 1600)
      })
      .catch(() => {
        /* ignore — sharing is best-effort */
      })
  }

  // Don't let the share-hint timer fire after the detail (often a modal) unmounts.
  useEffect(() => () => window.clearTimeout(shareTimerRef.current), [])

  const handlePost = () => {
    const content = draft.trim()
    if (!content) return
    requireAuth(() => {
      if (!selfAuthor()) return // requireAuth guarantees a user; narrow for TS
      setDraft('')
      postMutation.mutate(content)
    })
  }

  const handleReply = (handle: string) => {
    requireAuth(() => {
      // Whole-token match so a handle that is a prefix of one already in the draft
      // (e.g. @sam vs @samuel) isn't wrongly treated as already mentioned.
      const mention = `@${handle}`
      setDraft((current) =>
        current.split(/\s+/).includes(mention) ? current : `${mention} ${current}`,
      )
      composerRef.current?.focus()
    })
  }

  // Count reads the same cache as the list; hidden while the list is still loading.
  const commentCount = commentsQuery.isPending ? undefined : compact(comments.length)

  return (
    <article className={SHELL}>
      {/* Placeholder color stands in for the future image (§5). */}
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
          <FollowButton userId={artwork.author.id} />
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
                  doLike(!liked)
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
              count={commentCount}
              icon={<MessageCircle aria-hidden="true" className="size-4" />}
              as="span"
            />
            <ActionChip
              active={saved}
              onClick={() => {
                requireAuth(() => {
                  doSave(!saved)
                })
              }}
              label={saved ? t('artwork.saved') : t('artwork.save')}
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
              <CommentsSkeleton />
            ) : comments.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-400">
                {t('artwork.commentsEmpty')}
              </p>
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
                          handleReply(comment.author.handle)
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

        <div className="border-t border-neutral-100 p-3">
          <div className="flex items-center gap-2">
            <input
              ref={composerRef}
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
              loading={postMutation.isPending}
              disabled={draft.trim().length === 0}
            >
              {t('artwork.post')}
            </Button>
          </div>
          {/* Success is announced politely here; failure is announced by the toast
              (role="alert"), so it isn't duplicated. */}
          <p role="status" aria-live="polite" className="sr-only">
            {postStatus === 'posted' ? t('artwork.commentPosted') : ''}
          </p>
        </div>
      </div>
    </article>
  )
}

// Shimmer placeholder block — same visual language as the canvas SkeletonCell
// (neutral base + a sweeping highlight), static under reduced motion.
function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`relative block overflow-hidden bg-neutral-200/80 ${className}`}
    >
      <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent motion-reduce:animate-none" />
    </span>
  )
}

// Placeholder comment rows: reserve the same vertical space as real comments so
// the list doesn't jump when data arrives (§3.3), matching the ~4-comment frame.
function CommentsSkeleton() {
  return (
    <ul className="mt-3 flex flex-col gap-4" aria-hidden="true">
      {[0, 1, 2, 3].map((row) => (
        <li key={row} className="flex gap-3">
          <SkeletonBlock className="size-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2 py-1">
            <SkeletonBlock className="h-3 w-1/3 rounded" />
            <SkeletonBlock className="h-3 w-3/4 rounded" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * Detail skeleton shown while the artwork itself is loading (§3.3). Mirrors the
 * final two-column shape at the same fixed height, so the modal opens at its final
 * size and fills in rather than resizing. Keeps `#artwork-title` present (sr-only)
 * so the modal's `aria-labelledby` resolves during load.
 */
export function ArtworkDetailSkeleton({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation('common')
  return (
    <article className={SHELL}>
      <SkeletonBlock className="h-44 md:h-auto" />
      <div className="flex min-h-0 flex-col">
        <h1 id="artwork-title" className="sr-only">
          {t('artwork.loading')}
        </h1>
        <header className="flex items-center gap-3 border-b border-neutral-100 p-4">
          <SkeletonBlock className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBlock className="h-3.5 w-1/3 rounded" />
            <SkeletonBlock className="h-3 w-1/4 rounded" />
          </div>
          <SkeletonBlock className="h-8 w-20 shrink-0 rounded-full" />
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
        <div className="min-h-0 flex-1 space-y-3 overflow-hidden p-4">
          <SkeletonBlock className="h-7 w-2/3 rounded" />
          <SkeletonBlock className="h-3 w-2/5 rounded" />
          <SkeletonBlock className="h-3 w-full rounded" />
          <SkeletonBlock className="h-3 w-4/5 rounded" />
          <div className="flex gap-2 pt-1">
            <SkeletonBlock className="h-6 w-16 rounded-full" />
            <SkeletonBlock className="h-6 w-16 rounded-full" />
            <SkeletonBlock className="h-6 w-16 rounded-full" />
          </div>
          <div className="pt-4">
            <CommentsSkeleton />
          </div>
        </div>
        <div className="border-t border-neutral-100 p-3">
          <SkeletonBlock className="h-9 w-full rounded-full" />
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
