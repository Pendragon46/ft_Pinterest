// The artworks "API": every read the UI performs goes through here. Today each
// function resolves from the mock; when the backend lands only the bodies
// change (signatures and query keys stay identical). The artificial latency
// keeps loading states exercised.

import { addCreatedArtwork } from '@/features/users/user.mock'
import { http } from '@/lib/http'
import { layoutTile, pageForTile } from '@/features/search/tile.layout'
import {
  realArtworkId,
  toArtworkDetail,
  type ServerArtwork,
} from '@/lib/mappers'
import { maybeFailMutation } from '@/lib/devFail'

import { addPostedComment, generateComments } from './artwork.mock'
import type {
  ArtworkComment,
  ArtworkDetail,
  AuthorSummary,
  CanvasArtwork,
  MediaType,
  ProfileArtwork,
} from './artwork.types'

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

/** Cartes d'une tuile de la carte. Le backend n'a pas de notion de
    coordonnées : on demande une page de résultats dérivée de (tx, ty)
    puis on la dispose côté client. */
export async function fetchTileArtworks(
  tx: number,
  ty: number,
): Promise<CanvasArtwork[]> {
  const page = pageForTile(tx, ty)
  const { data } = await http.get<ServerArtwork[]>('/search/artworks', {
    params: { page, limit: 16, sort: 'recent' },
  })
  // Base vide ou page au-delà du dernier résultat : tuile vide plutôt
  // qu'un plantage. Les skeletons prennent le relais visuellement.
  return layoutTile(data, undefined, tx, ty)
}

/** Un artwork complet. Sans l'include serveur (ticket T2), les mappers
    retombent sur des valeurs neutres et la modale s'ouvre quand même. */
export async function fetchArtworkDetail(id: string): Promise<ArtworkDetail> {
  const { data } = await http.get<ServerArtwork>(
    `/artworks/${realArtworkId(id)}`,
  )
  return toArtworkDetail(data)
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
  maybeFailMutation()
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

export interface ArtworkLikeInput {
  id: string
  liked: boolean
  loggedUser: string
}

/** Toggle a like (optimistic caller). The mock echoes the requested state.
    TODO(backend): POST/DELETE /artworks/:id/like (body { loggedUser }). */
export async function setArtworkLike(input: ArtworkLikeInput): Promise<boolean> {
  await delay(POST_LATENCY_MS)
  maybeFailMutation()
  return input.liked
}

export interface ArtworkSaveInput {
  id: string
  saved: boolean
  loggedUser: string
}

/** Toggle a save (optimistic caller). The mock echoes the requested state.
    TODO(backend): POST/DELETE /artworks/:id/save (body { loggedUser }). */
export async function setArtworkSave(input: ArtworkSaveInput): Promise<boolean> {
  await delay(POST_LATENCY_MS)
  maybeFailMutation()
  return input.saved
}

export interface CreateArtworkInput {
  file: File
  mediaType: MediaType
  title: string
  description: string
  tags: string[]
  userId: string
}

/** Publish a new artwork; the mock persists it in the session store and returns
    its profile-grid shape (id lets the caller open the fresh detail).
    TODO(backend): POST /artworks/user/:userId — multipart/form-data, file field
    `art` (≤10 MB; jpeg/png/gif/webp/mp4), fields { title, description?, tags[],
    userId } → Artwork (server owns id, mediaUrl, mediaPublicId, timestamps). On
    success invalidate userKeys.works(userId) + userKeys.profile(userId). Send
    tags as repeated `tags` parts and verify a SINGLE tag still parses as an array
    in Swagger — if it fails @IsArray, the backend needs an @Transform (add to
    E.2, alongside the broken GET /artworks/user/:userId @Param('id')). */
export async function createArtwork(
  input: CreateArtworkInput,
): Promise<ProfileArtwork> {
  await delay(POST_LATENCY_MS)
  maybeFailMutation()
  return addCreatedArtwork(input)
}
