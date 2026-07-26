import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Spinner } from '@/components/ui/Spinner'
import { useAuthStore } from '@/features/auth/auth.store'
import { useRequireAuth } from '@/features/auth/useRequireAuth'
import { useToast } from '@/lib/toast.store'

import { chatKeys, fetchMutuals } from '../chat.api'
import type { ChatUser } from '../chat.types'
import { useStartConversation } from '../useStartConversation'
import { ChatAvatar } from './ChatAvatar'

// "Send by message" for an artwork: a chip that opens a popover of mutuals and
// shares the artwork into the chosen conversation (CHAT_SPEC T11). Confirmation
// is a toast — it deliberately does not hijack the artwork view with the thread.
export function ShareArtworkChip({ artworkId }: { artworkId: string }) {
  const { t } = useTranslation('common')
  const requireAuth = useRequireAuth()
  const toast = useToast()
  const me = useAuthStore((s) => s.user)
  const start = useStartConversation()

  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const { data, isPending } = useQuery({
    queryKey: chatKeys.mutuals(),
    queryFn: fetchMutuals,
    enabled: open && Boolean(me),
  })

  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const share = (user: ChatUser) => {
    start.mutate(
      { userId: user.id, artworkId, openAfter: false },
      {
        onSuccess: () => {
          setOpen(false)
          toast({
            message: t('chat.sentToast', { name: user.fullname ?? user.username }),
          })
        },
        onError: () => {
          toast({ variant: 'error', message: t('chat.sendFailed') })
        },
      },
    )
  }

  const mutuals = data ?? []

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => requireAuth(() => setOpen((v) => !v))}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 motion-reduce:transition-none"
      >
        <Send aria-hidden="true" className="size-4 rtl:-scale-x-100" />
        <span>{t('chat.sendByMessage')}</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute bottom-full end-0 z-20 mb-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
        >
          <p className="border-b border-neutral-100 px-3 py-2 font-serif text-sm text-neutral-900">
            {t('chat.sendByMessage')}
          </p>
          <div className="max-h-64 overflow-y-auto p-1">
            {isPending ? (
              <div role="status" className="grid place-items-center py-8">
                <Spinner size="sm" />
              </div>
            ) : mutuals.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-neutral-500">
                {t('chat.noMutualsBody')}
              </p>
            ) : (
              <ul>
                {mutuals.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={start.isPending}
                      onClick={() => share(u)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 disabled:opacity-50 motion-reduce:transition-none"
                    >
                      <ChatAvatar user={u} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm text-neutral-900">
                        {u.fullname ?? u.username}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
