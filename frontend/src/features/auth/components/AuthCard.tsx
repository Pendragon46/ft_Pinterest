import type { ReactNode } from 'react'

import { Logo } from '@/components/ui/Logo'

interface AuthCardProps {
  children: ReactNode
  /** Standalone route (no modal behind): the card brings its own centered page chrome. */
  standalone?: boolean
}

// Two-panel auth shell (Figma): brand gradient panel + form column.
export function AuthCard({ children, standalone = false }: AuthCardProps) {
  const card = (
    <div className="grid w-full md:grid-cols-2 md:p-1">
      {/* Decorative brand panel; hidden from AT and dropped on small screens. RTL flips columns automatically. */}
      <div
        aria-hidden="true"
        className="hidden items-center justify-center rounded-xl bg-gradient-to-b from-neutral-950 from-35% via-[#252c55] via-65% to-[#a9b5ea] md:flex"
      >
        <Logo withWordmark className="text-5xl text-white" />
      </div>

      <div className="flex flex-col justify-center gap-6 p-6 sm:p-10">
        {children}
      </div>
    </div>
  )

  if (!standalone) return card

  return (
    <main className="flex min-h-svh items-center justify-center bg-neutral-100 p-4 sm:p-6">
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-xl">
        {card}
      </div>
    </main>
  )
}
