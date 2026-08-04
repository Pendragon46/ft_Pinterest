import { useAuthStore } from './auth.store'

// Un visiteur non connecte n'a pas de rôle (lecture seule) ; sinon USER ou ADMIN.
export type AppRole = 'USER' | 'ADMIN'

export function useRole() {
  const user = useAuthStore((s) => s.user)
  const role: AppRole | null = user?.role ?? null
  const isAuthenticated = user !== null

  return {
    role,
    isAuthenticated,
    canInteract: isAuthenticated,
    canAdmin: role === 'ADMIN',
    canViewDashboard: role === 'ADMIN',
  }
}
