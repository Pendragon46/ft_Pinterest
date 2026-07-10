import type { ReactNode } from 'react'

interface DividerProps {
  /** Optional centered label (e.g. the "or" between auth methods). */
  children?: ReactNode
}

// aria-hidden: purely visual; the surrounding content already carries the meaning.
export function Divider({ children }: DividerProps) {
  if (!children) {
    return <hr aria-hidden="true" className="border-neutral-200" />
  }

  return (
    <div
      aria-hidden="true"
      className="flex items-center gap-4 text-sm text-neutral-400"
    >
      <span className="h-px flex-1 bg-neutral-200" />
      {children}
      <span className="h-px flex-1 bg-neutral-200" />
    </div>
  )
}
