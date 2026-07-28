// Shared shapes for the search feature. In the MVP a "niche" is one of the eight
// disciplines (see docs/ARCHITECTURE.md and the Search spec); styles-as-niches and
// relational search are deferred.

import type { Category } from '@/features/artworks/artwork.types'

/** A discipline niche — the MVP's only niche kind (one per Category). */
export interface Niche {
  /** Stable id; also the i18n key under `category.*` (so the label IS translated). */
  slug: Category
  /** Internal tags — power tag-proximity neighbours (§8.5); not user-facing. */
  tags: string[]
  /** World-px point whose surrounding cells seed the niche's unique items (§6). */
  contentAnchor: { x: number; y: number }
  /** 0–360; the niche's colour family (every niche card shares it). */
  hue: number
  /** N unique items — the "unique tile" completion is measured against (§8.1). */
  contentSize: number
}

export type SuggestionKind = 'discipline' | 'creator' | 'tag'

/** One autocomplete row (§4). Labels resolve at render: disciplines translate via
    `category.*`, creators show their (data) username as-is. */
export interface Suggestion {
  id: string
  kind: SuggestionKind
  /** The term submitted when the row is chosen (§4.5 parity). */
  term: string
  /** Micro-previews: swatch colours for a niche, an avatar colour for a creator. */
  previews: string[]
  /** discipline → UI renders `t('category.' + categoryKey)`. */
  categoryKey?: Category
  /** creator → shown as-is (mock data). */
  username?: string
  handle?: string
  /** creator → the backend user id, used to open their universe. */
  userId?: string
  /** tag → number of works carrying it, shown after the label (§4.2). */
  count?: number
  /** Illustrative trailing crumbs shown after the label (§4.3), e.g. `['mobile']`. */
  path?: string[]
}

/** Categorised autocomplete payload; empty categories are omitted by the UI (§4.1).
    Order here is the visual order — the combobox flattens it in the same order for
    keyboard navigation, so keep disciplines → tags → creators. */
export interface SuggestionGroups {
  disciplines: Suggestion[]
  tags: Suggestion[]
  creators: Suggestion[]
}

/** Resolving a submitted term to a destination (§5) or the nearest region (§7). */
export type SearchResolution =
  | { kind: 'niche'; niche: Niche }
  | { kind: 'nearest'; niche: Niche; typed: string }

/** A neighbouring niche for the *Where next?* crossroads (§8). */
export interface NicheNeighbour {
  niche: Niche
  /** Shared-tag count with the current niche (proximity ordering). */
  shared: number
  /** Circular micro-preview colours. */
  previews: string[]
}
