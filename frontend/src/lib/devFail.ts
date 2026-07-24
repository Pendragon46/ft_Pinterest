// DEV-ONLY: with `?failMutations` in the URL, mock mutations reject after their
// latency — so the optimistic-rollback + retry-toast path is exercisable now, before
// the real backend can actually fail. TODO(backend): delete once mutations are real.
export function maybeFailMutation(): void {
  if (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('failMutations')
  ) {
    throw new Error('Simulated mutation failure')
  }
}
