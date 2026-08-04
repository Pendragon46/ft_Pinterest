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

// Toutes les œuvres (moderation admin + analytics) — reutilise /search/artworks.
// Fenêtre haute (le endpoint ne plafonne pas `limit`) pour que les totaux du
// dashboard restent exacts a l'echelle du projet.
export async function fetchAllArtworks(): Promise<AdminArtworkRow[]> {
  const { data } = await http.get<AdminArtworkRow[]>('/search/artworks', {
    params: { page: 1, limit: 1000, sort: 'recent' },
  })
  return data
}

/** Supprime n'importe quelle œuvre (admin autorise, 403 sinon). */
export async function deleteArtworkAsAdmin(id: string): Promise<void> {
  await http.delete(`/artworks/${id}`)
}

/** Liste des comptes (ADMIN only, 403 sinon). */
export async function fetchAllUsers(): Promise<AdminUserRow[]> {
  const { data } = await http.get<AdminUserRow[]>('/users')
  return data
}

// 2xx result (not 403) so the browser logs no network error.
export type AdminActionResult = { ok: true } | { ok: false; reason: string }

/** Change le rôle. Resultat `ok:false` si auto-retrogradation ou dernier admin. */
export async function updateUserRole(
  id: string,
  role: AppRole,
): Promise<AdminActionResult> {
  const { data } = await http.patch<AdminActionResult>(`/users/${id}/roles`, {
    role,
  })
  return data
}

/** Supprime un compte en tant qu'administrateur. `ok:false` si dernier admin. */
export async function deleteUserAsAdmin(id: string): Promise<AdminActionResult> {
  const { data } = await http.delete<AdminActionResult>(`/users/${id}`)
  return data
}

export interface CreateUserInput {
  fullname?: string
  username: string
  email: string
  password: string
  role: AppRole
}

/** Decode le `sub` (id) d'un JWT sans dependance (base64url). */
function jwtSub(token: string): string | null {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')
    return (JSON.parse(atob(padded)) as { sub?: string })?.sub ?? null
  } catch {
    return null
  }
}

export type CreateUserResult =
  | { ok: true }
  | { ok: false; fieldErrors?: Record<string, string> }

/** Cree un compte via l'inscription, puis applique le rôle si ≠ USER (id lu dans le JWT). */
export async function createUserAsAdmin(
  input: CreateUserInput,
): Promise<CreateUserResult> {
  const { data } = await http.post<{
    access_token?: string
    fieldErrors?: Record<string, string>
  }>('/auth/register', {
    fullname: input.fullname,
    username: input.username,
    email: input.email,
    password: input.password,
  })
  if (!data.access_token) {
    return { ok: false, fieldErrors: data.fieldErrors }
  }
  if (input.role !== 'USER') {
    const id = jwtSub(data.access_token)
    if (id) await http.patch(`/users/${id}/roles`, { role: input.role })
  }
  return { ok: true }
}
