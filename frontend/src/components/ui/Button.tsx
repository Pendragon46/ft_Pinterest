import type { ComponentPropsWithoutRef } from 'react'

import { Spinner } from './Spinner'

type ButtonVariant = 'primary' | 'outline' | 'ghost'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  /** Show a spinner and block interaction; the label stays visible. */
  loading?: boolean
}

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
  // Default 'button' so a bare button inside a <form> doesn't submit it.
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
