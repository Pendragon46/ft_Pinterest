// Mirrors backend CreateUserDto rules; validators return i18n keys, not strings.

export type AuthErrorKey =
  | 'errors.usernameRequired'
  | 'errors.usernameLength'
  | 'errors.fullnameLength'
  | 'errors.bioLength'
  | 'errors.emailRequired'
  | 'errors.emailInvalid'
  | 'errors.passwordRequired'
  | 'errors.passwordWeak'
  // Server-side outcomes surfaced on a field (409 from register).
  | 'auth.emailTaken'
  | 'auth.usernameTaken'

// Deliberately loose shape check; the real guarantee is server-side.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Length bounds mirror the backend DTOs (CreateUserDto / RegisterDto), so an
// out-of-range value is caught client-side instead of returning a raw 400.
const USERNAME_MIN = 3
const USERNAME_MAX = 30
const FULLNAME_MAX = 50
const BIO_MAX = 280

export function validateUsername(value: string): AuthErrorKey | undefined {
  const trimmed = value.trim()
  if (trimmed.length === 0) return 'errors.usernameRequired'
  if (trimmed.length < USERNAME_MIN || trimmed.length > USERNAME_MAX)
    return 'errors.usernameLength'
  return undefined
}

// Display name (Prisma `fullname`) is optional — only its length is bounded.
export function validateFullname(value: string): AuthErrorKey | undefined {
  if (value.trim().length > FULLNAME_MAX) return 'errors.fullnameLength'
  return undefined
}

// Bio is optional; backend caps it at 280 characters.
export function validateBio(value: string): AuthErrorKey | undefined {
  if (value.trim().length > BIO_MAX) return 'errors.bioLength'
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
