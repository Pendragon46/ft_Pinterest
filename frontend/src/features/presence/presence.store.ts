import { create } from 'zustand'

interface PresenceState {
  onlineIds: Set<string>
  /** Replace the whole set (REST seed from GET /friends/online). */
  seed: (ids: string[]) => void
  /** Apply one delta from the socket's friendStatusChange event. */
  apply: (userId: string, status: 'online' | 'offline') => void
  clear: () => void
}

// The set of currently-online mutual-follow users: seeded from REST, kept live
// by the socket. A push feed, so a plain store (like toast.store), not Query.
export const usePresenceStore = create<PresenceState>()((set) => ({
  onlineIds: new Set(),
  seed: (ids) => set({ onlineIds: new Set(ids) }),
  apply: (userId, status) =>
    set((s) => {
      const next = new Set(s.onlineIds)
      if (status === 'online') next.add(userId)
      else next.delete(userId)
      return { onlineIds: next }
    }),
  clear: () => set({ onlineIds: new Set() }),
}))

/** True if the given user id is currently online. */
export function useIsOnline(userId: string): boolean {
  return usePresenceStore((s) => s.onlineIds.has(userId))
}
