import { OnlineDot } from '@/components/ui/OnlineDot'
import { colorFromId } from '@/lib/mappers'

import type { ChatUser } from '../chat.types'

interface Props {
  user: ChatUser
  size?: 'sm' | 'md'
  dot?: boolean
}

export function ChatAvatar({ user, size = 'md', dot = true }: Props) {
  const px = size === 'sm' ? 'size-8' : 'size-10'
  const label = user.fullname ?? user.username
  return (
    <span className="relative shrink-0">
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className={`${px} rounded-full object-cover`} />
      ) : (
        <span
          aria-hidden="true"
          className={`flex ${px} items-center justify-center rounded-full text-sm font-semibold text-white`}
          style={{ backgroundColor: colorFromId(user.id) }}
        >
          {label.charAt(0).toUpperCase()}
        </span>
      )}
      {dot ? <OnlineDot userId={user.id} /> : null}
    </span>
  )
}
