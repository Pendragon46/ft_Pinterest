export type Role = 'USER' | 'ADMIN'

// Frontend view of the Prisma user — no password, no timestamps.
export interface User {
  id: string
  username: string
  email: string
  bio: string
  avatarUrl?: string | null
  role: Role
}
