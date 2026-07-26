import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { type InfiniteData, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/features/auth/auth.store'
import { connectSocket } from '@/features/presence/socket'

import { chatKeys, markRead } from './chat.api'
import { useChatStore } from './chat.store'
import type { ChatMessage, Conversation, MessagesPage } from './chat.types'

interface NewMessageEvent {
  conversationId: string
  message: ChatMessage
}
interface ReadEvent {
  conversationId: string
  userId: string
  readAt: string
}

// Ties the chat streams to the auth lifecycle, mirroring PresenceProvider.
export function ChatProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user) return
    // connectSocket is idempotent; calling it here guarantees the socket even
    // though this child effect runs before PresenceProvider's (React fires
    // passive effects bottom-up) — CHAT_SPEC §5.3 ordering fix.
    const socket = connectSocket()
    if (!socket) return
    const myId = user.id

    const seed = () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversations() })
    }
    seed()

    const onNewMessage = ({ conversationId, message }: NewMessageEvent) => {
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        chatKeys.messages(conversationId),
        (prev) => {
          if (!prev) return prev
          const [first, ...rest] = prev.pages
          if (!first || first.items.some((m) => m.id === message.id)) return prev
          return {
            ...prev,
            pages: [{ ...first, items: [message, ...first.items] }, ...rest],
          }
        },
      )

      const { open, activeId } = useChatStore.getState()
      const viewing = open && activeId === conversationId
      const isMine = message.senderId === myId

      queryClient.setQueryData<Conversation[]>(
        chatKeys.conversations(),
        (prev) => {
          if (!prev) return prev
          const idx = prev.findIndex((c) => c.id === conversationId)
          if (idx === -1) {
            seed()
            return prev
          }
          const bumped: Conversation = {
            ...prev[idx],
            lastMessage: {
              senderId: message.senderId,
              content: message.content,
              hasArtwork: message.artwork !== null,
              createdAt: message.createdAt,
            },
            unreadCount:
              isMine || viewing
                ? prev[idx].unreadCount
                : prev[idx].unreadCount + 1,
            updatedAt: message.createdAt,
          }
          return [bumped, ...prev.slice(0, idx), ...prev.slice(idx + 1)]
        },
      )

      if (viewing && !isMine) void markRead(conversationId)
    }

    const onRead = ({ conversationId, readAt }: ReadEvent) => {
      queryClient.setQueryData<Conversation[]>(
        chatKeys.conversations(),
        (prev) =>
          prev?.map((c) =>
            c.id === conversationId ? { ...c, otherLastReadAt: readAt } : c,
          ),
      )
    }

    socket.on('message:new', onNewMessage)
    socket.on('conversation:read', onRead)
    socket.on('connect', seed)
    return () => {
      socket.off('message:new', onNewMessage)
      socket.off('conversation:read', onRead)
      socket.off('connect', seed)
    }
  }, [user, queryClient])

  return <>{children}</>
}
