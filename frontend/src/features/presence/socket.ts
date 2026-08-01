import { io, type Socket } from 'socket.io-client'

import { tokenStore } from '@/features/auth/token'

// The app's single Socket.IO connection, authenticated with the stored JWT —
// the client half of the backend presence gateway. Same-origin by default
// (nginx proxies /socket.io/ to the backend); VITE_WS_URL can override.
let socket: Socket | null = null

// Idempotent: open the socket once, after explicit auth. Returns null with no
// token (the gateway rejects unauthenticated handshakes).
export function connectSocket(): Socket | null {
  // Reuse the instance in ANY state (connecting, connected, reconnecting), not
  // only when already connected — otherwise two callers racing during the
  // connect handshake (ChatProvider + PresenceProvider) each open a socket, and
  // the orphaned one keeps the user "online" after logout closes just the ref.
  if (socket) return socket
  const token = tokenStore.get()
  if (!token) return null
  // Prefer WebSocket: polling fires repeated XHRs that spam Firefox's "Local Network
  // Access" console log on localhost. nginx proxies the WS upgrade; polling is fallback.
  socket = io(import.meta.env.VITE_WS_URL ?? '/', {
    auth: { token },
    transports: ['websocket', 'polling'],
  })
  return socket
}

// Tear the socket down (called from logout) so mutuals see the user go offline.
export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}

export function getSocket(): Socket | null {
  return socket
}
