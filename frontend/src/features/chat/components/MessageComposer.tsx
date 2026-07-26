import { useEffect, useRef } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { type InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useAuthStore } from '@/features/auth/auth.store'
import { useToast } from '@/lib/toast.store'

import { chatKeys, sendMessage } from '../chat.api'
import { useChatStore } from '../chat.store'
import type { ChatMessage, MessagesPage } from '../chat.types'

interface Context {
  prev?: InfiniteData<MessagesPage>
  tempId: string
}

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const { t } = useTranslation('common')
  const qc = useQueryClient()
  const toast = useToast()
  const myId = useAuthStore((s) => s.user?.id ?? '')
  const draft = useChatStore((s) => s.drafts[conversationId] ?? '')
  const setDraft = useChatStore((s) => s.setDraft)

  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const mutation = useMutation<ChatMessage, Error, string, Context>({
    mutationFn: (content) => sendMessage({ conversationId, content }),
    onMutate: (content) => {
      const key = chatKeys.messages(conversationId)
      const prev = qc.getQueryData<InfiniteData<MessagesPage>>(key)
      const tempId = `temp_${Date.now()}`
      const temp: ChatMessage = {
        id: tempId,
        conversationId,
        senderId: myId,
        content,
        createdAt: new Date().toISOString(),
        artwork: null,
      }
      qc.setQueryData<InfiniteData<MessagesPage>>(key, (cur) => {
        if (!cur) return cur
        const [first, ...rest] = cur.pages
        return {
          ...cur,
          pages: [{ ...first, items: [temp, ...first.items] }, ...rest],
        }
      })
      setDraft(conversationId, '')
      return { prev, tempId }
    },
    onError: (_error, content, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(chatKeys.messages(conversationId), ctx.prev)
      }
      if (!isMountedRef.current) return
      const current = useChatStore.getState().drafts[conversationId] ?? ''
      setDraft(conversationId, current.length > 0 ? current : content)
      toast({
        variant: 'error',
        message: t('chat.sendFailed'),
        action: {
          label: t('chat.retry'),
          onClick: () => {
            if (!mutation.isPending) mutation.mutate(content)
          },
        },
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chatKeys.messages(conversationId) })
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() })
    },
  })

  const submit = () => {
    const text = draft.trim()
    if (!text || mutation.isPending) return
    mutation.mutate(text)
  }
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex items-end gap-2 border-t border-neutral-100 p-3"
    >
      <label htmlFor="chat-composer" className="sr-only">
        {t('chat.composerPlaceholder')}
      </label>
      <textarea
        id="chat-composer"
        rows={1}
        value={draft}
        onChange={(e) => setDraft(conversationId, e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t('chat.composerPlaceholder')}
        className="max-h-28 min-h-[2.5rem] flex-1 resize-none rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm text-neutral-900 outline-none focus-visible:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-200"
      />
      <button
        type="submit"
        disabled={!draft.trim() || mutation.isPending}
        aria-label={t('chat.send')}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:opacity-40 motion-reduce:transition-none"
      >
        <ArrowUp aria-hidden="true" className="size-5" />
      </button>
    </form>
  )
}
