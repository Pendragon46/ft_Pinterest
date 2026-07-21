// The search "API": every read the search UI performs goes through here. Today
// each function resolves from the mock; when the backend lands (Search spec §13)
// only the bodies change — signatures and query keys stay identical.

import type { CanvasArtwork, Category } from '@/features/artworks/artwork.types'
import { http } from '@/lib/http'
import { colorFromId, type ServerUser } from '@/lib/mappers'

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
  Suggestion,
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

// Forme de GET /search : trois listes renvoyées en parallèle.
interface ServerSearchAll {
  artworks: { id: string; title: string }[]
  users: ServerUser[]
  tags: { id: string; tags?: { name: string }[] }[]
}

/** Autocomplétion. Le backend fournit une recherche plate ; les
    disciplines restent résolues côté client (ce sont des niches du module
    canvas, absentes du modèle serveur), les créateurs viennent de l'API. */
export async function fetchSuggestions(
  query: string,
): Promise<SuggestionGroups> {
  const local = suggest(query)
  if (!query.trim()) return local

  try {
    const { data } = await http.get<ServerSearchAll>('/search', {
      params: { q: query, page: 1, limit: 5, sort: 'recent' },
    })

    const creators: Suggestion[] = data.users.map((u) => ({
      id: `creator-${u.id}`,
      kind: 'creator',
      term: u.fullname ?? u.username,
      username: u.fullname ?? u.username,
      handle: u.username,
      previews: [colorFromId(u.id)],
    }))

    // Disciplines locales (niches) + créateurs réels.
    return { disciplines: local.disciplines, creators }
  } catch {
    // La recherche ne doit jamais casser la barre de saisie : en cas
    // d'échec réseau on retombe sur les suggestions locales.
    return local
  }
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
