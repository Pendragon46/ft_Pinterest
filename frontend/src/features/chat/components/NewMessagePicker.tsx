import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Spinner } from '@/components/ui/Spinner'

import { chatKeys, fetchMutuals, openConversation } from '../chat.api'
import type { Conversation } from '../chat.types'
import { ChatAvatar } from './ChatAvatar'

export function NewMessagePicker({
  onOpenThread,
}: {
  onOpenThread: (id: string) => void
}) {
  const { t } = useTranslation('common')
  const qc = useQueryClient()
  const [query, setQuery] = useState('')
  const { data, isPending } = useQuery({
    queryKey: chatKeys.mutuals(),
    queryFn: fetchMutuals,
  })

  const mutation = useMutation({
    mutationFn: (userId: string) => openConversation(userId),
    onSuccess: (conv) => {
      qc.setQueryData<Conversation[]>(chatKeys.conversations(), (prev) => {
        const list = prev ?? []
        return list.some((c) => c.id === conv.id)
          ? list.map((c) => (c.id === conv.id ? conv : c))
          : [conv, ...list]
      })
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() })
      onOpenThread(conv.id)
    },
  })

  const needle = query.trim().toLowerCase()
  const filtered = (data ?? []).filter(
    (u) => !needle || (u.fullname ?? u.username).toLowerCase().includes(needle),
  )

  return (
    <div className="flex min-h-0 flex-col">
      <div className="px-4 pb-2 pt-1">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-neutral-400"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('chat.search')}
            aria-label={t('chat.search')}
            className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2.5 pe-3 ps-9 text-sm outline-none focus-visible:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-200"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {isPending ? (
          <div role="status" className="grid place-items-center py-10">
            <Spinner size="sm" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="font-serif text-lg text-neutral-900">
              {t('chat.noMutualsTitle')}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {t('chat.noMutualsBody')}
            </p>
            <Link
              to="/"
              className="mt-3 inline-block text-sm font-medium text-neutral-900 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
            >
              {t('chat.noMutualsAction')}
            </Link>
          </div>
        ) : (
          <ul>
            {filtered.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate(u.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 motion-reduce:transition-none"
                >
                  <ChatAvatar user={u} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-neutral-900">
                      {u.fullname ?? u.username}
                    </span>
                    <span className="block truncate text-sm text-neutral-500">
                      @{u.username}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
