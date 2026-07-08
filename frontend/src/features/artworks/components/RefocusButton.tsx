import { useTranslation } from 'react-i18next'

interface RefocusButtonProps {
  /** Whether the camera has wandered from home (drives visibility). */
  visible: boolean
  onClick: () => void
}

// Screen-fixed pill that flies the camera back to the origin. Always mounted
// and toggled via opacity/transform so it can fade instead of popping; when
// hidden it is also removed from the tab order and hidden from assistive tech
// (pointer-events-none + tabIndex −1 + aria-hidden) so it can't be focused or
// clicked through.
export function RefocusButton({ visible, onClick }: RefocusButtonProps) {
  const { t } = useTranslation('common')

  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={visible ? 0 : -1}
      aria-hidden={visible ? undefined : true}
      className={`absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 motion-reduce:transition-none ${
        visible
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <RefocusIcon />
      {t('home.refocus')}
    </button>
  )
}

function RefocusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v4h4" />
    </svg>
  )
}
