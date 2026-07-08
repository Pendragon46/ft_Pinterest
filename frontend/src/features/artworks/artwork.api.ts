// The artworks "API" — every read the UI performs goes through here.
//
// Today each function resolves from the deterministic mock. The day the
// backend lands, ONLY the bodies below change (axios calls via lib/axios,
// wired to TanStack's AbortSignal); the signatures and the query keys stay
// identical, so nothing else in the app moves. A small artificial latency
// keeps the async contract honest: loading states are exercised now, not
// discovered in production.

import { generateComments, generateDetail, generateTile } from './artwork.mock'
import type { ArtworkComment, ArtworkDetail, CanvasArtwork } from './artwork.types'

const TILE_LATENCY_MS = 60
const DETAIL_LATENCY_MS = 220

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

/** React Query key factory — the single source of truth for cache keys.
    Keeping keys here (next to the fetchers) means invalidation code can
    never drift from fetching code. */
export const artworkKeys = {
  tile: (tx: number, ty: number) => ['artworks', 'tile', tx, ty] as const,
  detail: (id: string) => ['artworks', 'detail', id] as const,
  comments: (id: string) => ['artworks', 'comments', id] as const,
}

/** Cards of one map tile.
    TODO(backend): GET /artworks/map?tx=&ty= → CanvasArtwork[] */
export async function fetchTileArtworks(
  tx: number,
  ty: number,
): Promise<CanvasArtwork[]> {
  await delay(TILE_LATENCY_MS)
  return generateTile(tx, ty)
}

/** One artwork, full.
    TODO(backend): GET /artworks/:id → ArtworkDetail (404 if unknown) */
export async function fetchArtworkDetail(id: string): Promise<ArtworkDetail> {
  await delay(DETAIL_LATENCY_MS)
  const detail = generateDetail(id)
  if (!detail) throw new Error(`Artwork not found: ${id}`)
  return detail
}

/** Comments of one artwork, newest first.
    TODO(backend): GET /artworks/:id/comments → ArtworkComment[] */
export async function fetchArtworkComments(
  id: string,
): Promise<ArtworkComment[]> {
  await delay(DETAIL_LATENCY_MS)
  return generateComments(id)
}
