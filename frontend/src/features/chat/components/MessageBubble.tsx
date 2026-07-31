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

  // A system message belongs to neither side: it renders centred, like a date
  // separator. No ms-auto/me-auto, so nothing to mirror in RTL. The text comes
  // from i18n (systemKey), never from the database, so it follows the user's
  // language — including retroactively.
  if (message.kind === 'SYSTEM') {
    return (
      <li className="py-2 text-center text-xs text-neutral-500">
        {t(
          `chat.system.${message.systemKey ?? 'unknown'}` as
            | 'chat.system.mutualFollow'
            | 'chat.system.unknown',
        )}
      </li>
    )
  }

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
        <>
          {link.before ? <MessageText mine={mine}>{link.before}</MessageText> : null}
          <LinkedArtworkCard id={link.id} mine={mine} fallback={link.url} />
          {link.after ? <MessageText mine={mine}>{link.after}</MessageText> : null}
        </>
      ) : (
        <MessageText mine={mine}>{message.content}</MessageText>
      )}
    </li>
  )
}