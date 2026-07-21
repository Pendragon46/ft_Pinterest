import { useAuthStore } from './auth.store'

// Trois rôles : USER (défaut), GUEST (lecture seule), ADMIN.
export type AppRole = 'USER' | 'GUEST' | 'ADMIN'

// Capacités dérivées du rôle, centralisées ici pour qu'aucun composant n'écrive
// `role === 'ADMIN'` en dur : faire évoluer les rôles ne touche qu'un fichier.
export function useRole() {
  const user = useAuthStore((s) => s.user)
  const role: AppRole | null = user?.role ?? null

  return {
    role,
    isAuthenticated: user !== null,
    // GUEST = lecture seule.
    isGuest: role === 'GUEST',
    // Interagir = publier / liker / commenter / suivre (USER ou ADMIN).
    canInteract: role === 'USER' || role === 'ADMIN',
    // Administrer = gérer les comptes et les rôles.
    canAdmin: role === 'ADMIN',
    // Le dashboard admin est réservé aux ADMIN (pas de rôle modérateur).
    canViewDashboard: role === 'ADMIN',
  }
}
