// L'API "artworks". Tuiles, détail, publication, suppression, commentaires et
// likes appellent le backend NestJS. Signatures et clés de cache inchangées.

import { http, isApiError, multipartConfig } from '@/lib/http'
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

/** Commentaires d'un artwork, du plus récent au plus ancien. Le backend
    renvoie l'ordre d'insertion : on trie ici. */
export async function fetchArtworkComments(
  id: string,
): Promise<ArtworkComment[]> {
  const { data } = await http.get<ServerComment[]>(
    `/artworks/${realArtworkId(id)}/comments`,
  )
  return data.map(toArtworkComment).sort((a, b) => a.hoursAgo - b.hoursAgo)
}

/** Poste un commentaire. Le DTO serveur attend `comment` ; toute autre clé
    déclenche un 400 (forbidNonWhitelisted). L'auteur vient du token. */
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

/** Supprime un commentaire. Le serveur vérifie que l'appelant en est
    l'auteur (ou ADMIN) et renvoie 403 sinon. */
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
  // `loggedUser` retiré : le token porte l'identité (ticket T1).
}

/** Bascule un like. Le serveur renvoie 400 quand l'état demandé est déjà en
    place — de fait idempotent, donc on confirme l'état optimiste plutôt que
    de faire reculer l'interface. Toute autre erreur remonte. */
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

/** Ai-je liké cette œuvre ? Pas d'endpoint dédié : on lit la liste des likes
    et on y cherche l'utilisateur courant. */
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

/** Publie une œuvre. Champ fichier `art`, 10 Mo max, images + mp4.
    Le nouveau backend dérive l'auteur du token : POST /artworks. */
export async function createArtwork(
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
    `/artworks`,
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
