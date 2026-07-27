import { useEffect } from 'react'
import type { ReactNode } from 'react'

import { useAuthStore } from '@/features/auth/auth.store'

import { fetchOnlineFriends } from './presence.api'
import { usePresenceStore } from './presence.store'
import { connectSocket } from './socket'

interface PresenceProviderProps {
  children: ReactNode
}

// Ties the presence stream to the auth lifecycle: for an authenticated user,
// open the socket, seed the online set from REST, and apply live deltas. The
// socket teardown itself is owned by logout (disconnectSocket).
export function PresenceProvider({ children }: PresenceProviderProps) {
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    if (!user) return
    const socket = connectSocket()
    if (!socket) return

    // Seed on mount and again after any reconnect, so a dropped socket never
    // leaves the online set stale (A-Q3).
    const seed = () => {
      fetchOnlineFriends()
        .then((ids) => usePresenceStore.getState().seed(ids))
        .catch(() => undefined)
    }
    seed()

    const onChange = (data: {
      userId: string
      status: 'online' | 'offline'
    }) => usePresenceStore.getState().apply(data.userId, data.status)

    socket.on('friendStatusChange', onChange)
    socket.on('connect', seed)
    return () => {
      socket.off('friendStatusChange', onChange)
      socket.off('connect', seed)
      usePresenceStore.getState().clear()
    }
  }, [user])

  return <>{children}</>
}
