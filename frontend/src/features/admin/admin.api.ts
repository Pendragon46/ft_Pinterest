import { http } from '@/lib/http'
import type { AppRole } from '@/features/auth/useRole'

export interface AdminUserRow {
  id: string
  fullname: string | null
  username: string
  email: string
  avatarUrl: string
  role: AppRole
  createdAt: string
  updatedAt: string
  _count: { artworks: number; comments: number }
}

export interface AdminArtworkRow {
  id: string
  title: string
  mediaUrl: string | null
  createdAt: string
  authorId: string
  author?: { id: string; username: string; fullname: string | null }
  tags?: { name: string }[]
  _count?: { likes: number; comments: number }
}

export const adminKeys = {
  users: () => ['admin', 'users'] as const,
  artworks: () => ['admin', 'artworks'] as const,
}

/** Toutes les œuvres (modération admin) — réutilise /search/artworks. */
export async function fetchAllArtworks(): Promise<AdminArtworkRow[]> {
  const { data } = await http.get<AdminArtworkRow[]>('/search/artworks', {
    params: { page: 1, limit: 200, sort: 'recent' },
  })
  return data
}

/** Supprime n'importe quelle œuvre (admin autorisé, 403 sinon). */
export async function deleteArtworkAsAdmin(id: string): Promise<void> {
  await http.delete(`/artworks/${id}`)
}

/** Liste des comptes (ADMIN only, 403 sinon). */
export async function fetchAllUsers(): Promise<AdminUserRow[]> {
  const { data } = await http.get<AdminUserRow[]>('/users')
  return data
}

/** Change le rôle (403 si auto-rétrogradation ou dernier admin). */
export async function updateUserRole(id: string, role: AppRole): Promise<void> {
  await http.patch(`/users/${id}/roles`, { role })
}

/** Supprime un compte en tant qu'administrateur. Irréversible. */
export async function deleteUserAsAdmin(id: string): Promise<void> {
  await http.delete(`/users/${id}`)
}

export interface CreateUserInput {
  fullname?: string
  username: string
  email: string
  password: string
  role: AppRole
}

/** Décode le `sub` (id) d'un JWT sans dépendance (base64url). */
function jwtSub(token: string): string | null {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')
    return (JSON.parse(atob(padded)) as { sub?: string })?.sub ?? null
  } catch {
    return null
  }
}

/** Crée un compte via l'inscription, puis applique le rôle si ≠ USER (id lu dans le JWT). */
export async function createUserAsAdmin(input: CreateUserInput): Promise<void> {
  const { data } = await http.post<{ access_token: string }>('/auth/register', {
    fullname: input.fullname,
    username: input.username,
    email: input.email,
    password: input.password,
  })
  if (input.role !== 'USER' && data?.access_token) {
    const id = jwtSub(data.access_token)
    if (id) await http.patch(`/users/${id}/roles`, { role: input.role })
  }
}
