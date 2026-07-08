// Shared shapes for the artworks feature.
//
// Two layers, on purpose:
// - ArtworkSummary / ArtworkDetail / ArtworkComment mirror what the backend
//   will return (Prisma `Artwork` + aggregated counts + embedded author).
//   `color` is a TEMPORARY stand-in for `imageUrl` while content is mocked:
//   when real uploads exist, swap `color` for `imageUrl` here and in the two
//   places that paint it (ArtworkCard, ArtworkDetail) — nothing else moves.
// - CanvasArtwork adds the world placement the discovery map needs. The
//   placement is DATA (it arrives with the artwork), not something the view
//   computes: the future backend will own the map layout the same way.

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

/** The 8 creative territories of the map — also the i18n keys under
    `category.*` (categories are a fixed enum, so they ARE translated,
    unlike free user content such as titles or tags). */
export type Category = (typeof CATEGORIES)[number]

/** How a card was produced/paid — drives the small badge on the card. */
export type ArtworkKind = 'standard' | 'ai' | 'sponsor'

/** Author info embedded in artwork payloads (a subset of User). */
export interface AuthorSummary {
  id: string
  username: string
  handle: string
  /** Avatar placeholder color until real avatars ship (mirrors avatarUrl). */
  color: string
}

/** One artwork as listed on the map or in grids. */
export interface ArtworkSummary {
  id: string
  title: string
  category: Category
  kind: ArtworkKind
  /** Placeholder visual — stands in for the future `imageUrl`. */
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
  /** Age in hours; 0 = just now. Becomes `createdAt` once the API exists. */
  hoursAgo: number
}
