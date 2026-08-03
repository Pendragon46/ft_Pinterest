// `color` is a temporary stand-in for the future `imageUrl`.

export const CATEGORIES = [
  'portrait',
  'editorial',
  'typography',
  'uxui',
  'photography',
  'illustration',
  'motion',
  'branding',
] as const

// Fixed enum → also the i18n keys under `category.*` (so these ARE translated).
export type Category = (typeof CATEGORIES)[number]

// How a card was produced/paid — drives the small badge on the card.
export type ArtworkKind = 'standard' | 'ai' | 'sponsor'

// Uploaded media kind — drives image-vs-video rendering across every surface.
export type MediaType = 'image' | 'video'

/** Author info embedded in artwork payloads (a subset of User). */
export interface AuthorSummary {
  id: string
  username: string
  handle: string
  color: string
  avatarUrl?: string | null
}

/** One artwork as listed on the map or in grids. */
export interface ArtworkSummary {
  id: string
  title: string
  category: Category
  kind: ArtworkKind
  color: string
  viewCount: number
  likeCount: number
  commentCount: number
  author: AuthorSummary
}

/** Full artwork, as shown in the detail modal. */
export interface ArtworkDetail extends Omit<ArtworkSummary, 'category' | 'kind'> {
  /** Canvas works carry a discipline + kind; user-created works have neither. */
  category?: Category
  kind?: ArtworkKind
  description: string
  tags: string[]
  /** Present for user-created works (the uploaded file); canvas works use `color`. */
  mediaUrl?: string | null
  mediaType?: MediaType
}

/** An artwork placed on the infinite discovery plane (world pixels). */
export interface CanvasArtwork extends ArtworkSummary {
  x: number
  y: number
  width: number
  height: number
  /** Niche mode only: the world id to open on click. A niche tiles one item at
      many positions, so `id` is unique per placement while `sourceId` is stable. */
  sourceId?: string
  /** Uploaded media (real works); when absent the card falls back to `color`. */
  mediaUrl?: string | null
  mediaType?: MediaType
}

/** A backend-shaped artwork as returned by the user endpoints (profile grids):
    no canvas coords, no category, no colour — just the persisted fields. */
export interface ProfileArtwork {
  id: string
  title: string
  /** Optional in Prisma; when null the card shows a neutral placeholder. */
  mediaUrl?: string | null
  /** 'video' cards show a badge + static poster frame (no autoplay in grids). */
  mediaType?: MediaType
  /** Free user text — never translated. */
  tags: { name: string }[]
  /** Prisma `_count` include. */
  _count: { likes: number; comments: number }
}

/** One comment under an artwork. */
export interface ArtworkComment {
  id: string
  author: AuthorSummary
  content: string
  likeCount: number
  // Age in hours; 0 = just now. Kept for display.
  hoursAgo: number
  /** ISO timestamp — the real one, used for ordering. `hoursAgo` is floored to
      the hour, so sorting on it made comments from the same hour tie. */
  createdAt: string
}
