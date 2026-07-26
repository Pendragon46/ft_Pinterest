export interface ChatUser {
  id: string
  username: string
  fullname: string | null
  avatarUrl: string
}

export interface SharedArtwork {
  id: string
  title: string
  mediaUrl: string | null
  author: { id: string; username: string; fullname: string | null }
}

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  content: string | null
  createdAt: string
  artwork: SharedArtwork | null
}

export interface Conversation {
  id: string
  otherUser: ChatUser | null
  otherLastReadAt: string | null
  lastMessage: {
    senderId: string
    content: string | null
    hasArtwork: boolean
    createdAt: string
  } | null
  unreadCount: number
  updatedAt: string
}

export interface MessagesPage {
  items: ChatMessage[]
  page: number
  hasMore: boolean
}
