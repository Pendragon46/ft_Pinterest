import { useEffect, useMemo, useRef } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { artworkKeys, fetchTileArtworks } from '../artwork.api'
import type { CanvasArtwork } from '../artwork.types'
import { ArtworkCard } from '../components/ArtworkCard'
import { RefocusButton } from '../components/RefocusButton'
import { SearchOverlay } from '../components/SearchOverlay'
import { EasterEggLayer } from './EasterEggLayer'
import { useCanvasCamera } from './useCanvasCamera'

// The discovery map, assembled. This component wires four things together and
// otherwise stays thin — the heavy lifting is in the camera hook:
//   1. the camera (refs + one rAF loop) drives the transform and reports a
//      sparse `view` (which tiles, egg on/off, away or not);
//   2. `view.window` selects which tiles to fetch — TanStack Query is BOTH
//      the data layer and the tile cache (staleTime: Infinity → a tile is
//      fetched once, then reused; React Query GCs the ones that scroll away);
//   3. the hero overlay lives on the plane at the origin;
//   4. the easter-egg mosaic and the Refocus pill layer on top.
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

  // Expand the tile window into concrete (tx, ty) pairs. Recomputed only when
  // the window integers actually change (a few times per second at most).
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

  // One query per visible tile, all sharing the canvas cache. Infinite
  // staleTime: the mock world is immutable, so a tile never needs refetching.
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

  // Global Ctrl+K / ⌘K: jump home and focus the search — the shortcut the
  // hero advertises. Ignored while typing in another field.
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

  // After the tile window or the egg mounts/unmounts, push one synced frame so
  // the freshly mounted layers immediately get their correct opacity (their
  // initial inline opacity is 0 until the loop writes the real value).
  useEffect(() => {
    requestSync()
  }, [view.window, view.showEgg, requestSync])

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={t('home.canvasLabel')}
      tabIndex={0}
      // touch-none: we own every gesture (browser pan/zoom off). select-none
      // and overscroll-none stop text selection and rubber-banding mid-drag.
      className="relative h-full w-full touch-none select-none overflow-hidden overscroll-none bg-neutral-50 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900"
    >
      {/* The world plane. transformOrigin 0,0 so our transform math (which
          assumes the origin is the top-left) is exact. will-change-transform
          keeps it on its own compositor layer for smooth panning. */}
      <div
        ref={worldRef}
        className="absolute left-0 top-0 h-0 w-0 will-change-transform"
        style={{ transformOrigin: '0 0' }}
      >
        {/* Cards + hero share the cards layer, so they cross-fade together as
            the map zooms out toward the easter egg. */}
        <div ref={cardsLayerRef} className="absolute left-0 top-0">
          {view.window
            ? artworks.map((artwork) => (
                <ArtworkCard key={artwork.id} artwork={artwork} />
              ))
            : null}
          <SearchOverlay inputRef={searchInputRef} />
        </div>

        {/* Mounted only near full zoom-out; opacity is driven by the camera. */}
        {view.showEgg ? <EasterEggLayer layerRef={eggLayerRef} /> : null}
      </div>

      <RefocusButton visible={view.isAway} onClick={refocus} />
    </div>
  )
}
