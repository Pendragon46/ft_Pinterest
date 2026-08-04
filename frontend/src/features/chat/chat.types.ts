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

/** USER : ecrit par une personne. SYSTEM : evenement de l'app (amitie…). */
export type MessageKind = 'USER' | 'SYSTEM'

export interface ChatMessage {
  id: string
  conversationId: string
  /** null pour un message systeme : il n'a pas d'expediteur humain. */
  senderId: string | null
  kind: MessageKind
  /** Cle i18n rendue via t('chat.system.<key>'). Le texte n'est pas stocke. */
  systemKey: string | null
  content: string | null
  createdAt: string
  artwork: SharedArtwork | null
}

export interface Conversation {
  id: string
  otherUser: ChatUser | null
  otherLastReadAt: string | null
  lastMessage: {
    senderId: string | null
    kind: MessageKind
    systemKey: string | null
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