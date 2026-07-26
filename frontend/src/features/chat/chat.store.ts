import { create } from 'zustand'

interface ChatState {
  open: boolean
  view: 'list' | 'thread' | 'new'
  activeId: string | null
  /** Draft per conversation: survives closing the panel. */
  drafts: Record<string, string>

  togglePanel: () => void
  openPanel: () => void
  closePanel: () => void
  openThread: (conversationId: string) => void
  backToList: () => void
  openNewMessage: () => void
  setDraft: (conversationId: string, text: string) => void
  reset: () => void
}

// UI state only; conversations/messages live in the Query cache (CHAT_SPEC D5).
export const useChatStore = create<ChatState>()((set) => ({
  open: false,
  view: 'list',
  activeId: null,
  drafts: {},

  togglePanel: () => set((s) => ({ open: !s.open, view: s.open ? s.view : 'list' })),
  openPanel: () => set({ open: true, view: 'list' }),
  closePanel: () => set({ open: false }),
  openThread: (conversationId) =>
    set({ open: true, view: 'thread', activeId: conversationId }),
  backToList: () => set({ view: 'list', activeId: null }),
  openNewMessage: () => set({ view: 'new' }),
  setDraft: (conversationId, text) =>
    set((s) => ({ drafts: { ...s.drafts, [conversationId]: text } })),
  reset: () => set({ open: false, view: 'list', activeId: null, drafts: {} }),
}))
