import { useTranslation } from 'react-i18next'

import { extractArtworkLink } from '../artworkLink'
import type { ChatMessage } from '../chat.types'
import { LinkedArtworkCard } from './LinkedArtworkCard'
import { MessageText } from './MessageText'
import { SharedArtworkCard } from './SharedArtworkCard'

interface Props {
  message: ChatMessage
  mine: boolean
  senderName: string
}

export function MessageBubble({ message, mine, senderName }: Props) {
  const { t } = useTranslation('common')
  // A pasted artwork link renders as the rich card, same as an API-shared one.
  const link = message.artwork ? null : extractArtworkLink(message.content)

  return (
    <li className={`flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
      <span className="sr-only">
        {mine ? t('chat.messageFromYou') : t('chat.messageFrom', { name: senderName })}
      </span>
      {message.artwork ? (
        <SharedArtworkCard artwork={message.artwork} mine={mine} />
      ) : link ? (
        <LinkedArtworkCard
          id={link.id}
          mine={mine}
          rest={link.rest}
          fallback={message.content ?? ''}
        />
      ) : (
        <MessageText mine={mine}>{message.content}</MessageText>
      )}
    </li>
  )
}
