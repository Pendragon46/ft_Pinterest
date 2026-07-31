import { LocateFixed } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface RefocusButtonProps {
  /** Camera has wandered from home; drives visibility. */
  visible: boolean
  onClick: () => void
}

// Always mounted, toggled via opacity/transform so it can fade. When hidden it
// is made `inert` — non-focusable and skipped by assistive tech — which also
// makes the browser blur it if it held focus (clicking Refocus then hiding it),
// avoiding the "aria-hidden on a focused element" console warning that
// tabIndex + aria-hidden produced.
export function RefocusButton({ visible, onClick }: RefocusButtonProps) {
  const { t } = useTranslation('common')

  return (
    <button
      type="button"
      onClick={onClick}
      inert={!visible}
      className={`absolute bottom-20 cursor-pointer left-1/2 flex h-10 -translate-x-1/2 items-center gap-2 rounded-full bg-neutral-900 px-4 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 motion-reduce:transition-none sm:bottom-6 ${
        visible
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <LocateFixed aria-hidden="true" className="size-4" />
      {t('home.refocus')}
    </button>
  )
}
