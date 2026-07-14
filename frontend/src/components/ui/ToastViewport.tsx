import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useToastStore } from '@/lib/toast.store'

// Renders the active toasts in the logical bottom-end corner. Error toasts assert
// to assistive tech, others announce politely; they fade in (no slide) and are
// static under reduced motion. The container is click-through except the pills.
export function ToastViewport() {
  const { t } = useTranslation('common')
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.variant === 'error' ? 'alert' : 'status'}
          aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
          className="pointer-events-auto flex max-w-sm animate-reveal items-center gap-3 rounded-xl bg-neutral-900 px-4 py-3 text-sm text-white shadow-lg motion-reduce:animate-none"
        >
          <span className="flex-1">{toast.message}</span>
          {toast.action ? (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick()
                dismiss(toast.id)
              }}
              className="shrink-0 rounded-md font-medium text-white underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {toast.action.label}
            </button>
          ) : null}
          <button
            type="button"
            aria-label={t('actions.dismiss')}
            onClick={() => {
              dismiss(toast.id)
            }}
            className="shrink-0 rounded-md text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
