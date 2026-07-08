import type { ComponentPropsWithoutRef } from 'react'

import { Spinner } from './Spinner'

type ButtonVariant = 'primary' | 'outline' | 'ghost'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  /** Visual weight: 'primary' main action, 'outline' secondary, 'ghost' discreet. */
  variant?: ButtonVariant
  /** Padding scale: 'md' (default) for forms, 'sm' for dense toolbars. */
  size?: ButtonSize
  /** Stretch to the parent's width (auth forms use this). */
  fullWidth?: boolean
  /** Show a spinner and block interaction. The label stays visible so the
      button keeps its width and screen readers keep the accessible name. */
  loading?: boolean
}

// Shape/behavior shared by every variant — variants only swap colors, sizes
// only swap padding. Focus ring = the project's canonical style (see AuthButton).
const BASE =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-neutral-900 text-white hover:bg-neutral-800 active:bg-neutral-950',
  outline:
    'border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100',
  ghost: 'text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200',
}

const SIZES: Record<ButtonSize, string> = {
  md: 'px-4 py-3 text-base',
  sm: 'px-4 py-2 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  // 'button' by default: inside a <form>, a bare <button> submits it —
  // a classic source of accidental submits (the Google button would submit
  // the login form otherwise). Submit buttons opt in with type="submit".
  type = 'button',
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  )
}
