// The search "API": every read the search UI performs goes through here.
// Suggestions, niche tiles and trending tags hit the backend (with a local
// fallback); niche resolution and neighbours are client-side by design — a
// "niche" is a canvas discipline, not a backend entity.

import type { CanvasArtwork, Category } from '@/features/artworks/artwork.types'
import { http } from '@/lib/http'
import { colorFromId, type ServerArtwork, type ServerUser } from '@/lib/mappers'

import {
  contextualTags,
  neighbours,
  nicheTile,
  recentSearches,
  suggest,
} from './search.mock'
import { layoutTile } from './tile.layout'
import type {
  NicheNeighbour,
  Suggestion,
  SuggestionGroups,
} from './search.types'

// React Query key factory — single source of truth for search cache keys.
export const searchKeys = {
  suggestions: (query: string) => ['search', 'suggestions', query] as const,
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

/** Cartes d'une tuile de niche. Le slug sert de tag de recherche ; si le
    serveur ne connaît pas ce tag, on retombe sur la niche locale pour que
    le canvas reste peuplé. */
export async function fetchNicheTile(
  slug: string,
  tx: number,
  ty: number,
): Promise<CanvasArtwork[]> {
  try {
    const { data } = await http.get<ServerArtwork[]>('/search/tags', {
      params: { q: slug, page: 1, limit: 16, sort: 'recent' },
    })
    if (data.length === 0) return nicheTile(slug as Category, tx, ty)
    return layoutTile(data, slug as Category, tx, ty)
  } catch {
    return nicheTile(slug as Category, tx, ty)
  }
}

/** Neighbouring niches, closest first. Client-side by design: niches are canvas
    disciplines and proximity is their shared-tag count (no backend entity). */
export function fetchNeighbours(slug: string): NicheNeighbour[] {
  return neighbours(slug as Category)
}

/** Contextual suggested tags: real trending (aggregated from recent artworks'
    tags) merged with the user's recent local searches. Falls back to local. */
export async function fetchContextualTags(): Promise<string[]> {
  try {
    const { data } = await http.get<ServerArtwork[]>('/search/artworks', {
      params: { page: 1, limit: 40, sort: 'recent' },
    })
    const freq = new Map<string, number>()
    for (const art of data) {
      for (const tag of art.tags ?? []) {
        freq.set(tag.name, (freq.get(tag.name) ?? 0) + 1)
      }
    }
    const trending = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
    return [...new Set([...recentSearches(), ...trending])].slice(0, 3)
  } catch {
    return contextualTags()
  }
}
