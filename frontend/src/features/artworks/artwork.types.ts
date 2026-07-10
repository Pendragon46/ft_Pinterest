// Shared shapes for the artworks feature. `color` is a temporary stand-in for
// the future `imageUrl`; CanvasArtwork adds map placement that arrives as data.

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

/** Author info embedded in artwork payloads (a subset of User). */
export interface AuthorSummary {
  id: string
  username: string
  handle: string
  color: string
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
export interface ArtworkDetail extends ArtworkSummary {
  description: string
  tags: string[]
}

/** An artwork placed on the infinite discovery plane (world pixels). */
export interface CanvasArtwork extends ArtworkSummary {
  x: number
  y: number
  width: number
  height: number
}

/** One comment under an artwork. */
export interface ArtworkComment {
  id: string
  author: AuthorSummary
  content: string
  likeCount: number
  // Age in hours; 0 = just now. Becomes `createdAt` once the API exists.
  hoursAgo: number
}
