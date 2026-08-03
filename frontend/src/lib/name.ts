import type { User } from '@/features/auth/auth.types'

// Greeting name "Sedra Rabemanantsoa" → "Sedra R."; falls back to username when
// there's no fullname (OAuth accounts), or first name alone when no surname.
export function formatShortName(
  user: Pick<User, 'fullname' | 'username'>,
): string {
  const full = user.fullname?.trim()
  if (!full) return user.username
  const [first, ...rest] = full.split(/\s+/)
  const lastInitial = rest.at(-1)?.[0]
  return lastInitial ? `${first} ${lastInitial.toUpperCase()}.` : first
}
