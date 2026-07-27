import type { User } from '@/features/auth/auth.types'

// "Prénom + initiale" greeting name: "Sedra Rabemanantsoa" → "Sedra R.".
// Falls back to the username when there is no fullname (OAuth/edge accounts),
// and to the first name alone when there is no surname token.
export function formatShortName(
  user: Pick<User, 'fullname' | 'username'>,
): string {
  const full = user.fullname?.trim()
  if (!full) return user.username
  const [first, ...rest] = full.split(/\s+/)
  const lastInitial = rest.at(-1)?.[0]
  return lastInitial ? `${first} ${lastInitial.toUpperCase()}.` : first
}
