// Frontière unique entre les formes NestJS et les types frontend : un changement
// de champ backend se corrige ici et nulle part ailleurs.

import type {
  ArtworkComment,
  ArtworkDetail,
  AuthorSummary,
  MediaType,
  ProfileArtwork,
} from '@/features/artworks/artwork.types'
import type { User } from '@/features/auth/auth.types'

// Formes serveur : déclarées ici (pas importées des types frontend) car elles
// décrivent le contrat HTTP ; les garder distinctes évite qu'une évolution
// backend se propage silencieusement dans les composants.

export interface ServerUser {
  id: string
  fullname: string | null
  username: string
  email: string
  bio: string | null
  avatarUrl: string
  role: 'USER' | 'ADMIN'
  createdAt?: string
  updatedAt?: string
}

export interface ServerArtwork {
  id: string
  title: string
  description: string | null
  mediaUrl: string | null
  mediaPublicId: string | null
  authorId: string
  createdAt: string
  updatedAt: string
  // Présents uniquement si le service a posé un include (ticket T2).
  author?: Partial<ServerUser>
  tags?: { name: string }[]
  _count?: { likes: number; comments: number }
}

export interface ServerComment {
  id: string
  content: string
  authorId: string
  artworkId: string
  createdAt: string
  user?: Partial<ServerUser>
}

export interface ServerLike {
  id: string
  authorId: string
  artworkId: string
  createdAt: string
}

export interface ServerFollow {
  followerId: string
  followingId: string
  createdAt: string
}

/** Couleur stable dérivée d'un id : même entrée → même teinte. Repli quand
    aucune image n'est disponible. */
export function colorFromId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return `hsl(${Math.abs(hash) % 360} 58% 62%)`
}

/** Le backend ne stocke pas le type de média ; on le déduit de l'URL Cloudinary
    (chemin ou extension) car le rendu image/vidéo diffère partout. */
export function mediaTypeFromUrl(url?: string | null): MediaType {
  if (!url) return 'image'
  // Cloudinary : type dans le chemin (/video/upload/), pas d'extension ; repli sur l'extension.
  if (/\/video\/(upload|fetch)\//i.test(url)) return 'video'
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) ? 'video' : 'image'
}

/** Vignette JPEG d'une vidéo Cloudinary (première image, `so_0`). Un vrai
    `<video preload="metadata">` par carte déclenche une requête Range dont
    Chrome rate parfois la relecture — `ERR_CACHE_READ_FAILURE` (issue #24).
    Renvoie `undefined` hors vidéo Cloudinary : l'appelant retombe sur `<video>`. */
export function videoPosterUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  const marker = '/video/upload/'
  const at = url.indexOf(marker)
  if (at === -1) return undefined
  const head = url.slice(0, at + marker.length)
  const tail = url.slice(at + marker.length).replace(/\.[a-z0-9]+(\?|$)/i, '$1')
  return `${head}so_0,f_jpg,q_auto/${tail}.jpg`
}

/** Âge en heures depuis un timestamp ISO. Le frontend raisonne en
    `hoursAgo` (0 = à l'instant), le backend en dates absolues. */
export function hoursSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(ms / 3_600_000))
}

export function toUser(s: ServerUser): User {
  return {
    id: s.id,
    fullname: s.fullname,
    username: s.username,
    email: s.email,
    bio: s.bio,
    avatarUrl: s.avatarUrl,
    role: s.role,
  }
}

/** Auteur réduit. Sans l'include (ticket T2) on retombe sur `authorId` :
    la carte reste affichable, simplement sans nom lisible. */
export function toAuthorSummary(
  author: Partial<ServerUser> | undefined,
  fallbackId: string,
): AuthorSummary {
  const id = author?.id ?? fallbackId
  const handle = author?.username ?? 'unknown'
  return {
    id,
    username: author?.fullname ?? handle,
    handle,
    color: colorFromId(id),
    avatarUrl: author?.avatarUrl ?? null,
  }
}

export function toProfileArtwork(s: ServerArtwork): ProfileArtwork {
  return {
    id: s.id,
    title: s.title,
    mediaUrl: s.mediaUrl,
    mediaType: mediaTypeFromUrl(s.mediaUrl),
    tags: s.tags ?? [],
    // `_count` absent (endpoint sans include) : afficher 0 plutôt que planter.
    _count: s._count ?? { likes: 0, comments: 0 },
  }
}

export function toArtworkDetail(s: ServerArtwork): ArtworkDetail {
  return {
    id: s.id,
    title: s.title,
    description: s.description ?? '',
    color: colorFromId(s.id),
    mediaUrl: s.mediaUrl,
    mediaType: mediaTypeFromUrl(s.mediaUrl),
    tags: (s.tags ?? []).map((t) => t.name),
    author: toAuthorSummary(s.author, s.authorId),
    likeCount: s._count?.likes ?? 0,
    commentCount: s._count?.comments ?? 0,
    // Pas de compteur de vues en base : neutre plutôt qu'inventé.
    viewCount: 0,
    // `category` et `kind` n'existent que côté canvas : laissés absents.
  }
}

export function toArtworkComment(s: ServerComment): ArtworkComment {
  return {
    id: s.id,
    author: toAuthorSummary(s.user, s.authorId),
    content: s.content,
    // Le schéma Prisma n'a pas de likes sur les commentaires.
    likeCount: 0,
    hoursAgo: hoursSince(s.createdAt),
    createdAt: s.createdAt,
  }
}

/** Les ids de cartes du canvas ont la forme `<id>@<tx>.<ty>.<i>` : une même
    œuvre peut occuper plusieurs emplacements. Extrait l'id réel en base. */
export function realArtworkId(id: string): string {
  return id.split('@')[0]
}
