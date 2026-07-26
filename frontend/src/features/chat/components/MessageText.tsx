import type { ReactNode } from 'react'

// The plain text bubble, shared by MessageBubble and the linked-artwork card
// (which reuses it for any text around the link and for its fallback).
export function MessageText({
  mine,
  children,
}: {
  mine: boolean
  children: ReactNode
}) {
  return (
    <span
      className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
        mine ? 'bg-[#252c55] text-white' : 'bg-neutral-100 text-neutral-900'
      }`}
    >
      {children}
    </span>
  )
}
