import { useTranslation } from 'react-i18next'

import { useIsOnline } from '@/features/presence/presence.store'

interface OnlineDotProps {
  userId: string
}

// A green presence dot overlaid on an avatar, shown only when the user is a
// currently-online mutual. Not colour-only: carries an sr-only status label.
// Expects a `relative` positioned parent.
export function OnlineDot({ userId }: OnlineDotProps) {
  const { t } = useTranslation('common')
  const online = useIsOnline(userId)
  if (!online) return null
  return (
    <span className="absolute -bottom-0.5 -end-0.5 size-3 rounded-full border-2 border-white bg-green-500">
      <span className="sr-only">{t('presence.online')}</span>
    </span>
  )
}
