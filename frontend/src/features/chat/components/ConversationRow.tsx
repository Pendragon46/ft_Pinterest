import { useTranslation } from 'react-i18next'

import { useAuthStore } from '@/features/auth/auth.store'
import { formatRelative } from '@/lib/formatRelative'

import type { Conversation } from '../chat.types'
import { ChatAvatar } from './ChatAvatar'

interface Props {
  conversation: Conversation
  active: boolean
  onClick: () => void
}

export function ConversationRow({ conversation: c, active, onClick }: Props) {
  const { t, i18n } = useTranslation('common')
  const myId = useAuthStore((s) => s.user?.id)
  const other = c.otherUser
  const name = other ? (other.fullname ?? other.username) : ''
  const unread = c.unreadCount > 0

  let preview = ''
  if (c.lastMessage) {
    const mine = c.lastMessage.senderId === myId
    if (c.lastMessage.hasArtwork) {
      preview = mine ? t('chat.sharedArtworkSent') : t('chat.sharedArtworkPreview')
    } else {
      preview = (mine ? t('chat.you') : '') + (c.lastMessage.content ?? '')
    }
  }

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-label={`${t('chat.conversationWith', { name })}${
          unread ? `, ${t('chat.unread', { count: c.unreadCount })}` : ''
        }`}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 motion-reduce:transition-none ${
          active
            ? 'bg-neutral-100'
            : unread
              ? 'bg-[#a9b5ea]/15 hover:bg-neutral-50'
              : 'hover:bg-neutral-50'
        }`}
      >
        {other ? <ChatAvatar user={other} /> : null}
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span
              className={`truncate text-neutral-900 ${unread ? 'font-semibold' : 'font-medium'}`}
            >
              {name}
            </span>
            {c.lastMessage ? (
              <span className="shrink-0 text-xs text-neutral-400">
                {formatRelative(c.lastMessage.createdAt, i18n.language)}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-2">
            <span
              className={`truncate text-sm ${unread ? 'text-neutral-700' : 'text-neutral-500'}`}
            >
              {preview}
            </span>
            {unread ? (
              <span
                aria-hidden="true"
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#252c55] text-[11px] font-semibold text-white"
              >
                {c.unreadCount}
              </span>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  )
}
