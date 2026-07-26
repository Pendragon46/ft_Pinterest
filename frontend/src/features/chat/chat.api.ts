import { useQuery } from '@tanstack/react-query'

import { useAuthStore } from '@/features/auth/auth.store'
import { http } from '@/lib/http'

import type {
  ChatMessage,
  ChatUser,
  Conversation,
  MessagesPage,
} from './chat.types'

export const chatKeys = {
  conversations: () => ['chat', 'conversations'] as const,
  messages: (id: string) => ['chat', 'messages', id] as const,
  mutuals: () => ['chat', 'mutuals'] as const,
}

export async function fetchConversations(): Promise<Conversation[]> {
  const { data } = await http.get<Conversation[]>('/conversations')
  return data
}

export async function openConversation(userId: string): Promise<Conversation> {
  const { data } = await http.post<Conversation>('/conversations', { userId })
  return data
}

export async function fetchMessages(
  conversationId: string,
  page = 1,
): Promise<MessagesPage> {
  const { data } = await http.get<MessagesPage>(
    `/conversations/${conversationId}/messages`,
    { params: { page, limit: 30 } },
  )
  return data
}

export async function sendMessage(input: {
  conversationId: string
  content?: string
  artworkId?: string
}): Promise<ChatMessage> {
  const { conversationId, content, artworkId } = input
  const { data } = await http.post<ChatMessage>(
    `/conversations/${conversationId}/messages`,
    { ...(content ? { content } : {}), ...(artworkId ? { artworkId } : {}) },
  )
  return data
}

export async function markRead(conversationId: string): Promise<void> {
  await http.post(`/conversations/${conversationId}/read`)
}

export async function fetchMutuals(): Promise<ChatUser[]> {
  const { data } = await http.get<ChatUser[]>('/friends')
  return data
}

// Unread badge total — derived from the inbox cache, never stored (CHAT_SPEC §5.2).
export function useUnreadTotal(): number {
  const user = useAuthStore((s) => s.user)
  const { data } = useQuery({
    queryKey: chatKeys.conversations(),
    queryFn: fetchConversations,
    enabled: user !== null,
  })
  return (data ?? []).reduce((sum, c) => sum + c.unreadCount, 0)
}
