import { useState } from 'react'
import type { RefObject } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Spinner } from '@/components/ui/Spinner'

import { chatKeys, fetchConversations } from '../chat.api'
import { ConversationRow } from './ConversationRow'

interface Props {
  activeId: string | null
  onOpenThread: (id: string) => void
  onNewMessage: () => void
  searchRef: RefObject<HTMLInputElement | null>
}

export function ConversationList({
  activeId,
  onOpenThread,
  onNewMessage,
  searchRef,
}: Props) {
  const { t } = useTranslation('common')
  const [query, setQuery] = useState('')
  const { data, isPending, isError } = useQuery({
    queryKey: chatKeys.conversations(),
    queryFn: fetchConversations,
  })

  const needle = query.trim().toLowerCase()
  const filtered = (data ?? []).filter((c) => {
    if (!needle) return true
    const name = c.otherUser?.fullname ?? c.otherUser?.username ?? ''
    return name.toLowerCase().includes(needle)
  })

  return (
    // flex-1 matches ConversationThread: without it this view sizes to its
    // content instead of the panel, so the scroller below never bounds itself
    // and conversations past the fold are clipped out of reach.
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-3 px-4 pb-2 pt-1">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-neutral-400"
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('chat.search')}
            aria-label={t('chat.search')}
            className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2.5 pe-3 ps-9 text-sm outline-none focus-visible:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-200"
          />
        </div>
        <button
          type="button"
          onClick={onNewMessage}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          <Users aria-hidden="true" className="size-4" />
          {t('chat.newMessage')}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {isPending ? (
          <div role="status" className="grid place-items-center py-10">
            <Spinner size="sm" />
            <span className="sr-only">{t('chat.loading')}</span>
          </div>
        ) : isError ? (
          <p className="px-2 py-8 text-center text-sm text-neutral-500">
            {t('chat.loadError')}
          </p>
        ) : filtered.length === 0 ? (
          needle ? (
            <p className="px-2 py-8 text-center text-sm text-neutral-500">
              {t('chat.searchNoResult')}
            </p>
          ) : (
            <div className="px-4 py-10 text-center">
              <p className="font-serif text-lg text-neutral-900">
                {t('chat.emptyTitle')}
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                {t('chat.emptyBody')}
              </p>
            </div>
          )
        ) : (
          <ul>
            {filtered.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                active={c.id === activeId}
                onClick={() => onOpenThread(c.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
