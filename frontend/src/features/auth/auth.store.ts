import { create } from 'zustand'

import type { User } from './auth.types'

interface AuthState {
  user: User | null
  // No network here — login just stores a User; API wiring lands later.
  login: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  login: (user) => {
    set({ user })
  },
  logout: () => {
    set({ user: null })
  },
}))

// Derived, never stored — avoids drifting out of sync with `user`.
export const selectIsAuthenticated = (state: AuthState): boolean =>
  state.user !== null
