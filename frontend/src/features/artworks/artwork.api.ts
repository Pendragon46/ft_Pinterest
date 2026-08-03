import type { QueryClient } from '@tanstack/react-query'

import { http, isApiError, multipartConfig } from '@/lib/http'
import { TILE_CELLS } from '@/features/artworks/canvas/canvas.constants'
import { layoutTile, pageForTile } from '@/features/search/tile.layout'
import {
  realArtworkId,
  toArtworkComment,
  toArtworkDetail,
  type ServerArtwork,
  type ServerComment,
  type ServerLike,
} from '@/lib/mappers'

import type {
  ArtworkComment,
  ArtworkDetail,
  CanvasArtwork,
} from './artwork.types'

export const artworkKeys = {
  tile: (tx: number, ty: number, totalPages: number) =>
    ['artworks', 'tile', tx, ty, totalPages] as const,
  count: () => ['artworks', 'count'] as const,
  feed: () => ['artworks', 'feed'] as const,
  feedTile: (tx: number, ty: number) =>
    ['artworks', 'feed', 'tile', tx, ty] as const,
  detail: (id: string) => ['artworks', 'detail', id] as const,
  comments: (id: string) => ['artworks', 'comments', id] as const,
  /** Chat link preview. Separate from `detail` because a miss is cached as
      `null` here, which must never leak into the real artwork page. */
  linkPreview: (id: string) => ['artworks', 'linkPreview', id] as const,
}

/**
 * Refetch everything the infinite canvas draws from.
 *
 * Every tile query is `staleTime: Infinity` (ArtworkCanvas), which is what keeps
 * panning cheap — but it also means a tile never refreshes on its own. Publish,
 * edit or delete therefore has to say so explicitly, or the new work simply is
 * not on the map and a deleted one stays clickable.
 *
 * Prefixes, not the bare `['artworks']`: that would also match `linkPreview`,
 * whose cached "this artwork is gone" entry must survive (see
 * ArtworkSyncProvider).
 */
export function invalidateCanvas(queryClient: QueryClient): void {
  // ['artworks','count'] — feeds totalPages, itself part of the tile key.
  void queryClient.invalidateQueries({ queryKey: artworkKeys.count() })
  // ['artworks','tile',…] global map, ['artworks','feed',…] signed-in feed
  // (covers feedTile, which nests under it).
  void queryClient.invalidateQueries({ queryKey: ['artworks', 'tile'] })
  void queryClient.invalidateQueries({ queryKey: artworkKeys.feed() })
  // ['search',…] niche and creator tiles.
  void queryClient.invalidateQueries({ queryKey: ['search'] })
}

// Total published works → number of 16-item pages the canvas can spread tiles
// across. Without it, pageForTile assumed a fixed 5 pages: with more works most
// stayed off the map, with fewer some tiles hit empty pages. One cached request.
export async function fetchArtworkCount(): Promise<number> {
  const { data } = await http.get<ServerArtwork[]>('/search/artworks', {
    params: { page: 1, limit: 1000, sort: 'recent' },
  })
  return data.length
}

export async function fetchTileArtworks(
  tx: number,
  ty: number,
  totalPages: number,
): Promise<CanvasArtwork[]> {
  const page = pageForTile(tx, ty, totalPages)
  const { data } = await http.get<ServerArtwork[]>('/search/artworks', {
    params: { page, limit: 16, sort: 'recent' },
  })
  return layoutTile(data, undefined, tx, ty)
}

// Friends-first pool rotated by tile distance: the centre shows friends, outward
// tiles vary into the general pool (no wall of repeats).
export async function fetchFeedTile(
  tx: number,
  ty: number,
): Promise<CanvasArtwork[]> {
  try {
    const { data } = await http.get<ServerArtwork[]>('/artworks/feed')
    if (data.length === 0) return []
    const offset =
      ((Math.abs(tx) + Math.abs(ty)) * TILE_CELLS * TILE_CELLS) % data.length
    const rotated = offset
      ? [...data.slice(offset), ...data.slice(0, offset)]
      : data
    return layoutTile(rotated, undefined, tx, ty)
  } catch {
    return []
  }
}

export async function fetchArtworkDetail(id: string): Promise<ArtworkDetail> {
  const { data } = await http.get<ServerArtwork>(
    `/artworks/${realArtworkId(id)}`,
  )
  return toArtworkDetail(data)
}

export async function fetchArtworkComments(
  id: string,
): Promise<ArtworkComment[]> {
  const { data } = await http.get<ServerComment[]>(
    `/artworks/${realArtworkId(id)}/comments`,
  )
  // Newest first, on the real timestamp. Sorting on `hoursAgo` compared values
  // floored to the hour, so a comment posted seconds ago tied with every other
  // comment from the same hour and could be shown below them.
  return data
    .map(toArtworkComment)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
}

// Server DTO expects `comment`; any other key trips forbidNonWhitelisted (400).
export async function postArtworkComment(
  id: string,
  input: { content: string },
): Promise<ArtworkComment> {
  const { data } = await http.post<ServerComment>(
    `/artworks/${realArtworkId(id)}/comment`,
    { comment: input.content },
  )
  return toArtworkComment(data)
}

export async function deleteArtworkComment(
  artworkId: string,
  commentId: string,
): Promise<void> {
  await http.delete(
    `/artworks/${realArtworkId(artworkId)}/comment/${commentId}`,
  )
}

export interface ArtworkLikeInput {
  id: string
  liked: boolean
}

// The server returns 400 when the requested state is already set — effectively
// idempotent, so we keep the optimistic state instead of rolling back.
export async function setArtworkLike(
  input: ArtworkLikeInput,
): Promise<boolean> {
  const id = realArtworkId(input.id)
  try {
    if (input.liked) {
      await http.post(`/artworks/${id}/like`)
    } else {
      await http.delete(`/artworks/${id}/like`)
    }
    return input.liked
  } catch (error) {
    if (isApiError(error) && error.status === 400) return input.liked
    throw error
  }
}

// No dedicated endpoint: read the likes list and look for the current user.
export async function fetchIsLiked(
  artworkId: string,
  currentUserId: string,
): Promise<boolean> {
  const { data } = await http.get<ServerLike[]>(
    `/artworks/${realArtworkId(artworkId)}/likes`,
  )
  return data.some((like) => like.authorId === currentUserId)
}

export interface CreateArtworkInput {
  title: string
  description?: string
  tags?: string[]
  file: File
}

export async function createArtwork(
  input: CreateArtworkInput,
  onProgress?: (pct: number) => void,
): Promise<ArtworkDetail> {
  const form = new FormData()
  form.append('title', input.title)
  if (input.description) form.append('description', input.description)

  // Repeated key (tags=a&tags=b); the DTO is ArrayNotEmpty, so send nothing when empty.
  input.tags
    ?.map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0)
    .forEach((tag) => {
      form.append('tags', tag)
    })

  form.append('art', input.file)

  const { data } = await http.post<ServerArtwork>(`/artworks`, form, {
    ...multipartConfig,
    onUploadProgress: onProgress
      ? (event) => {
          if (event.total) {
            onProgress(Math.round((event.loaded / event.total) * 100))
          }
        }
      : undefined,
  })
  return toArtworkDetail(data)
}

export interface UpdateArtworkInput {
  title?: string
  description?: string
  tags?: string[]
  file?: File
}

// Metadata edit (media kept when no file). Omit tags when empty (DTO is ArrayNotEmpty).
export async function updateArtwork(
  id: string,
  input: UpdateArtworkInput,
): Promise<ArtworkDetail> {
  const form = new FormData()
  if (input.title !== undefined) form.append('title', input.title)
  if (input.description !== undefined) {
    form.append('description', input.description)
  }

  input.tags
    ?.map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0)
    .forEach((tag) => {
      form.append('tags', tag)
    })

  if (input.file) form.append('art', input.file)

  const { data } = await http.patch<ServerArtwork>(
    `/artworks/${realArtworkId(id)}`,
    form,
    multipartConfig,
  )
  return toArtworkDetail(data)
}

export async function deleteArtwork(id: string): Promise<void> {
  await http.delete(`/artworks/${realArtworkId(id)}`)
}
