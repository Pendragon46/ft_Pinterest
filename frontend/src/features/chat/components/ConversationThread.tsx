import { Fragment, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Spinner } from '@/components/ui/Spinner'
import { useAuthStore } from '@/features/auth/auth.store'
import { useIsOnline } from '@/features/presence/presence.store'
import { formatDayLabel, formatTime } from '@/lib/formatRelative'

import {
  chatKeys,
  fetchConversations,
  fetchMessages,
  markRead,
} from '../chat.api'
import { useChatStore } from '../chat.store'
import type { Conversation } from '../chat.types'
import { ChatAvatar } from './ChatAvatar'
import { DateSeparator } from './DateSeparator'
import { MessageBubble } from './MessageBubble'
import { MessageComposer } from './MessageComposer'
import { TypingIndicator } from './TypingIndicator'

interface Props {
  conversationId: string
  onBack: () => void
}

export function ConversationThread({ conversationId, onBack }: Props) {
  const { t, i18n } = useTranslation('common')
  const myId = useAuthStore((s) => s.user?.id ?? '')
  const queryClient = useQueryClient()
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickBottomRef = useRef(true)

  const convosQuery = useQuery({
    queryKey: chatKeys.conversations(),
    queryFn: fetchConversations,
  })
  const conversation =
    convosQuery.data?.find((c) => c.id === conversationId) ?? null
  const other = conversation?.otherUser ?? null
  const otherName = other ? (other.fullname ?? other.username) : ''
  const online = useIsOnline(other?.id ?? '')
  const isTyping = useChatStore((s) => s.typing[conversationId] ?? false)

  const messagesQuery = useInfiniteQuery({
    queryKey: chatKeys.messages(conversationId),
    queryFn: ({ pageParam }) => fetchMessages(conversationId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  })

  // Pages are newest-first; flatten then reverse → oldest-first for display.
  const ordered = useMemo(
    () => (messagesQuery.data?.pages ?? []).flatMap((p) => p.items).reverse(),
    [messagesQuery.data],
  )
  const newestId = ordered.length ? ordered[ordered.length - 1].id : null

  // Clear unread on open and whenever a newer message lands while viewing.
  // The server call alone is not enough: the badge is summed from the cached
  // conversation list (useUnreadTotal), so without writing the count back the
  // user reads the message and the badge keeps showing it as unread until the
  // list happens to refetch. The .catch also keeps a failed read receipt from
  // surfacing as an unhandled rejection in the console.
  useEffect(() => {
    if (!newestId) return
    markRead(conversationId)
      .then(() => {
        queryClient.setQueryData<Conversation[]>(
          chatKeys.conversations(),
          (prev) =>
            prev?.map((c) =>
              c.id === conversationId ? { ...c, unreadCount: 0 } : c,
            ),
        )
      })
      .catch(() => {
        // A read receipt is not worth interrupting the user over.
      })
  }, [conversationId, newestId, queryClient])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    stickBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el && stickBottomRef.current) el.scrollTop = el.scrollHeight
  }, [ordered.length, isTyping])

  const lastMine = [...ordered].reverse().find((m) => m.senderId === myId)
  const showRead =
    lastMine != null &&
    conversation?.otherLastReadAt != null &&
    new Date(conversation.otherLastReadAt).getTime() >=
      new Date(lastMine.createdAt).getTime()

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-neutral-100 px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('chat.back')}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
        >
          <ChevronLeft aria-hidden="true" className="size-5 rtl:rotate-180" />
        </button>
        {other ? <ChatAvatar user={other} size="sm" /> : null}
        <div className="min-w-0 flex-1">
          <Link
            id="chat-title"
            to={`/profile/${other?.id ?? ''}`}
            aria-label={t('chat.viewProfile', { name: otherName })}
            className="block truncate font-serif text-neutral-900 hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {otherName}
          </Link>
          {online ? (
            <p className="text-xs text-green-600">{t('chat.online')}</p>
          ) : null}
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
      >
        {messagesQuery.hasNextPage ? (
          <div className="mb-2 flex justify-center">
            <button
              type="button"
              onClick={() => void messagesQuery.fetchNextPage()}
              disabled={messagesQuery.isFetchingNextPage}
              className="rounded-full px-3 py-1 text-xs text-neutral-500 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
            >
              {t('chat.loadMore')}
            </button>
          </div>
        ) : null}

        {messagesQuery.isPending ? (
          <div role="status" className="grid place-items-center py-10">
            <Spinner size="sm" />
            <span className="sr-only">{t('chat.loadingMessages')}</span>
          </div>
        ) : ordered.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-400">
            {t('chat.emptyThread')}
          </p>
        ) : (
          <ul
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            className="flex flex-col gap-2"
          >
            {ordered.map((m, i) => {
              const prev = ordered[i - 1]
              const showDay =
                !prev ||
                new Date(prev.createdAt).toDateString() !==
                  new Date(m.createdAt).toDateString()
              return (
                <Fragment key={m.id}>
                  {showDay ? (
                    <DateSeparator
                      label={formatDayLabel(
                        m.createdAt,
                        i18n.language,
                        t('chat.today'),
                        t('chat.yesterday'),
                      )}
                    />
                  ) : null}
                  <MessageBubble
                    message={m}
                    mine={m.senderId === myId}
                    senderName={otherName}
                  />
                </Fragment>
              )
            })}
          </ul>
        )}

        {isTyping ? <TypingIndicator name={otherName} /> : null}

        {showRead && conversation?.otherLastReadAt ? (
          <p className="mt-1 text-end text-xs text-neutral-400">
            {t('chat.readAt', {
              time: formatTime(conversation.otherLastReadAt, i18n.language),
            })}
          </p>
        ) : null}
      </div>

      <MessageComposer conversationId={conversationId} otherUserId={other?.id} />
    </div>
  )
}
