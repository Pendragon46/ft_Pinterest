import { create } from 'zustand'

import type { User } from './auth.types'

interface AuthState {
  user: User | null
  // NOTE: no network here. `login` only puts a User object into the store.
  // The real API call (POST /auth/login → User) will be wired later by another
  // dev WITHOUT changing this store's interface.
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

// Derived selector — compute the connected state from `user`. Never store a
// duplicate `isAuthenticated` flag (it could drift out of sync with `user`).
export const selectIsAuthenticated = (state: AuthState): boolean =>
  state.user !== null
