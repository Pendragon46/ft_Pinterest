import { RotateCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { fetchNeighbours, searchKeys } from '../search.api'
import type { Niche, NicheNeighbour } from '../search.types'

interface CrossroadsProps {
  niche: Niche
  /** Selecting a neighbour runs the standard niche-entry transition (§5, §8.6). */
  onPick: (slug: string) => void
}

/**
 * The *Where next?* crossroads (§8). Shown once a niche is 100% explored: a
 * message plus three tag-proximity neighbours (each a dark pill with a colour
 * preview) and a refresh that walks outward to farther neighbours. Collapses to a
 * small pill when the user keeps exploring, and never reverts to plain Refocus
 * (§8.7). Picking a neighbour hands back to the shared transition.
 */
export function Crossroads({ niche, onPick }: CrossroadsProps) {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(true)
  const [offset, setOffset] = useState(0)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const neighboursQuery = useQuery({
    queryKey: searchKeys.neighbours(niche.slug),
    queryFn: () => fetchNeighbours(niche.slug),
    staleTime: 60_000,
  })
  const all = neighboursQuery.data ?? []
  const trio: NicheNeighbour[] = all.length
    ? [0, 1, 2].map((i) => all[(offset + i) % all.length])
    : []

  // Collapse when the user starts exploring again (a press outside the bar).
  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true)
        }}
        className="absolute bottom-6 left-1/2 flex h-10 -translate-x-1/2 animate-reveal items-center rounded-full bg-neutral-900 px-4 text-sm font-medium text-white shadow-lg transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 motion-reduce:animate-none"
      >
        {t('search.whereNextShort')}
      </button>
    )
  }

  return (
    <div
      ref={rootRef}
      className="absolute bottom-6 left-1/2 flex max-w-[92vw] -translate-x-1/2 animate-reveal flex-wrap items-center justify-center gap-x-4 gap-y-3 rounded-3xl bg-white/85 px-5 py-3 shadow-lg backdrop-blur motion-reduce:animate-none"
    >
      <p className="font-serif text-lg text-neutral-900">
        {t('search.whereNext', { niche: t(`category.${niche.slug}`) })}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {trio.map((neighbour) => (
          <button
            key={neighbour.niche.slug}
            type="button"
            onClick={() => {
              onPick(neighbour.niche.slug)
            }}
            className="group flex h-10 items-center gap-2 rounded-full bg-neutral-900 pe-4 ps-1 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            <span
              aria-hidden="true"
              style={{
                background: `conic-gradient(${neighbour.previews.join(', ')}, ${neighbour.previews[0]})`,
              }}
              className="size-8 shrink-0 rounded-full transition-transform duration-150 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
            {t(`category.${neighbour.niche.slug}`)}
          </button>
        ))}
        <button
          type="button"
          aria-label={t('search.refreshNeighbours')}
          onClick={() => {
            setOffset((current) => current + 3)
          }}
          className="flex size-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
        >
          <RotateCw aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  )
}
