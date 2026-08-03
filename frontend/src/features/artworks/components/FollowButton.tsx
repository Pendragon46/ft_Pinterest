import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { artworkKeys } from '@/features/artworks/artwork.api'
import { useAuthStore } from '@/features/auth/auth.store'
import { useRequireAuth } from '@/features/auth/useRequireAuth'
import { chatKeys } from '@/features/chat/chat.api'
import { fetchIsFollowing, setFollow, userKeys } from '@/features/users/user.api'
import { useToast } from '@/lib/toast.store'

interface FollowButtonProps {
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
  const [bounce, setBounce] = useState(false)
  // A late follow rejection must not toast after this button unmounts (§1.1).
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // The cache entry is the single source of truth, shared by key across every
  // FollowButton for this pair. Holding the optimistic value in component state
  // instead meant the button in the artwork modal and the one on the profile
  // behind it disagreed after a click — and clicking the stale one fired a
  // redundant request the server rejects, which the browser logs.
  const followKey = userKeys.isFollowing(currentUser?.id ?? '', userId)
  const isFollowingQuery = useQuery({
    queryKey: followKey,
    queryFn: () => fetchIsFollowing(currentUser?.id ?? '', userId),
    enabled: Boolean(currentUser),
  })
  const following = isFollowingQuery.data ?? false

  const mutation = useMutation({
    mutationFn: (next: boolean) => setFollow({ id: userId, following: next }),
    // Write the optimistic value into the cache and snapshot the prior one, then
    // restore exactly that on error (no re-bounce, and safe if opposite toggles
    // interleave) rather than inverting this call's `next`.
    onMutate: async (next: boolean) => {
      await queryClient.cancelQueries({ queryKey: followKey })
      const previous = queryClient.getQueryData<boolean>(followKey)
      queryClient.setQueryData<boolean>(followKey, next)
      if (next) {
        setBounce(true)
        window.setTimeout(() => {
          setBounce(false)
        }, 200)
      }
      return { previous }
    },
    onSuccess: (_data, next) => {
      // Confirm the deliberate (un)follow. Guarded like the error toast: a button
      // that has since unmounted must not notify from a dead surface (§1.1).
      if (!isMountedRef.current) return
      toast({
        message: next ? t('follow.nowFollowing') : t('follow.unfollowed'),
      })
    },
    onError: (_error, next, context) => {
      // Cache rollback is cache-level and must run even after unmount, so a
      // dead surface cannot leave the shared state wrong for the other button.
      queryClient.setQueryData<boolean>(followKey, context?.previous ?? !next)
      if (!isMountedRef.current) return // no toast from a dead surface (§1.1)
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
      // Reconcile the optimistic value with what the server actually persisted.
      void queryClient.invalidateQueries({ queryKey: followKey })
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
