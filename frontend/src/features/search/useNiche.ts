import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

import { getNiche, resolveSearch } from './search.mock'
import type { Niche } from './search.types'

/**
 * The active niche, mirrored in the URL as `?q=<slug>` so it is shareable and
 * survives a refresh. `enterNiche` resolves a raw term to its canonical niche
 * before storing it (§5); `exitNiche` clears the query.
 */
export function useNiche(): {
  niche: Niche | null
  enterNiche: (term: string) => void
  exitNiche: () => void
} {
  const [params, setParams] = useSearchParams()
  const niche = getNiche(params.get('q') ?? '')

  const enterNiche = useCallback(
    (term: string) => {
      const slug = resolveSearch(term).niche.slug
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('creator')
        next.set('q', slug)
        return next
      })
    },
    [setParams],
  )

  const exitNiche = useCallback(() => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('q')
      return next
    })
  }, [setParams])

  return { niche, enterNiche, exitNiche }
}
