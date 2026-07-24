interface SpinnerProps {
  size?: 'sm' | 'md'
  className?: string
}

// aria-hidden: the caller owns the accessible loading state (e.g. Button's aria-busy).
export function Spinner({ size = 'sm', className = '' }: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-spin rounded-full border-2 border-current border-e-transparent motion-reduce:animate-[spin_1.5s_linear_infinite] ${
        size === 'sm' ? 'size-4' : 'size-6'
      } ${className}`}
    />
  )
}
