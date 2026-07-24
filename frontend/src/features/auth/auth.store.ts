import { create } from 'zustand'

import { usePresenceStore } from '@/features/presence/presence.store'
import { disconnectSocket } from '@/features/presence/socket'

import type { User } from './auth.types'
import { tokenStore } from './token'

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
  // Full teardown so every caller (menu button, delete dialog, 401 interceptor)
  // ends the session for real: drop the token so it is never sent again, cut the
  // presence socket, and clear cached presence.
  logout: () => {
    tokenStore.clear()
    disconnectSocket()
    usePresenceStore.getState().clear()
    set({ user: null })
  },
}))

// Derived, never stored — avoids drifting out of sync with `user`.
export const selectIsAuthenticated = (state: AuthState): boolean =>
  state.user !== null
