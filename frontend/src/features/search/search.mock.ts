// Deterministic mock "search domain" — the stand-in for the absent search /
// niche-content / tag / proximity endpoints (Search spec §13). Pure functions;
// swap the bodies for real fetches later and the UI is unchanged.

import {
  CELL_H,
  CELL_W,
  TILE_CELLS,
} from '@/features/artworks/canvas/canvas.constants'
import {
  AUTHORS,
  cellSlot,
  generateCell,
  SUGGESTED_QUERIES,
} from '@/features/artworks/artwork.mock'
import { CATEGORIES } from '@/features/artworks/artwork.types'
import type { CanvasArtwork, Category } from '@/features/artworks/artwork.types'

import type {
  NicheNeighbour,
  Niche,
  SearchResolution,
  Suggestion,
  SuggestionGroups,
} from './search.types'

// ── Niche definitions ───────────────────────────────────────────────────────

/** Internal tags per discipline — crafted so every niche shares some with a few
    others (drives the crossroads neighbours). Not user-facing. */
const NICHE_TAGS: Record<Category, string[]> = {
  portrait: ['people', 'studio', 'light', 'mood', 'editorial'],
  editorial: ['layout', 'print', 'grid', 'type', 'people'],
  typography: ['type', 'lettering', 'grid', 'experimental', 'print'],
  uxui: ['product', 'interface', 'grid', 'interaction', 'minimal'],
  photography: ['photo', 'light', 'film', 'studio', 'mood'],
  illustration: ['drawing', 'character', 'colour', 'texture', 'story'],
  motion: ['3d', 'animation', 'render', 'interaction', 'experimental'],
  branding: ['identity', 'logo', 'type', 'minimal', 'colour'],
}

/** Colour family per discipline (soft, light — niche cards share it). */
const NICHE_HUE: Record<Category, number> = {
  portrait: 15,
  editorial: 45,
  typography: 275,
  uxui: 205,
  photography: 190,
  illustration: 330,
  motion: 25,
  branding: 150,
}

/** Terms that resolve to each niche (§5) and seed the autocomplete match (§4). */
const SYNONYMS: Record<Category, string[]> = {
  portrait: ['portrait', 'portraits', 'face', 'people'],
  editorial: ['editorial', 'magazine', 'layout', 'print'],
  typography: ['typography', 'type', 'typo', 'lettering', 'font', 'fonts'],
  uxui: ['uxui', 'ux', 'ui', 'ux/ui', 'ux ui', 'interface', 'product'],
  photography: ['photography', 'photo', 'photos', 'film'],
  illustration: ['illustration', 'illustrations', 'illu', 'drawing'],
  motion: ['motion', '3d', 'animation', 'render'],
  branding: ['branding', 'brand', 'identity', 'logo'],
}

/** How far (world px) from the origin each niche samples its base-world content —
    one anchor per compass direction, so each discipline draws from its own region. */
const ANCHOR_RADIUS = 5 * CELL_W

function anchorFor(index: number): { x: number; y: number } {
  const theta = index * (Math.PI / 4) - Math.PI
  return {
    x: Math.round(Math.cos(theta) * ANCHOR_RADIUS),
    y: Math.round(Math.sin(theta) * ANCHOR_RADIUS),
  }
}

/** [default] unique items per niche — the completion target (§8.1), tunable.
    Must equal SUPER_W × SUPER_H (the toroidal super-tile). */
const NICHE_CONTENT_SIZE = 48

export const NICHES: Niche[] = CATEGORIES.map((slug, index) => ({
  slug,
  tags: NICHE_TAGS[slug],
  contentAnchor: anchorFor(index),
  hue: NICHE_HUE[slug],
  contentSize: NICHE_CONTENT_SIZE,
}))

const NICHE_BY_SLUG = new Map<Category, Niche>(NICHES.map((n) => [n.slug, n]))

export function getNiche(slug: string): Niche | null {
  return NICHE_BY_SLUG.get(slug as Category) ?? null
}

// ── Colours & previews ──────────────────────────────────────────────────────

/** A soft, in-family colour for item `i` of a niche — deterministic, no PRNG. */
function nicheItemColour(hue: number, i: number): string {
  const h = (hue + ((i * 37) % 24) - 12 + 360) % 360
  const s = 40 + ((i * 13) % 20)
  const l = 82 + ((i * 7) % 8)
  return `hsl(${h} ${s}% ${l}%)`
}

function nichePreviews(niche: Niche, count: number): string[] {
  return Array.from({ length: count }, (_, i) =>
    nicheItemColour(niche.hue, i * 3 + 1),
  )
}

// ── Term matching ───────────────────────────────────────────────────────────

const normalise = (s: string): string => s.trim().toLowerCase()

function nicheMatches(q: string, niche: Niche): boolean {
  return (
    SYNONYMS[niche.slug].some((s) => s.includes(q) || q.includes(s)) ||
    niche.tags.some((t) => t.includes(q))
  )
}

function nearestScore(q: string, niche: Niche): number {
  let score = 0
  for (const s of SYNONYMS[niche.slug]) {
    if (s.startsWith(q) || q.startsWith(s)) score += 2
    else if (s.includes(q) || q.includes(s)) score += 1
  }
  for (const t of niche.tags) if (t.includes(q) || q.includes(t)) score += 1
  return score
}

/** Resolve a submitted term to a niche, or the nearest region if none match (§7). */
export function resolveSearch(term: string): SearchResolution {
  const q = normalise(term)
  if (q.length > 0) {
    const exact = NICHES.find((n) => SYNONYMS[n.slug].includes(q))
    if (exact) return { kind: 'niche', niche: exact }
    const loose = NICHES.find(
      (n) =>
        SYNONYMS[n.slug].some((s) => s.includes(q) || q.includes(s)) ||
        n.tags.includes(q),
    )
    if (loose) return { kind: 'niche', niche: loose }
  }
  let best = NICHES[0]
  let bestScore = -1
  for (const n of NICHES) {
    const score = nearestScore(q, n)
    if (score > bestScore) {
      bestScore = score
      best = n
    }
  }
  return { kind: 'nearest', niche: best, typed: term }
}

// ── Autocomplete (§4) ───────────────────────────────────────────────────────

const MAX_PER_CATEGORY = 3

/** Categorised suggestions for the current query: disciplines + creators. */
export function suggest(term: string): SuggestionGroups {
  const q = normalise(term)
  if (q.length === 0) return { disciplines: [], creators: [] }

  const disciplines: Suggestion[] = NICHES.filter((n) => nicheMatches(q, n))
    .slice(0, MAX_PER_CATEGORY)
    .map((n) => ({
      id: `discipline-${n.slug}`,
      kind: 'discipline',
      term: n.slug,
      categoryKey: n.slug,
      previews: nichePreviews(n, 3),
      path: [n.tags[0]],
    }))

  const creators: Suggestion[] = AUTHORS.filter(
    (a) => a.username.toLowerCase().includes(q) || a.handle.includes(q),
  )
    .slice(0, MAX_PER_CATEGORY)
    .map((a) => ({
      id: `creator-${a.id}`,
      kind: 'creator',
      term: a.username,
      username: a.username,
      handle: a.handle,
      previews: [a.color],
    }))

  return { disciplines, creators }
}

// ── Niche content & toroidal tiling (§6) ────────────────────────────────────

/** The N unique items of a niche: real world cells near its region, re-coloured
    to the niche family (so `id` → detail still resolves via the artwork mock). */
export function nicheContent(slug: Category): CanvasArtwork[] {
  const niche = NICHE_BY_SLUG.get(slug)
  if (!niche) return []
  const baseCx = Math.round(niche.contentAnchor.x / CELL_W)
  const baseCy = Math.round(niche.contentAnchor.y / CELL_H)
  const cols = 8
  const items: CanvasArtwork[] = []
  // Walk cells until we have exactly contentSize items — a cell landing on the
  // hero-cleared origin yields null and is skipped, so we can't just count `i`.
  for (
    let i = 0;
    items.length < niche.contentSize && i < niche.contentSize * 3;
    i++
  ) {
    const card = generateCell(baseCx + (i % cols), baseCy + Math.floor(i / cols))
    if (!card) continue
    items.push({
      ...card,
      category: slug,
      color: nicheItemColour(niche.hue, items.length),
    })
  }
  return items
}

// Toroidal offset tiling (§6.2): the N unique items fill a SUPER_W × SUPER_H
// super-tile (SUPER_W * SUPER_H === NICHE_CONTENT_SIZE). The super-tile repeats,
// but each copy is rotated (a per-super-tile shift) and the rows are brick-
// staggered, so the wrap has no visible seam — yet panning over any one
// super-tile surfaces every unique item exactly once (no coupon-collector tail).
const SUPER_W = 8
const SUPER_H = 6
const SUPER_BRICK = 4

function nicheItemIndex(cx: number, cy: number, n: number): number {
  const superCy = Math.floor(cy / SUPER_H)
  const bx = cx + superCy * SUPER_BRICK // brick-stagger successive super-rows
  const superCx = Math.floor(bx / SUPER_W)
  const lx = ((bx % SUPER_W) + SUPER_W) % SUPER_W
  const ly = ((cy % SUPER_H) + SUPER_H) % SUPER_H
  const base = ly * SUPER_W + lx
  const shift = superCx * 7 + superCy * 13
  // Positive modulo: cx/cy can be negative and JS `%` keeps the sign, which would
  // otherwise yield a negative (out-of-bounds → undefined) item index.
  return (((base + shift) % n) + n) % n
}

/** Cards of one niche tile: each cell shows a scattered item at that cell's slot. */
export function nicheTile(slug: Category, tx: number, ty: number): CanvasArtwork[] {
  const items = nicheContent(slug)
  if (items.length === 0) return []
  const out: CanvasArtwork[] = []
  for (let dy = 0; dy < TILE_CELLS; dy++) {
    for (let dx = 0; dx < TILE_CELLS; dx++) {
      const cx = tx * TILE_CELLS + dx
      const cy = ty * TILE_CELLS + dy
      const slot = cellSlot(cx, cy)
      if (!slot) continue // hero clearing at origin (the pre-filled bar sits here)
      const item = items[nicheItemIndex(cx, cy, items.length)]
      out.push({
        ...item,
        id: `${item.id}~${cx}_${cy}`, // unique per placement (React key)
        sourceId: item.id, // stable id for the detail link
        x: slot.x,
        y: slot.y,
        width: slot.width,
        height: slot.height,
      })
    }
  }
  return out
}

/** Which unique item a niche cell maps to (null for the hero-cleared origin) —
    lets the canvas track how much of the unique tile has been parcoured (§8.1). */
export function nicheCellIndex(slug: Category, cx: number, cy: number): number | null {
  const niche = NICHE_BY_SLUG.get(slug)
  if (!niche || !cellSlot(cx, cy)) return null
  return nicheItemIndex(cx, cy, niche.contentSize)
}

// ── Neighbours (§8.5) ───────────────────────────────────────────────────────

function sharedTagCount(a: string[], b: string[]): number {
  const set = new Set(a)
  return b.reduce((n, t) => n + (set.has(t) ? 1 : 0), 0)
}

/** All other niches ordered by tag proximity (closest first). The crossroads
    shows the top three and reveals farther ones on refresh (§8.5). */
export function neighbours(slug: Category): NicheNeighbour[] {
  const self = NICHE_BY_SLUG.get(slug)
  if (!self) return []
  return NICHES.filter((n) => n.slug !== slug)
    .map((n) => ({
      niche: n,
      shared: sharedTagCount(self.tags, n.tags),
      previews: nichePreviews(n, 3),
    }))
    .sort(
      (a, b) => b.shared - a.shared || a.niche.slug.localeCompare(b.niche.slug),
    )
}

// ── Contextual suggested tags (§2.2) ────────────────────────────────────────

const HISTORY_KEY = 'atlaas:search-history'
const HISTORY_CAP = 8

function readHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed.filter((x) => typeof x === 'string') as string[]) : []
  } catch {
    return []
  }
}

/** Record a submitted term as recent-history (most recent first, deduped). */
export function recordSearch(term: string): void {
  const value = term.trim()
  if (!value) return
  try {
    const next = [value, ...readHistory().filter((t) => t !== value)].slice(0, HISTORY_CAP)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch {
    /* storage disabled — history just won't persist */
  }
}

/** Suggested tags under the bar: recent exploration ⊕ trending, [default] 3 (§2.2). */
export function contextualTags(): string[] {
  const recent = readHistory().slice(0, 2)
  return [...new Set([...recent, ...SUGGESTED_QUERIES])].slice(0, 3)
}
