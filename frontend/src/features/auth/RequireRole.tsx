import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

interface RequireRoleProps {
  /** Capacite requise, calculee par `useRole` (ex. `canViewDashboard`). */
  allow: boolean
  children: ReactNode
}

// Garde d'acces côte client. C'est de l'ERGONOMIE, pas de la securite : elle
// evite d'afficher une page a laquelle l'utilisateur n'a pas acces. Le backend
// reste l'autorite (chaque endpoint renvoie 401/403 par lui-même).
export function RequireRole({ allow, children }: RequireRoleProps) {
  if (!allow) return <Navigate to="/" replace />
  return <>{children}</>
}
