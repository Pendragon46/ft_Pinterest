import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Crossroads } from '@/features/search/components/Crossroads'
import { fetchNicheTile, searchKeys } from '@/features/search/search.api'
import { useNiche } from '@/features/search/useNiche'
import { useNicheCompletion } from '@/features/search/useNicheCompletion'

import { artworkKeys, fetchTileArtworks } from '../artwork.api'
import { tileSlots } from '../artwork.mock'
import type { CanvasArtwork } from '../artwork.types'
import { ArtworkCard } from '../components/ArtworkCard'
import { RefocusButton } from '../components/RefocusButton'
import { SearchOverlay } from '../components/SearchOverlay'
import { EasterEggLayer } from './EasterEggLayer'
import { SkeletonCell } from './SkeletonCell'
import { useCanvasCamera } from './useCanvasCamera'

// Centre-out reveal wave (§5.3): tiles fade in staggered by their distance from
// the hero (world origin), so niche content ripples outward from the search bar.
const WAVE_SPEED = 1.5 // world px per ms
const WAVE_CAP = 700 // ms — farthest tile never waits longer than this
const WAVE_DURATION = 1100 // ms — window during which the stagger applies

// The discovery map: the camera hook drives the transform and reports which
// tiles to mount; TanStack Query is both the data layer and the tile cache.
export function ArtworkCanvas() {
  const { t } = useTranslation('common')
  const {
    containerRef,
    worldRef,
    cardsLayerRef,
    eggLayerRef,
    view,
    refocus,
    requestSync,
  } = useCanvasCamera()
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const { niche, enterNiche, exitNiche } = useNiche()
  const nicheSlug = niche?.slug ?? null

  // The hero never moves (§5.0). Entering a niche reorganises the content in
  // place: a centre-out wave staggers the tile reveal for ~WAVE_DURATION.
  const [waving, setWaving] = useState(false)
  const lastSlug = useRef(nicheSlug)
  useEffect(() => {
    if (nicheSlug === lastSlug.current) return
    lastSlug.current = nicheSlug
    let cancelled = false
    // setState only inside timers → not synchronous in the effect body.
    const on = setTimeout(() => {
      if (!cancelled) setWaving(true)
    }, 0)
    const off = setTimeout(() => {
      if (!cancelled) setWaving(false)
    }, WAVE_DURATION)
    return () => {
      cancelled = true
      clearTimeout(on)
      clearTimeout(off)
    }
  }, [nicheSlug])

  const revealDelayFor = (centreX: number, centreY: number): number =>
    waving ? Math.min(WAVE_CAP, Math.hypot(centreX, centreY) / WAVE_SPEED) : 0

  // Expand the tile window into concrete (tx, ty) pairs.
  const tiles = useMemo(() => {
    const window = view.window
    if (!window) return [] as Array<{ tx: number; ty: number }>
    const list: Array<{ tx: number; ty: number }> = []
    for (let ty = window.minTy; ty <= window.maxTy; ty++) {
      for (let tx = window.minTx; tx <= window.maxTx; tx++) {
        list.push({ tx, ty })
      }
    }
    return list
  }, [view.window])

  // One query per visible tile. In a niche the content comes from the niche's
  // (toroidal) tiles; otherwise from the global map. Swapping the source on
  // search is what makes the surrounding tiles reorganise in place.
  const tileQueries = useQueries({
    queries: tiles.map(({ tx, ty }) =>
      niche
        ? {
            queryKey: searchKeys.nicheTile(niche.slug, tx, ty),
            queryFn: () => fetchNicheTile(niche.slug, tx, ty),
            staleTime: Infinity,
          }
        : {
            queryKey: artworkKeys.tile(tx, ty),
            queryFn: () => fetchTileArtworks(tx, ty),
            staleTime: Infinity,
          },
    ),
  })

  const artworks: CanvasArtwork[] = tileQueries.flatMap(
    (query) => query.data ?? [],
  )

  // 100% = every unique item of the niche's "unique tile" has been on screen
  // (§8.1). Passive (effect-based); drives the Where next? crossroads (§8, next).
  const nicheComplete = useNicheCompletion(niche, view.cells)

  // Global Ctrl+K / ⌘K: jump home and focus search. Ignored while typing elsewhere.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        const active = document.activeElement
        const typingElsewhere =
          active instanceof HTMLElement &&
          active !== searchInputRef.current &&
          (active.tagName === 'INPUT' ||
            active.tagName === 'TEXTAREA' ||
            active.tagName === 'SELECT')
        if (typingElsewhere) return
        event.preventDefault()
        refocus()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [refocus])

  // Push one synced frame after mount so new layers get their real opacity
  // (their initial inline opacity is 0 until the loop writes the real value).
  useEffect(() => {
    requestSync()
  }, [view.window, view.showEgg, requestSync])

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={t('home.canvasLabel')}
      data-niche-complete={nicheComplete ? 'true' : undefined}
      tabIndex={0}
      // touch-none: we own every gesture; select-none and overscroll-none stop
      // text selection and rubber-banding mid-drag.
      className="relative h-full w-full cursor-grab touch-none select-none overflow-hidden overscroll-none bg-neutral-50 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900 active:cursor-grabbing"
    >
      {/* World plane. transformOrigin 0,0 keeps the transform math exact;
          will-change-transform keeps it on its own compositor layer. */}
      <div
        ref={worldRef}
        className="absolute left-0 top-0 h-0 w-0 will-change-transform"
        style={{ transformOrigin: '0 0' }}
      >
        {/* Cards + hero share this layer so they cross-fade together on zoom-out. */}
        <div ref={cardsLayerRef} className="absolute left-0 top-0">
          {view.window ? (
            <>
              {tiles.map((tile, index) =>
                tileQueries[index]?.isPending
                  ? tileSlots(tile.tx, tile.ty).map((slot, slotIndex) => (
                      <SkeletonCell
                        key={`skeleton-${tile.tx}-${tile.ty}-${slotIndex}`}
                        slot={slot}
                        revealDelay={revealDelayFor(
                          slot.x + slot.width / 2,
                          slot.y + slot.height / 2,
                        )}
                      />
                    ))
                  : null,
              )}
              {artworks.map((artwork) => (
                <ArtworkCard
                  key={artwork.id}
                  artwork={artwork}
                  revealDelay={revealDelayFor(
                    artwork.x + artwork.width / 2,
                    artwork.y + artwork.height / 2,
                  )}
                />
              ))}
            </>
          ) : null}
          {/* Hero lives in the world layer: it pans/zooms with the map, and stays
              fixed at the origin through the search transition (§5.0). */}
          <SearchOverlay
            inputRef={searchInputRef}
            niche={niche}
            onSubmit={enterNiche}
            onExit={() => {
              exitNiche()
              refocus()
            }}
          />
        </div>

        {/* Mounted only near full zoom-out; opacity is driven by the camera. */}
        {view.showEgg ? <EasterEggLayer layerRef={eggLayerRef} /> : null}
      </div>

      {/* At 100% of a niche, Refocus morphs into the Where next? crossroads
          (§8.3); it never reverts to plain Refocus while complete (§8.7). */}
      {niche && nicheComplete ? (
        <Crossroads
          niche={niche}
          onPick={(slug) => {
            refocus()
            enterNiche(slug)
          }}
        />
      ) : (
        <RefocusButton visible={view.isAway} onClick={refocus} />
      )}
    </div>
  )
}
