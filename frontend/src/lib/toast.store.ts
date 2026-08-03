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
  /**
   * Auto-dismiss after this many ms (0 = keep until dismissed). Defaults to 0 for
   * `action` toasts — a retry is the only way to recover a failed optimistic write,
   * so a timer must never remove it — and 5s otherwise.
   */
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  show: (input: ShowInput) => void
  dismiss: (id: number) => void
  /** Freeze/thaw the auto-dismiss timers while the viewport is hovered or focused. */
  pause: () => void
  resume: () => void
}

let nextId = 1
const DEFAULT_DURATION = 5000

// Auto-dismiss bookkeeping kept outside React state so timers can be paused
// (hover/focus) and cancelled (dismiss) individually.
const lifetimes = new Map<number, number>()
const timers = new Map<number, number>()

function clearTimer(id: number) {
  const handle = timers.get(id)
  if (handle !== undefined) {
    window.clearTimeout(handle)
    timers.delete(id)
  }
}

// App-wide toast queue; callers pass already-translated strings. Used for
// optimistic-rollback "couldn't save — retry" messages and other confirmations.
export const useToastStore = create<ToastState>((set, get) => {
  const schedule = (id: number, duration: number) => {
    timers.set(
      id,
      window.setTimeout(() => {
        get().dismiss(id)
      }, duration),
    )
  }
  return {
    toasts: [],
    show: ({ message, variant = 'default', action, duration }) => {
      const id = nextId++
      // Actionable toasts are sticky by default so the retry affordance survives.
      const ttl = duration ?? (action ? 0 : DEFAULT_DURATION)
      set((state) => ({
        toasts: [...state.toasts, { id, message, variant, action }],
      }))
      if (ttl > 0) {
        lifetimes.set(id, ttl)
        schedule(id, ttl)
      }
    },
    dismiss: (id) => {
      clearTimer(id)
      lifetimes.delete(id)
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
    },
    // Clear pending timers so a toast can't vanish mid-read; leaving restarts
    // each from its full lifetime (safe over-generosity).
    pause: () => {
      for (const id of Array.from(timers.keys())) clearTimer(id)
    },
    resume: () => {
      for (const [id, duration] of lifetimes) {
        if (!timers.has(id)) schedule(id, duration)
      }
    },
  }
})

export function useToast() {
  return useToastStore((state) => state.show)
}
