import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

interface RequireRoleProps {
  /** Capacité requise, calculée par `useRole` (ex. `canViewDashboard`). */
  allow: boolean
  children: ReactNode
}

// Garde d'accès côté client. C'est de l'ERGONOMIE, pas de la sécurité : elle
// évite d'afficher une page à laquelle l'utilisateur n'a pas accès. Le backend
// reste l'autorité (chaque endpoint renvoie 401/403 par lui-même).
export function RequireRole({ allow, children }: RequireRoleProps) {
  if (!allow) return <Navigate to="/" replace />
  return <>{children}</>
}
