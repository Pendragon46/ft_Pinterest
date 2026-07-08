// Frontend mirror of the backend validation rules (the subject requires
// validating on BOTH sides). Source of truth: backend CreateUserDto —
// @IsStrongPassword() defaults = min 8 chars, at least 1 lowercase,
// 1 uppercase, 1 number and 1 symbol.
//
// Validators return i18n KEYS, not translated strings: they stay pure and
// testable, and the page translates at render time — so the message switches
// language live when the user changes locale.

export type AuthErrorKey =
  | 'errors.usernameRequired'
  | 'errors.emailRequired'
  | 'errors.emailInvalid'
  | 'errors.passwordRequired'
  | 'errors.passwordWeak'

// Deliberately simple shape check ("something@domain.tld"): the real
// guarantee is server-side. Stricter email regexes mostly reject valid
// addresses (false negatives) without adding real safety.
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
