import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Spinner } from '@/components/ui/Spinner'
import { usePresenceStore } from '@/features/presence/presence.store'

import { chatKeys, fetchMutuals } from '../chat.api'
import { useStartConversation } from '../useStartConversation'
import { ChatAvatar } from './ChatAvatar'

export function NewMessagePicker() {
  const { t } = useTranslation('common')
  const [query, setQuery] = useState('')
  const { data, isPending } = useQuery({
    queryKey: chatKeys.mutuals(),
    queryFn: fetchMutuals,
  })
  const onlineIds = usePresenceStore((s) => s.onlineIds)

  const mutation = useStartConversation()

  const needle = query.trim().toLowerCase()
  const filtered = (data ?? [])
    .filter(
      (u) =>
        !needle || (u.fullname ?? u.username).toLowerCase().includes(needle),
    )
    // Online friends first so an evaluator sees presence at a glance; stable
    // otherwise (the backend already returns a deterministic order).
    .sort(
      (a, b) => Number(onlineIds.has(b.id)) - Number(onlineIds.has(a.id)),
    )

  return (
    // flex-1 so the picker fills the panel and its list can scroll — same
    // reason as ConversationList.
    <div className="flex min-h-0 flex-1 flex-col">
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
            placeholder={t('chat.searchFriends')}
            aria-label={t('chat.searchFriends')}
            className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2.5 pe-3 ps-9 text-sm outline-none focus-visible:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-200"
          />
        </div>
        <p className="mt-2 px-1 text-xs text-neutral-500">
          {t('chat.friendsHint')}
        </p>
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
                  onClick={() => mutation.mutate({ userId: u.id })}
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
                  <span
                    className={`shrink-0 text-xs font-medium ${
                      onlineIds.has(u.id) ? 'text-green-600' : 'text-neutral-400'
                    }`}
                  >
                    {onlineIds.has(u.id)
                      ? t('presence.online')
                      : t('presence.offline')}
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
