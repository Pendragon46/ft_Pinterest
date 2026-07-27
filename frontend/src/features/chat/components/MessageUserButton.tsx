import { useQuery } from '@tanstack/react-query'
import { MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/features/auth/auth.store'

import { chatKeys, fetchMutuals } from '../chat.api'
import { useStartConversation } from '../useStartConversation'

// "Message" affordance shown only when the viewer and the target follow each
// other (CHAT_SPEC D1). Renders nothing otherwise, so callers can drop it in
// unconditionally next to a Follow button.
export function MessageUserButton({ userId }: { userId: string }) {
  const { t } = useTranslation('common')
  const me = useAuthStore((s) => s.user)
  const start = useStartConversation()

  const { data: mutuals } = useQuery({
    queryKey: chatKeys.mutuals(),
    queryFn: fetchMutuals,
    enabled: Boolean(me) && me?.id !== userId,
  })

  const isMutual = (mutuals ?? []).some((u) => u.id === userId)
  if (!isMutual) return null

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={start.isPending}
      onClick={() => start.mutate({ userId })}
    >
      <MessageCircle aria-hidden="true" className="size-4" />
      {t('chat.message')}
    </Button>
  )
}
