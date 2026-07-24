// The search "API": every read the search UI performs goes through here. Today
// each function resolves from the mock; when the backend lands (Search spec §13)
// only the bodies change — signatures and query keys stay identical.

import type { CanvasArtwork, Category } from '@/features/artworks/artwork.types'

import {
  contextualTags,
  neighbours,
  nicheTile,
  resolveSearch,
  suggest,
} from './search.mock'
import type {
  NicheNeighbour,
  SearchResolution,
  SuggestionGroups,
} from './search.types'

const SUGGEST_LATENCY_MS = 90
const RESOLVE_LATENCY_MS = 120
// A touch of latency so the skeleton beat of the search wave is visible (§5.5).
const TILE_LATENCY_MS = 200
const NEIGHBOURS_LATENCY_MS = 140

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

// React Query key factory — single source of truth for search cache keys.
export const searchKeys = {
  suggestions: (query: string) => ['search', 'suggestions', query] as const,
  resolution: (query: string) => ['search', 'resolution', query] as const,
  nicheTile: (slug: string, tx: number, ty: number) =>
    ['search', 'niche', slug, 'tile', tx, ty] as const,
  neighbours: (slug: string) => ['search', 'neighbours', slug] as const,
  contextualTags: () => ['search', 'contextual-tags'] as const,
}

/** Categorised autocomplete for a query.
    TODO(backend): GET /search/suggest?q= → SuggestionGroups (needs tag exposure). */
export async function fetchSuggestions(query: string): Promise<SuggestionGroups> {
  await delay(SUGGEST_LATENCY_MS)
  return suggest(query)
}

/** Resolve a submitted term to a niche (or the nearest region).
    TODO(backend): GET /search/resolve?q= → SearchResolution. */
export async function fetchResolution(query: string): Promise<SearchResolution> {
  await delay(RESOLVE_LATENCY_MS)
  return resolveSearch(query)
}

/** Cards of one niche tile (toroidal content).
    TODO(backend): GET /niche/:slug/map?tx=&ty= → CanvasArtwork[]. */
export async function fetchNicheTile(
  slug: string,
  tx: number,
  ty: number,
): Promise<CanvasArtwork[]> {
  await delay(TILE_LATENCY_MS)
  return nicheTile(slug as Category, tx, ty)
}

/** Neighbouring niches by tag proximity, closest first.
    TODO(backend): GET /niche/:slug/neighbours → NicheNeighbour[] (needs proximity). */
export async function fetchNeighbours(slug: string): Promise<NicheNeighbour[]> {
  await delay(NEIGHBOURS_LATENCY_MS)
  return neighbours(slug as Category)
}

/** Contextual suggested tags (trending ⊕ recent history).
    TODO(backend): GET /search/trending → string[] (recent stays client-side). */
export async function fetchContextualTags(): Promise<string[]> {
  await delay(SUGGEST_LATENCY_MS)
  return contextualTags()
}
