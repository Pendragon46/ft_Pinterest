import { useLocation, useNavigate } from 'react-router-dom'

import { DEFAULT_AVATAR } from '@/lib/avatar'

import { useAuthStore } from './auth.store'

// DEV STOPGAP: there is no backend yet, so the auth forms sign you in with a
// mock user and close the modal — making auth-gated features (like, save,
// follow, comment) testable. TODO(backend): replace the call sites with the
// real POST /auth/login | POST /users, then delete this hook.
export function useDevSignIn() {
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()
  const location = useLocation()
  const inModal = Boolean(
    (location.state as { background?: unknown } | null)?.background,
  )

  return (email: string, username?: string) => {
    login({
      id: 'dev-user',
      fullname: 'Sedra Rabe',
      username: username ?? 'sedra',
      email,
      bio: 'Designer exploring the edges of the creative universe.',
      avatarUrl: DEFAULT_AVATAR,
      roles: 'USER',
    })
    if (inModal) navigate(-1)
    else navigate('/')
  }
}
