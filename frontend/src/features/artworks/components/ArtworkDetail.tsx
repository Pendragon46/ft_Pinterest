import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, MessageCircle, Pencil, Share2, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { OnlineDot } from '@/components/ui/OnlineDot'
import { SilentBoundary } from '@/components/ui/SilentBoundary'
import { useAuthStore } from '@/features/auth/auth.store'
import { useRequireAuth } from '@/features/auth/useRequireAuth'
import { userKeys } from '@/features/users/user.api'
import { useToast } from '@/lib/toast.store'
import { useCompact } from '@/lib/useCompact'

import {
  artworkKeys,
  deleteArtworkComment,
  fetchArtworkComments,
  fetchIsLiked,
  postArtworkComment,
  setArtworkLike,
} from '../artwork.api'
import type {
  ArtworkComment,
  ArtworkDetail as Detail,
  AuthorSummary,
} from '../artwork.types'
import { DeleteArtworkDialog } from './DeleteArtworkDialog'
import { FollowButton } from './FollowButton'

// Lazy so lottie-web is code-split out of the main bundle (loaded on first like).
const HeartBurst = lazy(() =>
  import('./HeartBurst').then((m) => ({ default: m.HeartBurst })),
)

// Fixed outer height so the modal frame doesn't change with comment count.
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

export function ArtworkDetail({ artwork, onClose }: ArtworkDetailProps) {
  const { t } = useTranslation('common')
  const compact = useCompact()
  const requireAuth = useRequireAuth()
  const currentUser = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const isOwner = currentUser?.id === artwork.author.id
  const [deleteOpen, setDeleteOpen] = useState(false)

  const onDeleted = () => {
    const authorId = artwork.author.id
    queryClient.removeQueries({ queryKey: artworkKeys.detail(artwork.id) })
    queryClient.removeQueries({ queryKey: artworkKeys.comments(artwork.id) })
    void queryClient.invalidateQueries({ queryKey: userKeys.works(authorId) })
    void queryClient.invalidateQueries({ queryKey: userKeys.profile(authorId) })
    void queryClient.invalidateQueries({ queryKey: userKeys.liked(authorId) })
    void queryClient.invalidateQueries({ queryKey: artworkKeys.feed() })
    if (onClose) onClose()
    else navigate(`/profile/${authorId}`)
  }

  // Optimistic override; null means "defer to the backend's persisted state".
  const [likeOverride, setLikeOverride] = useState<boolean | null>(null)
  /** Bumped each time the user likes, to replay the heart burst. */
  const [likeBurst, setLikeBurst] = useState(0)
  const [shareHint, setShareHint] = useState(false)
  const [draft, setDraft] = useState('')
  const [postStatus, setPostStatus] = useState<'idle' | 'posted' | 'failed'>(
    'idle',
  )
  const composerRef = useRef<HTMLInputElement>(null)
  const shareTimerRef = useRef<number | undefined>(undefined)
  // Guards post-unmount UI side effects (toasts): a mutation that rejects after
  // the detail (often a modal) closes must not toast on an unrelated page (§1.1).
  const isMountedRef = useRef(true)

  const commentsQuery = useQuery({
    queryKey: artworkKeys.comments(artwork.id),
    queryFn: () => fetchArtworkComments(artwork.id),
  })
  const comments = commentsQuery.data ?? []

  const isLikedQuery = useQuery({
    queryKey: ['artworks', 'isLiked', artwork.id, currentUser?.id],
    queryFn: () => fetchIsLiked(artwork.id, currentUser?.id ?? ''),
    enabled: Boolean(currentUser),
  })
  const persistedLiked = isLikedQuery.data ?? false
  const liked = likeOverride ?? persistedLiked
  // likeCount already counts the current user's like, so adjust by the delta
  // between the optimistic choice and what's persisted — never a flat +1.
  const likeDisplay = Math.max(
    0,
    artwork.likeCount - (persistedLiked ? 1 : 0) + (liked ? 1 : 0),
  )

  /** Author stamped on this user's own optimistic comments. */
  const selfAuthor = (): AuthorSummary | null =>
    currentUser
      ? {
          id: currentUser.id,
          username: currentUser.username,
          handle: currentUser.username,
          color: '#525252',
          avatarUrl: currentUser.avatarUrl ?? null,
        }
      : null

  // §4: post straight into the comments cache so the write feels local while
  // detail and comments stay independent queries — optimistic add, rollback on
  // error (keeping the draft), reconcile the temp row with the server one.
  const postMutation = useMutation<ArtworkComment, Error, string, CommentPostContext>({
    mutationFn: (content: string) =>
      postArtworkComment(artwork.id, { content }),
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
      // Cache rollback is cache-level and must run even after unmount, so the
      // optimistic row can't linger and reappear when the artwork reopens.
      queryClient.setQueryData<ArtworkComment[]>(
        artworkKeys.comments(artwork.id),
        (old) =>
          context?.previous ?? (old ?? []).filter((c) => c.id !== context?.tempId),
      )
      // UI side effects only while mounted: no toast/retry from a dead surface (§1.1).
      if (!isMountedRef.current) return
      // Hand the draft back — but only if the composer is empty, so a newer draft
      // typed during the post isn't clobbered.
      setDraft((current) => (current.length > 0 ? current : content))
      setPostStatus('failed')
      toast({
        variant: 'error',
        message: t('artwork.commentFailed'),
        action: {
          label: t('artwork.retry'),
          onClick: () => {
            if (postMutation.isPending) return // no-op while a post is in flight (§2.5)
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
      // Refetch to reconcile the temp row with the server's canonical comment
      // (real id/timestamp/author) and restore anything a mid-load post
      // interrupted.
      void queryClient.invalidateQueries({
        queryKey: artworkKeys.comments(artwork.id),
      })
      // The comment count also lives on the detail (once the T2 include lands).
      void queryClient.invalidateQueries({
        queryKey: artworkKeys.detail(artwork.id),
      })
      setPostStatus('posted')
      composerRef.current?.focus()
    },
  })

  // P0 — like/save are optimistic: flip now, roll back + retry-toast on error. The
  // count stays local-optimistic and reconciles on the next detail fetch.
  const applyLike = (next: boolean) => {
    setLikeOverride(next)
    if (next) setLikeBurst((count) => count + 1)
  }
  const likeMutation = useMutation({
    mutationFn: (next: boolean) =>
      setArtworkLike({ id: artwork.id, liked: next }),
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
      if (!isMountedRef.current) return // no rollback/toast from a dead surface (§1.1)
      setLikeOverride(context?.previous ?? !next)
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
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: artworkKeys.detail(artwork.id),
      })
      // Refetch the persisted "liked" state too, else the count formula keeps a
      // stale base and double-counts (shows 2 for a single like).
      void queryClient.invalidateQueries({
        queryKey: ['artworks', 'isLiked', artwork.id],
      })
      void queryClient.invalidateQueries({ queryKey: ['users', 'liked'] })
    },
  })
  const doLike = (next: boolean) => {
    likeMutation.mutate(next)
  }

  // Delete one of the user's own comments; the server enforces ownership (403).
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      deleteArtworkComment(artwork.id, commentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: artworkKeys.comments(artwork.id),
      })
      void queryClient.invalidateQueries({
        queryKey: artworkKeys.detail(artwork.id),
      })
    },
    onError: () => {
      if (!isMountedRef.current) return
      toast({ variant: 'error', message: t('toast.saveFailed') })
    },
  })

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

  // Track mount so a late mutation rejection doesn't toast from a dead surface.
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const handlePost = () => {
    // Enter and the retry toast bypass the Post button's disabled state; bail
    // while a post is in flight so concurrent posts can't clobber each other (§2.5).
    if (postMutation.isPending) return
    const content = draft.trim()
    // Le serveur exige 3 caractères (@MinLength(3)) : refuser plus tôt côté
    // client évite un aller-retour en 400 sur Entrée comme sur le bouton.
    if (content.length < 3) return
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
      {/* Media: the uploaded image/video when present, else a colour placeholder
          standing in for the future image (§5). */}
      <div
        className="relative flex h-44 items-end justify-start overflow-hidden p-5 md:h-auto"
        style={artwork.mediaUrl ? undefined : { backgroundColor: artwork.color }}
      >
        {artwork.mediaUrl ? (
          artwork.mediaType === 'video' ? (
            <video
              src={artwork.mediaUrl}
              autoPlay
              muted
              loop
              controls
              playsInline
              className="absolute inset-0 size-full bg-black object-contain"
            />
          ) : (
            <img
              src={artwork.mediaUrl}
              alt={artwork.title}
              className="absolute inset-0 size-full object-cover"
            />
          )
        ) : artwork.category ? (
          <span className="font-serif text-sm uppercase tracking-[0.35em] text-white/70">
            {t(`category.${artwork.category}`)}
          </span>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-col">
        <header className="flex items-center gap-3 border-b border-neutral-100 p-4">
          {/* Avatar + name open the author's profile. */}
          <Link
            to={`/profile/${artwork.author.id}`}
            className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            <span className="relative shrink-0">
              {artwork.author.avatarUrl ? (
                <img
                  src={artwork.author.avatarUrl}
                  alt={artwork.author.username}
                  className="size-10 rounded-full object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex size-10 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: artwork.author.color }}
                >
                  {artwork.author.username.charAt(0).toUpperCase()}
                </span>
              )}
              <OnlineDot userId={artwork.author.id} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-serif text-neutral-900 group-hover:underline">
                {artwork.author.username}
              </p>
              <p className="truncate text-sm text-neutral-500">
                @{artwork.author.handle}
              </p>
            </div>
          </Link>
          {isOwner ? (
            <div className="flex shrink-0 items-center gap-2">
              <Link
                to={`/artwork/${artwork.id}/edit`}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-neutral-300 px-4 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                <Pencil aria-hidden="true" className="size-4" />
                {t('actions.edit')}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setDeleteOpen(true)
                }}
                aria-label={t('artwork.delete')}
                className="flex size-9 cursor-pointer items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 motion-reduce:transition-none"
              >
                <Trash2 aria-hidden="true" className="size-5" />
              </button>
            </div>
          ) : (
            <FollowButton userId={artwork.author.id} />
          )}
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
          {artwork.category ? (
            <p className="mt-1 text-sm text-neutral-500">
              {t(`category.${artwork.category}`)}
            </p>
          ) : null}

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

          <div className="mt-4 flex flex-wrap items-center gap-2 border-y border-neutral-100 py-3">
            <ActionChip
              active={liked}
              onClick={() => {
                requireAuth(() => {
                  doLike(!liked)
                })
              }}
              label={liked ? t('artwork.liked') : t('artwork.like')}
              count={compact(likeDisplay)}
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
            <div className="relative ms-auto">
              <ActionChip
                active={false}
                onClick={handleShare}
                label={t('artwork.share')}
                icon={<Share2 aria-hidden="true" className="size-4" />}
              />
              {/* Always-mounted live region so the announcement fires reliably —
                  SRs skip a region injected together with its text (§2.2). */}
              <span role="status" aria-live="polite" className="sr-only">
                {shareHint ? t('artwork.linkCopied') : ''}
              </span>
              {/* Visible tooltip for sighted users; decorative (the live region
                  above carries the announcement). */}
              {shareHint ? (
                <span
                  aria-hidden="true"
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
                    {comment.author.avatarUrl ? (
                      <img
                        src={comment.author.avatarUrl}
                        alt={comment.author.username}
                        className="size-8 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: comment.author.color }}
                      >
                        {comment.author.username.charAt(0).toUpperCase()}
                      </span>
                    )}
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
                      <div className="mt-0.5 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            handleReply(comment.author.handle)
                          }}
                          className="cursor-pointer text-xs text-neutral-400 transition-colors hover:text-neutral-700 focus-visible:outline-none focus-visible:underline motion-reduce:transition-none"
                        >
                          {t('artwork.reply')}
                        </button>
                        {comment.author.id === currentUser?.id &&
                        !comment.id.startsWith('temp_') ? (
                          <button
                            type="button"
                            onClick={() => {
                              deleteCommentMutation.mutate(comment.id)
                            }}
                            className="cursor-pointer text-xs text-neutral-400 transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:underline motion-reduce:transition-none"
                          >
                            {t('artwork.deleteComment')}
                          </button>
                        ) : null}
                      </div>
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
              disabled={draft.trim().length < 3}
            >
              {t('artwork.post')}
            </Button>
          </div>
          {/* Explique le bouton grisé plutôt que de laisser l'utilisateur deviner :
              visible seulement quand il a commencé à taper mais reste sous 3. */}
          {draft.trim().length > 0 && draft.trim().length < 3 ? (
            <p className="mt-1.5 px-1 text-xs text-neutral-500">
              {t('artwork.commentMinLength')}
            </p>
          ) : null}
          {/* Success is announced politely here; failure is announced by the toast
              (role="alert"), so it isn't duplicated. */}
          <p role="status" aria-live="polite" className="sr-only">
            {postStatus === 'posted' ? t('artwork.commentPosted') : ''}
          </p>
        </div>
      </div>
      <DeleteArtworkDialog
        artwork={deleteOpen ? { id: artwork.id, title: artwork.title } : null}
        onClose={() => {
          setDeleteOpen(false)
        }}
        onDeleted={onDeleted}
      />
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
