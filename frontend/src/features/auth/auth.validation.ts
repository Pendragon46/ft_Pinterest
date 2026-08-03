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

// Mirrors what class-validator's @IsEmail() actually accepts, because anything
// this lets through that the server rejects comes back as a raw 400 in the
// console. The loose `[^\s@]+@[^\s@]+\.[^\s@]+` it replaces accepted
// `a..b@x.com`, `.a@x.com`, `a@-x.com` and `a@x..com`, all of which the server
// refuses. Rules encoded here: no leading/trailing/doubled dot in the local
// part, domain labels neither start nor end with a hyphen, TLD of 2+ letters.
const EMAIL_PATTERN =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/

// Length bounds mirror the backend DTOs (CreateUserDto / RegisterDto), so an
// out-of-range value is caught client-side instead of returning a raw 400.
// Exported so inputs can carry the same cap as `maxLength` and stop the value
// from ever being typed past it.
export const USERNAME_MIN = 3
export const USERNAME_MAX = 30
export const FULLNAME_MAX = 50
export const BIO_MAX = 280

// A ValidationPipe 400 tells us which DTO field broke, but its sentence is
// English-only. Translate by field instead of echoing the server's wording, so
// the message still obeys the en/fr/ar contract.
const FIELD_ERROR_KEY: Record<string, AuthErrorKey> = {
  fullname: 'errors.fullnameLength',
  username: 'errors.usernameLength',
  email: 'errors.emailInvalid',
  bio: 'errors.bioLength',
  password: 'errors.passwordWeak',
}

/** i18n key for a DTO field named in an ApiError's `fieldErrors`. */
export function fieldErrorKey(field: string): AuthErrorKey | undefined {
  return FIELD_ERROR_KEY[field]
}

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
