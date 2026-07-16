export type Role = 'USER' | 'ADMIN'

// Frontend view of the Prisma `User` — mirrors the model minus `password` (and
// the server timestamps). `fullname`/`bio` are optional in Prisma; `avatarUrl`
// has a default so it is always present; the Prisma field is `roles` (not `role`).
export interface User {
  id: string
  fullname: string | null
  username: string
  email: string
  bio: string | null
  avatarUrl: string
  roles: Role
}
