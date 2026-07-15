import { useId, useState } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
  type,
  className = '',
  ...rest
}: InputProps) {
  const { t } = useTranslation('common')
  const autoId = useId()
  const inputId = id ?? autoId
  const messageId = `${inputId}-message`
  const hasMessage = Boolean(error ?? helperText)

  // Password fields get a reveal toggle. The type only flips locally, so the
  // field stays a real password input for the browser's manager/autofill until
  // the user asks to see it. The reveal button lives at the logical end (RTL-safe).
  const isPassword = type === 'password'
  const [reveal, setReveal] = useState(false)
  const resolvedType = isPassword ? (reveal ? 'text' : 'password') : type

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="font-serif text-lg text-neutral-900">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={resolvedType}
          aria-invalid={error ? true : undefined}
          aria-describedby={hasMessage ? messageId : undefined}
          className={`w-full rounded-xl border bg-white py-3 ps-4 ${
            isPassword ? 'pe-12' : 'pe-4'
          } text-base text-neutral-900 transition-colors placeholder:text-neutral-400 read-only:bg-neutral-50 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 motion-reduce:transition-none ${
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
              : 'border-neutral-300 hover:border-neutral-400 focus:border-neutral-500 focus:ring-neutral-200'
          } ${className}`}
          {...rest}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => {
              setReveal((value) => !value)
            }}
            aria-label={reveal ? t('form.hidePassword') : t('form.showPassword')}
            aria-pressed={reveal}
            className="absolute inset-y-0 end-0 flex cursor-pointer items-center rounded-e-xl px-3 text-neutral-500 transition-colors hover:text-neutral-800 focus-visible:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900 motion-reduce:transition-none"
          >
            {reveal ? (
              <EyeOff aria-hidden="true" className="size-5" />
            ) : (
              <Eye aria-hidden="true" className="size-5" />
            )}
          </button>
        ) : null}
      </div>
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
