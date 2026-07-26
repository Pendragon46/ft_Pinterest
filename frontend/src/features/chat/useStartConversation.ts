import { useMutation, useQueryClient } from '@tanstack/react-query'

import { chatKeys, openConversation, sendMessage } from './chat.api'
import { useChatStore } from './chat.store'
import type { Conversation } from './chat.types'

interface StartInput {
  userId: string
  /** When set, the artwork is shared into the conversation right away. */
  artworkId?: string
  /** Surface the panel on the thread afterwards (default true). */
  openAfter?: boolean
}

// Opens (or creates) the conversation with a user, seeds it into the inbox
// cache, and surfaces the panel on that thread — the entry point shared by the
// new-message picker, the profile "Message" button, and artwork sharing.
export function useStartConversation() {
  const qc = useQueryClient()
  const openThread = useChatStore((s) => s.openThread)

  return useMutation({
    mutationFn: async ({ userId, artworkId }: StartInput) => {
      const conv = await openConversation(userId)
      if (artworkId) await sendMessage({ conversationId: conv.id, artworkId })
      return conv
    },
    onSuccess: (conv, { artworkId, openAfter = true }) => {
      qc.setQueryData<Conversation[]>(chatKeys.conversations(), (prev) => {
        const list = prev ?? []
        return list.some((c) => c.id === conv.id)
          ? list.map((c) => (c.id === conv.id ? conv : c))
          : [conv, ...list]
      })
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() })
      // A freshly shared artwork must land in the thread when it opens.
      if (artworkId) {
        void qc.invalidateQueries({ queryKey: chatKeys.messages(conv.id) })
      }
      if (openAfter) openThread(conv.id)
    },
  })
}
