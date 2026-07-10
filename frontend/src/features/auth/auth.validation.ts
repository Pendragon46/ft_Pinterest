// Mirrors backend CreateUserDto rules; validators return i18n keys, not strings.

export type AuthErrorKey =
  | 'errors.usernameRequired'
  | 'errors.emailRequired'
  | 'errors.emailInvalid'
  | 'errors.passwordRequired'
  | 'errors.passwordWeak'

// Deliberately loose shape check; the real guarantee is server-side.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateUsername(value: string): AuthErrorKey | undefined {
  if (value.trim().length === 0) return 'errors.usernameRequired'
  return undefined
}

export function validateEmail(value: string): AuthErrorKey | undefined {
  if (value.trim().length === 0) return 'errors.emailRequired'
  if (!EMAIL_PATTERN.test(value)) return 'errors.emailInvalid'
  return undefined
}

export function validatePassword(value: string): AuthErrorKey | undefined {
  if (value.length === 0) return 'errors.passwordRequired'
  const isStrong =
    value.length >= 8 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^a-zA-Z0-9]/.test(value)
  return isStrong ? undefined : 'errors.passwordWeak'
}
