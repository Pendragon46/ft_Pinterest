import { Link } from 'react-router-dom'
import type { ComponentPropsWithoutRef } from 'react'

type TextLinkProps = ComponentPropsWithoutRef<typeof Link>

// Inline navigation link with the project's serif accent + canonical focus
// ring. Wraps react-router's Link, so `to`, `state`, `replace`… all work.
export function TextLink({ className = '', children, ...rest }: TextLinkProps) {
  return (
    <Link
      className={`rounded-sm font-serif text-neutral-900 underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 motion-reduce:transition-none ${className}`}
      {...rest}
    >
      {children}
    </Link>
  )
}
