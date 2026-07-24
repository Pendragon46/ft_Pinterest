import { create } from 'zustand'

interface IntroState {
  /** Non-null while a welcome reveal is queued/playing: the name to greet. */
  welcomeName: string | null
  /** Queue a personalised welcome reveal (called on explicit login success). */
  playWelcome: (name: string) => void
  /** Cleared by IntroReveal once the reveal finishes. */
  clearWelcome: () => void
}

// A one-shot welcome request, decoupled from the three sign-in entry points so
// the single root-mounted IntroReveal can replay its curtain on demand.
export const useIntroStore = create<IntroState>()((set) => ({
  welcomeName: null,
  playWelcome: (name) => set({ welcomeName: name }),
  clearWelcome: () => set({ welcomeName: null }),
}))
