import { useQueries } from '@tanstack/react-query'

import { artworkKeys, fetchTileArtworks } from '../artwork.api'
import type { CanvasArtwork } from '../artwork.types'
import { ArtworkCard } from './ArtworkCard'

// The safety net from Context.MD's risk note: if the infinite canvas ever
// eats too much time or trips the zero-console-errors rule, a page can render
// THIS instead — same data, same ArtworkCard, just a plain masonry column
// layout with normal scrolling. It is intentionally boring and bulletproof.
//
// It reads a small fixed block of tiles around the origin through the exact
// same query keys as the canvas, so both share one cache with no extra code.
const FALLBACK_TILES: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [0, -1],
  [-1, 0],
  [0, 0],
]

export function ArtworkGrid() {
  const results = useQueries({
    queries: FALLBACK_TILES.map(([tx, ty]) => ({
      queryKey: artworkKeys.tile(tx, ty),
      queryFn: () => fetchTileArtworks(tx, ty),
      staleTime: Infinity,
    })),
  })

  const artworks: CanvasArtwork[] = results.flatMap((result) => result.data ?? [])

  return (
    <div className="columns-1 gap-4 p-4 sm:columns-2 lg:columns-3 xl:columns-4">
      {artworks.map((artwork) => (
        // break-inside-avoid keeps a card from splitting across two columns.
        <div key={artwork.id} className="mb-4 break-inside-avoid">
          <ArtworkCard artwork={artwork} layout="grid" />
        </div>
      ))}
    </div>
  )
}
