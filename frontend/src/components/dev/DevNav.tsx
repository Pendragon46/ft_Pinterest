// TEMPORARY DEV NAVIGATION — remove before production. Labels hardcoded on purpose.
import { Link, useLocation } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/auth.store'
import { AuthButton } from '@/features/auth/components/AuthButton'

export function DevNav() {
  const location = useLocation()
  const login = useAuthStore((state) => state.login)
  const logout = useAuthStore((state) => state.logout)

  return (
    <nav className="fixed inset-x-0 top-0 z-40 flex flex-wrap items-center gap-4 bg-neutral-900 px-4 py-2 text-sm text-neutral-100">
      <Link to="/" className="hover:text-white">
        Home
      </Link>
      {/* Modal routes: stash the current page as the background. */}
      <Link to="/login" state={{ background: location }} className="hover:text-white">
        Login
      </Link>
      <Link
        to="/register"
        state={{ background: location }}
        className="hover:text-white"
      >
        Register
      </Link>
      <Link to="/profile" className="hover:text-white">
        Profile
      </Link>
      {/* Direct access (no background) → full-page fallback, for testing. */}
      <Link to="/login" className="hover:text-white">
        Login (full page)
      </Link>
      <Link to="/nope" className="hover:text-white">
        404 test
      </Link>
      <Link to="/dev/ui" className="hover:text-white">
        UI kit
      </Link>
      {/* w_1_1 is a deterministic non-empty cell (w_0_0 sits in the empty hero clearing). */}
      <Link
        to="/artwork/w_1_1"
        state={{ background: location }}
        className="hover:text-white"
      >
        Artwork
      </Link>

      {/* TEMPORARY: live AuthButton preview + auth-state simulators (no backend). */}
      <span className="ms-auto flex items-center gap-2">
        <AuthButton />
        <button
          type="button"
          onClick={() => {
            login({
              id: 'dev-user',
              username: 'srabeman',
              email: 'dev@atlaas.app',
              bio: '',
              avatarUrl: null,
              role: 'USER',
            })
          }}
          className="rounded bg-neutral-700 px-2 py-0.5 hover:bg-neutral-600"
        >
          Simulate login
        </button>
        <button
          type="button"
          onClick={() => {
            logout()
          }}
          className="rounded bg-neutral-700 px-2 py-0.5 hover:bg-neutral-600"
        >
          Simulate logout
        </button>
      </span>
    </nav>
  )
}
