import type { AppRole } from '@/features/auth/useRole'

// Couleurs de badge par rôle (cf. maquette : ADMIN ambre, USER bleu).
export const ROLE_BADGE: Record<AppRole, string> = {
  ADMIN: 'bg-amber-100 text-amber-800',
  USER: 'bg-blue-100 text-blue-700',
}

// Clés i18n du libellé de rôle (typées : évite un `t(variable)` non vérifié).
export const ROLE_LABEL_KEY: Record<AppRole, 'admin.role.admin' | 'admin.role.user'> = {
  ADMIN: 'admin.role.admin',
  USER: 'admin.role.user',
}

export const ALL_ROLES: AppRole[] = ['USER', 'ADMIN']
