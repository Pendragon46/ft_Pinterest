import { useMutation, useQueryClient } from '@tanstack/react-query'

import { chatKeys, openConversation } from './chat.api'
import { useChatStore } from './chat.store'
import type { Conversation } from './chat.types'

// Opens (or creates) the conversation with a user, seeds it into the inbox
// cache, and surfaces the panel on that thread — shared by the new-message
// picker and the profile "Message" button.
export function useStartConversation() {
  const qc = useQueryClient()
  const openThread = useChatStore((s) => s.openThread)

  return useMutation({
    mutationFn: ({ userId }: { userId: string }) => openConversation(userId),
    onSuccess: (conv) => {
      qc.setQueryData<Conversation[]>(chatKeys.conversations(), (prev) => {
        const list = prev ?? []
        return list.some((c) => c.id === conv.id)
          ? list.map((c) => (c.id === conv.id ? conv : c))
          : [conv, ...list]
      })
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() })
      openThread(conv.id)
    },
  })
}
