import { useAuthStore } from './auth.store'

// Deux rôles pour les comptes connectés : USER (défaut) et ADMIN. Un visiteur non
// connecté est un « invité » anonyme (aucun rôle, aucun compte) : lecture seule.
export type AppRole = 'USER' | 'ADMIN'

// Capacités dérivées de l'authentification + du rôle, centralisées ici pour qu'aucun
// composant n'écrive `role === 'ADMIN'` en dur : faire évoluer les droits ne touche
// qu'un fichier.
export function useRole() {
  const user = useAuthStore((s) => s.user)
  const role: AppRole | null = user?.role ?? null
  const isAuthenticated = user !== null

  return {
    role,
    isAuthenticated,
    // Interagir (publier / liker / commenter / suivre) = être connecté. Le visiteur
    // anonyme n'a pas de token → les écritures sont refusées côté serveur (401).
    canInteract: isAuthenticated,
    // Administrer = gérer les comptes et les rôles.
    canAdmin: role === 'ADMIN',
    // Le dashboard admin est réservé aux ADMIN.
    canViewDashboard: role === 'ADMIN',
  }
}
