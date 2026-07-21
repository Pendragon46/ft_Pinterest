// L'API "artworks". Tuiles, détail, publication et suppression appellent le
// backend NestJS. Commentaires et like/save restent sur mocks jusqu'au ticket
// T1 (identité par token). Signatures et clés de cache inchangées.

import { http, multipartConfig } from '@/lib/http'
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
  title: string
  description?: string
  tags?: string[]
  file: File
}

/** Publie une œuvre. Champ fichier `art`, 10 Mo max, images + mp4.
    La route porte l'id auteur dans l'URL ; après le ticket T1 elle
    deviendra POST /artworks et `authorId` disparaîtra — seule cette
    ligne changera. */
export async function createArtwork(
  authorId: string,
  input: CreateArtworkInput,
): Promise<ArtworkDetail> {
  const form = new FormData()
  form.append('title', input.title)
  if (input.description) form.append('description', input.description)

  // Un tableau se transmet en répétant la clé : tags=a&tags=b.
  // class-validator le reconstruit côté Nest. Le DTO impose
  // ArrayNotEmpty : on n'envoie rien si la liste est vide.
  input.tags
    ?.map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0)
    .forEach((tag) => {
      form.append('tags', tag)
    })

  form.append('art', input.file)

  const { data } = await http.post<ServerArtwork>(
    `/artworks/user/${authorId}`,
    form,
    multipartConfig,
  )
  return toArtworkDetail(data)
}

/** Supprime une œuvre. Le serveur vérifie la propriété (403 sinon) et
    nettoie le média sur Cloudinary. */
export async function deleteArtwork(id: string): Promise<void> {
  await http.delete(`/artworks/${realArtworkId(id)}`)
}
