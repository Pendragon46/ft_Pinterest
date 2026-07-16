import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuthStore } from './auth.store'

// Runs the action if signed in; otherwise opens the login modal over the current page.
export function useRequireAuth() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)

  return useCallback(
    (action: () => void) => {
      if (user !== null) {
        action()
        return
      }
      // Keep the original background if already inside a modal.
      const background =
        (location.state as { background?: typeof location } | null)?.background ??
        location
      navigate('/login', { state: { background } })
    },
    [user, navigate, location],
  )
}
