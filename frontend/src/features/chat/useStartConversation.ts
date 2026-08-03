import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/lib/toast.store'

import { chatKeys, openConversation } from './chat.api'
import { useChatStore } from './chat.store'
import type { Conversation } from './chat.types'

export function useStartConversation() {
  const qc = useQueryClient()
  const openThread = useChatStore((s) => s.openThread)
  const toast = useToast()
  const { t } = useTranslation('common')

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
    // POST /conversations can still refuse (self-message 400, unknown id 404).
    // Without this the rejection was swallowed: the browser logged the failed
    // request and the UI simply did nothing.
    onError: () => {
      toast({ variant: 'error', message: t('errors.network') })
    },
  })
}
