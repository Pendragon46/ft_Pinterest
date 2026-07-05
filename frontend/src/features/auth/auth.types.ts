export type Role = 'USER' | 'ADMIN'

// User as the frontend displays it — derived from the Prisma model but WITHOUT
// `password` (the frontend must never handle it) and without createdAt/updatedAt
// (not used by the UI yet). avatarUrl is optional/nullable (Prisma `String?`).
export interface User {
  id: string
  username: string
  email: string
  bio: string
  avatarUrl?: string | null
  role: Role
}
