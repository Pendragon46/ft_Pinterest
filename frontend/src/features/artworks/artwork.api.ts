// The artworks "API": every read the UI performs goes through here. Today each
// function resolves from the mock; when the backend lands only the bodies
// change (signatures and query keys stay identical). The artificial latency
// keeps loading states exercised.

import {
  addPostedComment,
  generateComments,
  generateDetail,
  generateTile,
} from './artwork.mock'
import type {
  ArtworkComment,
  ArtworkDetail,
  AuthorSummary,
  CanvasArtwork,
} from './artwork.types'

const TILE_LATENCY_MS = 60
const DETAIL_LATENCY_MS = 220
const POST_LATENCY_MS = 260

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

// React Query key factory — single source of truth for cache keys, kept next
// to the fetchers so invalidation can't drift from fetching.
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

/** Post a comment; the mock echoes it back with a server-shaped id (and a
    "just now" timestamp). This is the write seam — the caller inserts optimistically
    and reconciles with what this returns.
    TODO(backend): POST /artworks/:id/comments → ArtworkComment (server owns id +
    createdAt); pass the request's AbortSignal through. */
export async function postArtworkComment(
  id: string,
  input: { content: string; author: AuthorSummary },
): Promise<ArtworkComment> {
  await delay(POST_LATENCY_MS)
  const comment: ArtworkComment = {
    id: `s_${id}_${Date.now()}`,
    author: input.author,
    content: input.content,
    likeCount: 0,
    hoursAgo: 0,
  }
  addPostedComment(id, comment)
  return comment
}
