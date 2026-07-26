import type { RefObject } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useChatStore } from '../chat.store'
import { ConversationList } from './ConversationList'
import { ConversationThread } from './ConversationThread'
import { NewMessagePicker } from './NewMessagePicker'

function CloseButton({
  onClick,
  className = '',
}: {
  onClick: () => void
  className?: string
}) {
  const { t } = useTranslation('common')
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('chat.close')}
      className={`flex size-8 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 motion-reduce:transition-none ${className}`}
    >
      <X aria-hidden="true" className="size-5" />
    </button>
  )
}

export function ChatPanel({
  searchRef,
}: {
  searchRef: RefObject<HTMLInputElement | null>
}) {
  const { t } = useTranslation('common')
  const view = useChatStore((s) => s.view)
  const activeId = useChatStore((s) => s.activeId)
  const closePanel = useChatStore((s) => s.closePanel)
  const openThread = useChatStore((s) => s.openThread)
  const backToList = useChatStore((s) => s.backToList)
  const openNewMessage = useChatStore((s) => s.openNewMessage)

  if (view === 'thread' && activeId) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <CloseButton onClick={closePanel} className="absolute end-2 top-2 z-10" />
        <ConversationThread conversationId={activeId} onBack={backToList} />
      </div>
    )
  }

  if (view === 'new') {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-2 px-3 pb-1 pt-3">
          <button
            type="button"
            onClick={backToList}
            aria-label={t('chat.back')}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
          >
            <ChevronLeft aria-hidden="true" className="size-5 rtl:rotate-180" />
          </button>
          <h2
            id="chat-title"
            className="min-w-0 flex-1 truncate font-serif text-lg text-neutral-900"
          >
            {t('chat.newMessageTitle')}
          </h2>
          <CloseButton onClick={closePanel} />
        </div>
        <NewMessagePicker onOpenThread={openThread} />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-4 pb-1 pt-4">
        <h2 id="chat-title" className="font-serif text-2xl text-neutral-900">
          {t('chat.title')}
        </h2>
        <CloseButton onClick={closePanel} />
      </div>
      <ConversationList
        activeId={activeId}
        onOpenThread={openThread}
        onNewMessage={openNewMessage}
        searchRef={searchRef}
      />
    </div>
  )
}
