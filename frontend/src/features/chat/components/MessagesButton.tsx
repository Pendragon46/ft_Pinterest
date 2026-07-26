import { useEffect, useRef } from 'react'
import { MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useAuthStore } from '@/features/auth/auth.store'

import { useUnreadTotal } from '../chat.api'
import { useChatStore } from '../chat.store'
import { ChatPanel } from './ChatPanel'

export function MessagesButton() {
  const { t } = useTranslation('common')
  const user = useAuthStore((s) => s.user)
  const open = useChatStore((s) => s.open)
  const view = useChatStore((s) => s.view)
  const togglePanel = useChatStore((s) => s.togglePanel)
  const closePanel = useChatStore((s) => s.closePanel)
  const unread = useUnreadTotal()

  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closePanel()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePanel()
        buttonRef.current?.focus()
      }
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, closePanel])

  useEffect(() => {
    if (open && view === 'list') {
      const id = setTimeout(() => searchRef.current?.focus(), 30)
      return () => clearTimeout(id)
    }
  }, [open, view])

  if (!user) return null

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={togglePanel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="chat-panel"
        aria-label={`${t('chat.open')}${
          unread ? `, ${t('chat.unread', { count: unread })}` : ''
        }`}
        className="relative inline-flex size-10 items-center justify-center rounded-full bg-neutral-500 text-white transition-colors hover:bg-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 motion-reduce:transition-none"
      >
        <MessageCircle aria-hidden="true" className="size-5" />
        {unread > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -end-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          id="chat-panel"
          role="dialog"
          aria-labelledby="chat-title"
          className="fixed inset-0 z-30 flex flex-col overflow-hidden border-neutral-200 bg-white/95 shadow-xl backdrop-blur animate-reveal motion-reduce:animate-none sm:absolute sm:inset-auto sm:end-0 sm:top-full sm:mt-2 sm:max-h-[calc(100svh-5rem)] sm:w-[26rem] sm:max-w-[calc(100vw-2rem)] sm:rounded-2xl sm:border"
        >
          <ChatPanel searchRef={searchRef} />
        </div>
      ) : null}
    </div>
  )
}
