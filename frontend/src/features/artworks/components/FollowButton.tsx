import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useAuthStore } from '@/features/auth/auth.store'
import { useRequireAuth } from '@/features/auth/useRequireAuth'
import { setFollow } from '@/features/users/user.api'
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
  const [following, setFollowing] = useState(false)
  const [bounce, setBounce] = useState(false)

  const flip = (next: boolean) => {
    setFollowing(next)
    if (next) {
      setBounce(true)
      window.setTimeout(() => {
        setBounce(false)
      }, 200)
    }
  }

  const mutation = useMutation({
    mutationFn: (next: boolean) =>
      setFollow({ id: userId, following: next, loggedUser: currentUser?.id ?? '' }),
    onError: (_error, next) => {
      setFollowing(!next) // roll back the optimistic flip
      toast({
        variant: 'error',
        message: t('toast.saveFailed'),
        action: {
          label: t('artwork.retry'),
          onClick: () => {
            flip(next)
            mutation.mutate(next)
          },
        },
      })
    },
  })

  const onClick = () => {
    requireAuth(() => {
      const next = !following
      flip(next)
      mutation.mutate(next)
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
