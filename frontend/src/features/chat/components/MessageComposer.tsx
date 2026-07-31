import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { type InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useAuthStore } from '@/features/auth/auth.store'
import { getSocket } from '@/features/presence/socket'
import { useToast } from '@/lib/toast.store'

import { chatKeys, sendMessage, type SendMessageResult } from '../chat.api'
import { useChatStore } from '../chat.store'
import type { ChatMessage, MessagesPage } from '../chat.types'

// Mirrors the backend @MaxLength(2000): a too-long message never reaches a 400.
const MESSAGE_MAX = 2000
// Mirrors the server throttle (20 per 10s): blocks a spam burst before it 429s.
const RATE_WINDOW_MS = 10_000
const RATE_MAX = 20

interface Context {
  prev?: InfiniteData<MessagesPage>
  tempId: string
}

export function MessageComposer({
  conversationId,
  otherUserId,
}: {
  conversationId: string
  otherUserId?: string
}) {
  const { t } = useTranslation('common')
  const qc = useQueryClient()
  const toast = useToast()
  const myId = useAuthStore((s) => s.user?.id ?? '')
  const draft = useChatStore((s) => s.drafts[conversationId] ?? '')
  const setDraft = useChatStore((s) => s.setDraft)
  const [notMutual, setNotMutual] = useState(false)
  const sendTimesRef = useRef<number[]>([])
  const lastSlowToastRef = useRef(0)

  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Tell the other participant we're typing, at most every ~1.5s (their client
  // clears the flag on its own if the keystrokes stop).
  const lastTypingRef = useRef(0)
  const notifyTyping = () => {
    if (!otherUserId) return
    const now = Date.now()
    if (now - lastTypingRef.current < 1500) return
    lastTypingRef.current = now
    getSocket()?.emit('chat:typing', { conversationId, toUserId: otherUserId })
  }

  const mutation = useMutation<SendMessageResult, Error, string, Context>({
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
        kind: 'USER',
        systemKey: null,
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
    onSuccess: (result, content, ctx) => {
      if ('ok' in result && result.ok === false) {
        if (ctx?.prev) {
          qc.setQueryData(chatKeys.messages(conversationId), ctx.prev)
        }
        setDraft(conversationId, content)
        setNotMutual(true)
        toast({ variant: 'error', message: t('chat.notMutual') })
        return
      }
      void qc.invalidateQueries({ queryKey: chatKeys.messages(conversationId) })
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() })
    },
  })

  const submit = () => {
    const text = draft.trim()
    if (!text || mutation.isPending || notMutual) return
    const now = Date.now()
    sendTimesRef.current = sendTimesRef.current.filter(
      (ts) => now - ts < RATE_WINDOW_MS,
    )
    if (sendTimesRef.current.length >= RATE_MAX) {
      if (now - lastSlowToastRef.current > 3000) {
        lastSlowToastRef.current = now
        toast({ variant: 'error', message: t('chat.slowDown') })
      }
      return
    }
    sendTimesRef.current.push(now)
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

  if (notMutual) {
    return (
      <p className="border-t border-neutral-100 p-4 text-center text-sm text-neutral-500">
        {t('chat.notMutual')}
      </p>
    )
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
        maxLength={MESSAGE_MAX}
        value={draft}
        onChange={(e) => {
          setDraft(conversationId, e.target.value)
          if (e.target.value.trim()) notifyTyping()
        }}
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
