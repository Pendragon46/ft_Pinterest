import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

// The active creator "universe", mirrored in the URL as `?creator=<id>` so it is
// shareable and survives a refresh. Entering one leaves any active niche.
export function useCreator(): {
  creatorId: string | null
  enterCreator: (id: string) => void
  exitCreator: () => void
} {
  const [params, setParams] = useSearchParams()
  const creatorId = params.get('creator')

  const enterCreator = useCallback(
    (id: string) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('q')
        next.set('creator', id)
        return next
      })
    },
    [setParams],
  )

  const exitCreator = useCallback(() => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('creator')
      return next
    })
  }, [setParams])

  return { creatorId, enterCreator, exitCreator }
}
