export type Role = 'USER' | 'GUEST' | 'ADMIN'

// Frontend view of the Prisma `User` — mirrors the model minus `password` (and
// the server timestamps). `fullname`/`bio` are optional in Prisma; `avatarUrl`
// has a default so it is always present. GET /auth/me returns the Prisma user,
// whose role field is `role` (singular).
export interface User {
  id: string
  fullname: string | null
  username: string
  email: string
  bio: string | null
  avatarUrl: string
  role: Role
}
