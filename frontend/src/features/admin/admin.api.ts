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

/** Toutes les œuvres (pour la modération admin). Réutilise /search/artworks
    qui renvoie déjà auteur + `_count` ; pagination côté client. */
export async function fetchAllArtworks(): Promise<AdminArtworkRow[]> {
  const { data } = await http.get<AdminArtworkRow[]>('/search/artworks', {
    params: { page: 1, limit: 200, sort: 'recent' },
  })
  return data
}

/** Supprime n'importe quelle œuvre en tant qu'admin (le serveur autorise
    l'auteur OU un ADMIN, 403 sinon). */
export async function deleteArtworkAsAdmin(id: string): Promise<void> {
  await http.delete(`/artworks/${id}`)
}

/** Liste des comptes. Réservée ADMIN côté serveur : un USER (ou visiteur) reçoit 403,
    que l'UI masque déjà le lien ou non. */
export async function fetchAllUsers(): Promise<AdminUserRow[]> {
  const { data } = await http.get<AdminUserRow[]>('/users')
  return data
}

/** Change le rôle d'un compte. Le serveur refuse l'auto-rétrogradation et la
    suppression du dernier administrateur (403). */
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

/** Crée un compte via l'inscription (POST /auth/register, public) puis applique
    le rôle choisi si ce n'est pas USER. Le backend n'a pas d'endpoint dédié à la
    création par un admin — on réutilise l'inscription. Le rôle est posé avec le
    token admin courant (intercepteur), l'id venant du JWT du nouveau compte. */
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
