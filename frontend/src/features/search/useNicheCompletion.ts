import { useEffect, useRef, useState } from 'react'

import { nicheCellIndex } from './search.mock'
import type { Niche } from './search.types'

/** Inclusive cell range currently on screen (no off-screen margin). */
interface CellRange {
  minCx: number
  maxCx: number
  minCy: number
  maxCy: number
}

/**
 * How much of a niche the user has explored. A niche repeats N unique items
 * toroidally, so completion is measured against that unique set — never the
 * infinite looped plane (§8.1). Resets when the niche changes. Runs entirely in
 * an effect + ref (never during render) so it can't disturb the search-transition
 * render. No progress read-out before 100% — the crossroads is the only
 * completion signal (§8.2).
 */
export function useNicheCompletion(
  niche: Niche | null,
  cells: CellRange | null,
): boolean {
  const seen = useRef<Set<number>>(new Set())
  const trackedSlug = useRef<string | null>(niche?.slug ?? null)
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    const slug = niche?.slug ?? null
    if (slug !== trackedSlug.current) {
      trackedSlug.current = slug
      seen.current = new Set()
    }
    if (niche && cells) {
      for (let cy = cells.minCy; cy <= cells.maxCy; cy++) {
        for (let cx = cells.minCx; cx <= cells.maxCx; cx++) {
          const index = nicheCellIndex(niche.slug, cx, cy)
          if (index !== null) seen.current.add(index)
        }
      }
    }
    const done = niche !== null && seen.current.size >= niche.contentSize
    if (done !== complete) {
      // Deferred so setState never fires synchronously inside the effect body.
      const timer = setTimeout(() => {
        setComplete(done)
      }, 0)
      return () => {
        clearTimeout(timer)
      }
    }
  }, [niche, cells, complete])

  return complete
}
