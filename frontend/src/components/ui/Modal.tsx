import { useEffect, useRef, useState, type ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  /** id of the element (inside children) that labels the dialog, for aria-labelledby. */
  labelledBy: string
  /** Panel width: 'md' (default), 'wide' for auth screens, 'xl' for artwork detail. */
  size?: 'md' | 'wide' | 'xl'
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const PANEL_SIZE: Record<NonNullable<ModalProps['size']>, string> = {
  md: 'max-w-md',
  wide: 'max-w-4xl',
  xl: 'max-w-6xl',
}

// The panel is only the frame; children bring their own padding.
export function Modal({
  isOpen,
  onClose,
  children,
  labelledBy,
  size = 'md',
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [entered, setEntered] = useState(false)

  // Focus into the dialog on open, lock background scroll, restore focus on close.
  useEffect(() => {
    if (!isOpen) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const raf = requestAnimationFrame(() => {
      setEntered(true)
    })

    return () => {
      cancelAnimationFrame(raf)
      setEntered(false)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [isOpen])

  // Escape closes; Tab is trapped inside the dialog.
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      )
      if (focusables.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      // Real containment: wrap not only at the first/last tabbable but whenever
      // focus sits on something that is NOT a tabbable inside the panel — above
      // all the panel container itself (the initial focus target, tabIndex=-1),
      // so Shift+Tab on open can't escape to the background page (which is not
      // inert). Focus that has slipped to <body> is pulled back the same way.
      const insideTabbable =
        active instanceof Node && active !== panel && panel.contains(active)
      if (event.shiftKey) {
        if (!insideTabbable || active === first) {
          event.preventDefault()
          last.focus()
        }
      } else if (!insideTabbable || active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-opacity duration-200 motion-reduce:transition-none ${
        entered ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onClick={(event) => {
          event.stopPropagation()
        }}
        className={`w-full ${PANEL_SIZE[size]} rounded-xl bg-white shadow-xl outline-none transition duration-200 motion-reduce:transition-none ${
          entered ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {children}
      </div>
    </div>
  )
}
