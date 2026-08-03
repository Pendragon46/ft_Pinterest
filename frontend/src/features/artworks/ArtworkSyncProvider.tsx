import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/features/auth/auth.store'
import { connectSocket } from '@/features/presence/socket'

import { artworkKeys } from './artwork.api'

interface ArtworkSyncProviderProps {
  children: ReactNode
}

// Keeps every open window's artwork cache honest. Without it, deleting a work
// in one window left it clickable in another: the click fired a GET for a row
// that no longer exists, which the browser logged as a 404 (issue #27). The
// server broadcasts the deletion, so the other windows drop it before the user
// can reach it.
//
// A window with no socket (signed-out visitor, offline tab) still falls back to
// the "Artwork not found" screen — a genuinely stale client cannot know without
// asking, and that request legitimately 404s.
export function ArtworkSyncProvider({ children }: ArtworkSyncProviderProps) {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user) return
    const socket = connectSocket()
    if (!socket) return

    const onDeleted = ({ id }: { id: string }) => {
      // Drop the dead entries outright; no observer can be mounted on a work
      // the user is not currently viewing, and if they are, the detail page
      // handles the miss on its own.
      queryClient.removeQueries({ queryKey: artworkKeys.detail(id) })
      queryClient.removeQueries({ queryKey: artworkKeys.comments(id) })
      // Refetch the lists that may still contain the card. The prefix covers
      // the feed and every canvas tile in one call.
      void queryClient.invalidateQueries({ queryKey: ['artworks'] })
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    }

    socket.on('artwork:deleted', onDeleted)
    return () => {
      socket.off('artwork:deleted', onDeleted)
    }
  }, [user, queryClient])

  return <>{children}</>
}
