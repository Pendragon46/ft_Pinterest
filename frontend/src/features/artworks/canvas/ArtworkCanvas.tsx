import { useEffect, useMemo, useRef } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { artworkKeys, fetchTileArtworks } from '../artwork.api'
import { tileSlots } from '../artwork.mock'
import type { CanvasArtwork } from '../artwork.types'
import { ArtworkCard } from '../components/ArtworkCard'
import { RefocusButton } from '../components/RefocusButton'
import { SearchOverlay } from '../components/SearchOverlay'
import { EasterEggLayer } from './EasterEggLayer'
import { SkeletonCell } from './SkeletonCell'
import { useCanvasCamera } from './useCanvasCamera'

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

  // One query per visible tile; infinite staleTime since the mock world is immutable.
  const tileQueries = useQueries({
    queries: tiles.map(({ tx, ty }) => ({
      queryKey: artworkKeys.tile(tx, ty),
      queryFn: () => fetchTileArtworks(tx, ty),
      staleTime: Infinity,
    })),
  })

  const artworks: CanvasArtwork[] = tileQueries.flatMap(
    (query) => query.data ?? [],
  )

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
                      />
                    ))
                  : null,
              )}
              {artworks.map((artwork) => (
                <ArtworkCard key={artwork.id} artwork={artwork} />
              ))}
            </>
          ) : null}
          <SearchOverlay inputRef={searchInputRef} />
        </div>

        {/* Mounted only near full zoom-out; opacity is driven by the camera. */}
        {view.showEgg ? <EasterEggLayer layerRef={eggLayerRef} /> : null}
      </div>

      <RefocusButton visible={view.isAway} onClick={refocus} />
    </div>
  )
}
