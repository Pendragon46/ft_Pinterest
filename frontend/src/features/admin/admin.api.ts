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

export const adminKeys = {
  users: () => ['admin', 'users'] as const,
}

/** Liste des comptes. Réservée ADMIN côté serveur : un USER/GUEST reçoit 403,
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

/** Crée un compte via l'inscription (POST /users, public) puis applique le
    rôle choisi si ce n'est pas USER. Le backend n'a pas d'endpoint dédié à la
    création par un admin — on réutilise l'inscription. */
export async function createUserAsAdmin(input: CreateUserInput): Promise<void> {
  const { data } = await http.post<{ id: string }>('/users', {
    fullname: input.fullname,
    username: input.username,
    email: input.email,
    password: input.password,
  })
  if (input.role !== 'USER' && data?.id) {
    await http.patch(`/users/${data.id}/roles`, { role: input.role })
  }
}
