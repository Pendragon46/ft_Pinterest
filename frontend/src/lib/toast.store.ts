import { create } from 'zustand'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: number
  message: string
  variant: 'default' | 'error'
  action?: ToastAction
}

interface ShowInput {
  message: string
  variant?: 'default' | 'error'
  action?: ToastAction
  /** Auto-dismiss after this many ms (0 = keep until dismissed). */
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  show: (input: ShowInput) => void
  dismiss: (id: number) => void
}

let nextId = 1
const DEFAULT_DURATION = 5000

// App-wide toast queue. Callers pass already-translated strings; the viewport
// (mounted once at the app root) renders them. Used for optimistic-rollback
// "couldn't save — retry" messages and other transient confirmations.
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: ({ message, variant = 'default', action, duration = DEFAULT_DURATION }) => {
    const id = nextId++
    set((state) => ({ toasts: [...state.toasts, { id, message, variant, action }] }))
    if (duration > 0) {
      window.setTimeout(() => {
        get().dismiss(id)
      }, duration)
    }
  },
  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
  },
}))

/** Convenience: the `show` action for firing toasts from components. */
export function useToast() {
  return useToastStore((state) => state.show)
}
