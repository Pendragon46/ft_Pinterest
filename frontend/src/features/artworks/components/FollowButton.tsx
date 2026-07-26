import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { artworkKeys } from '@/features/artworks/artwork.api'
import { useAuthStore } from '@/features/auth/auth.store'
import { chatKeys } from '@/features/chat/chat.api'
import { useRequireAuth } from '@/features/auth/useRequireAuth'
import { fetchIsFollowing, setFollow, userKeys } from '@/features/users/user.api'
import { useToast } from '@/lib/toast.store'

interface FollowButtonProps {
  /** The user to follow (mock: the artwork's author). */
  userId: string
}

const BASE =
  'inline-flex h-9 cursor-pointer items-center justify-center rounded-xl px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 motion-reduce:transition-none'

// P1 — Follow (filled, inviting) → Following (outline, quiet): the filled→outline
// swap is the signal; a brief settle bounce confirms the tap landed. Hover/focus on
// "Following" reveals "Unfollow" so un-following is deliberate. Optimistic (P0):
// the state flips immediately and rolls back with a retry toast on error.
export function FollowButton({ userId }: FollowButtonProps) {
  const { t } = useTranslation('common')
  const requireAuth = useRequireAuth()
  const currentUser = useAuthStore((state) => state.user)
  const toast = useToast()
  const queryClient = useQueryClient()
  // Optimistic override; null means "defer to the backend's persisted state".
  const [followOverride, setFollowOverride] = useState<boolean | null>(null)
  const [bounce, setBounce] = useState(false)
  // A late follow rejection must not toast after this button unmounts (§1.1).
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Initial follow state from the backend, so a reload reflects what's
  // persisted; it seeds the optimistic toggle below.
  const isFollowingQuery = useQuery({
    queryKey: ['users', 'isFollowing', currentUser?.id, userId],
    queryFn: () => fetchIsFollowing(currentUser?.id ?? '', userId),
    enabled: Boolean(currentUser),
  })
  // Derived: an in-flight optimistic choice wins, else the persisted state.
  const following = followOverride ?? isFollowingQuery.data ?? false

  const flip = (next: boolean) => {
    setFollowOverride(next)
    if (next) {
      setBounce(true)
      window.setTimeout(() => {
        setBounce(false)
      }, 200)
    }
  }

  const mutation = useMutation({
    mutationFn: (next: boolean) => setFollow({ id: userId, following: next }),
    // Flip in onMutate and snapshot the prior value as context, then restore that
    // exact value on error (no re-bounce, and safe if opposite toggles interleave)
    // rather than inverting this call's `next`.
    onMutate: (next: boolean) => {
      const previous = following
      flip(next)
      return { previous }
    },
    onError: (_error, next, context) => {
      if (!isMountedRef.current) return // no rollback/toast from a dead surface (§1.1)
      setFollowOverride(context?.previous ?? !next)
      toast({
        variant: 'error',
        message: t('toast.saveFailed'),
        action: {
          label: t('artwork.retry'),
          onClick: () => {
            mutation.mutate(next)
          },
        },
      })
    },
    onSettled: () => {
      // Counts on both profiles must refresh after a (un)follow.
      void queryClient.invalidateQueries({
        queryKey: userKeys.followerCount(userId),
      })
      if (currentUser) {
        void queryClient.invalidateQueries({
          queryKey: userKeys.followingCount(currentUser.id),
        })
        // Following someone reshuffles the signed-in home feed.
        void queryClient.invalidateQueries({ queryKey: artworkKeys.feed() })
        // A follow can make (or break) a mutual: refresh who can be messaged.
        void queryClient.invalidateQueries({ queryKey: chatKeys.mutuals() })
      }
    },
  })

  const onClick = () => {
    requireAuth(() => {
      mutation.mutate(!following)
    })
  }

  if (!following) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${BASE} bg-neutral-900 text-white hover:bg-neutral-800 active:bg-neutral-950`}
      >
        {t('artwork.follow')}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${BASE} group border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 ${
        bounce ? 'animate-settle' : ''
      } motion-reduce:animate-none`}
    >
      {/* Two labels stacked in one grid cell: the grid reserves the wider label's
          width so the hover/focus swap never shifts layout. */}
      <span className="grid">
        <span className="col-start-1 row-start-1 group-hover:invisible group-focus-visible:invisible">
          {t('artwork.following')}
        </span>
        <span className="invisible col-start-1 row-start-1 group-hover:visible group-focus-visible:visible">
          {t('artwork.unfollow')}
        </span>
      </span>
    </button>
  )
}
