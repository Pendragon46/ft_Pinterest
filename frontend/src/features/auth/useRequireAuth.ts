import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuthStore } from './auth.store'

// Gate for actions that need an account (like, save, follow, comment).
// Returns a function: call it, and if the user is signed in it runs the
// action; if not, it opens the login modal ON TOP of wherever we are and
// skips the action. It reuses the same modal-route pattern as the rest of
// the app (stash the current page as `background`), so after signing in the
// user is still looking at the artwork they were on.
//
// The store is network-free for now (Context.MD); when real auth lands, this
// hook doesn't change — only the store's `login` gets wired to the API.
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
      // Keep the ORIGINAL background if we're already inside a modal, so the
      // login card opens over the real page, not over another overlay.
      const background =
        (location.state as { background?: typeof location } | null)?.background ??
        location
      navigate('/login', { state: { background } })
    },
    [user, navigate, location],
  )
}
