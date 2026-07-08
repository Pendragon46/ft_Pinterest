interface SpinnerProps {
  /** Visual diameter: 'sm' fits inside buttons, 'md' stands alone. */
  size?: 'sm' | 'md'
  /** Extra utility classes (e.g. a color override). */
  className?: string
}

// Decorative loading ring. It is aria-hidden because the CALLER owns the
// accessible state (e.g. Button keeps its visible label and sets aria-busy),
// so screen readers never announce a lone, meaningless "spinner".
// motion-reduce: keep spinning (it conveys state) but slow it down.
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
