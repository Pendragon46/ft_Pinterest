import { useId } from 'react'
import type { ComponentPropsWithoutRef } from 'react'

interface InputProps extends ComponentPropsWithoutRef<'input'> {
  /** Visible label — required for accessibility. */
  label: string
  /** Validation error; announced via role="alert". */
  error?: string
  /** Neutral hint; hidden while an error is shown. */
  helperText?: string
}

export function Input({
  label,
  error,
  helperText,
  id,
  className = '',
  ...rest
}: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const messageId = `${inputId}-message`
  const hasMessage = Boolean(error ?? helperText)

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="font-serif text-lg text-neutral-900">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={hasMessage ? messageId : undefined}
        className={`w-full rounded-xl border bg-white px-4 py-3 text-base text-neutral-900 transition-colors placeholder:text-neutral-400 read-only:bg-neutral-50 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 motion-reduce:transition-none ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
            : 'border-neutral-300 hover:border-neutral-400 focus:border-neutral-500 focus:ring-neutral-200'
        } ${className}`}
        {...rest}
      />
      {error ? (
        <p id={messageId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : helperText ? (
        <p id={messageId} className="text-sm text-neutral-500">
          {helperText}
        </p>
      ) : null}
    </div>
  )
}
