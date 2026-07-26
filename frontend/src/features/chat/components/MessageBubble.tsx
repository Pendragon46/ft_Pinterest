import { useTranslation } from 'react-i18next'

import type { ChatMessage } from '../chat.types'
import { SharedArtworkCard } from './SharedArtworkCard'

interface Props {
  message: ChatMessage
  mine: boolean
  senderName: string
}

export function MessageBubble({ message, mine, senderName }: Props) {
  const { t } = useTranslation('common')
  return (
    <li className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
      <span className="sr-only">
        {mine ? t('chat.messageFromYou') : t('chat.messageFrom', { name: senderName })}
      </span>
      {message.artwork ? (
        <SharedArtworkCard artwork={message.artwork} mine={mine} />
      ) : (
        <span
          className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
            mine ? 'bg-[#252c55] text-white' : 'bg-neutral-100 text-neutral-900'
          }`}
        >
          {message.content}
        </span>
      )}
    </li>
  )
}
