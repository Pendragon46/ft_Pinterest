// Deterministic mock: every cell is a pure function of its (cx, cy).

import { CARD_H, CARD_W, CELL_H, CELL_W, HERO_ZONE, TILE_CELLS } from './canvas/canvas.constants'
import { CATEGORIES } from './artwork.types'
import type {
  ArtworkComment,
  ArtworkDetail,
  ArtworkKind,
  AuthorSummary,
  CanvasArtwork,
  Category,
} from './artwork.types'

// Mix (cx, cy) into a 32-bit seed; avalanche so neighbouring cells diverge.
function cellSeed(cx: number, cy: number): number {
  let h = (cx * 374761393 + cy * 668265263) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (h ^ (h >>> 16)) >>> 0
}

// mulberry32 PRNG → floats in [0, 1).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)]
}

function int(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

// Mock DATA, not UI chrome — deliberately not translated.

export const AUTHORS: readonly AuthorSummary[] = [
  { id: 'u1', username: 'Sedra Rabe', handle: 'sedra', color: '#3b5bdb' },
  { id: 'u2', username: 'Kai Mori', handle: 'kaimori', color: '#c47b1c' },
  { id: 'u3', username: 'Nova Idris', handle: 'novaidris', color: '#0ca678' },
  { id: 'u4', username: 'Léa Fontaine', handle: 'leafont', color: '#9c36b5' },
  { id: 'u5', username: 'Yuki Tanaka', handle: 'yukita', color: '#e8590c' },
  { id: 'u6', username: 'Omar Haddad', handle: 'omarh', color: '#1971c2' },
  { id: 'u7', username: 'June Park', handle: 'junepark', color: '#e64980' },
  { id: 'u8', username: 'Milo Costa', handle: 'milocosta', color: '#2f9e44' },
]

const TITLE_HEAD = [
  'Spectral', 'Quiet', 'Liquid', 'Amber', 'Fractal', 'Analog',
  'Nocturne', 'Solar', 'Paper', 'Vernal', 'Static', 'Hollow',
] as const

const TITLE_TAIL = [
  'Index', 'Study', 'Atlas', 'Field', 'Archive', 'Season',
  'Sequence', 'Garden', 'Signal', 'Margin', 'Chorus', 'Drift',
] as const

const DESCRIPTIONS = [
  'An exploration of restraint — what remains when everything optional is removed.',
  'Part of an ongoing series about light, repetition and the space between shapes.',
  'A study started as a warm-up sketch and kept alive far longer than planned.',
  'Made in one sitting, refined over three weeks. The grid did most of the work.',
  'Trying to make something that feels inevitable rather than designed.',
] as const

const TAG_BANK = [
  'broad', 'inspiration', 'minimal', 'texture', 'grid',
  'print', 'archive', 'color', 'studio', 'process',
] as const

const COMMENT_BANK = [
  'This is stunning — the restraint really works.',
  'Feels like it belongs in a museum.',
  'How did you get that gradient so smooth?',
  'Saving this for my moodboard immediately.',
  'The composition on this one is unreal.',
  'Would love a breakdown of your process!',
  'That palette is doing all the heavy lifting, beautifully.',
  'Came from the far side of the map for this. Worth it.',
] as const

/** Trending searches shown under the hero.
    TODO(backend): replace with GET /search/trending. */
export const SUGGESTED_QUERIES = [
  'Mobile trend UI',
  'Sans Serif Typo',
  'Luxury Brand',
] as const

// Sector 0..7 of the compass; +0.5 rotates seams off the axes so each
// cardinal direction has one clear category owner.
function sectorAt(cx: number, cy: number): number {
  const angle = Math.atan2(cy, cx) // [-π, π]
  return Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 8 + 0.5) % 8
}

function categoryAt(cx: number, cy: number): Category {
  if (cx === 0 && cy === 0) return CATEGORIES[0]
  return CATEGORIES[sectorAt(cx, cy)]
}

// Placeholder color: hue=angle, saturation/lightness=distance — the "niche
// depth" indicator until real images exist.
function colorAt(cx: number, cy: number, rng: () => number): string {
  const distance = Math.hypot(cx, cy) // in cells
  const angle = Math.atan2(cy, cx)
  const hue = Math.round(
    (((angle + Math.PI) / (2 * Math.PI)) * 360 + rng() * 24 - 12 + 360) % 360,
  )
  const saturation = Math.round(Math.min(96, 18 + distance * 7))
  const lightness = Math.round(Math.max(54, 88 - distance * 2.6))
  return `hsl(${hue} ${saturation}% ${lightness}%)`
}

// id encodes the cell ("w_cx_cy") so the detail view regenerates from id alone.
export function artworkIdAt(cx: number, cy: number): string {
  return `w_${cx}_${cy}`
}

function cellOfId(id: string): { cx: number; cy: number } | null {
  const match = /^w_(-?\d+)_(-?\d+)$/.exec(id)
  if (!match) return null
  return { cx: Number(match[1]), cy: Number(match[2]) }
}

function intersectsHeroZone(
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  return (
    x < HERO_ZONE.x + HERO_ZONE.width &&
    x + width > HERO_ZONE.x &&
    y < HERO_ZONE.y + HERO_ZONE.height &&
    y + height > HERO_ZONE.y
  )
}

export interface CellSlot {
  x: number
  y: number
  width: number
  height: number
}

/** The rect a cell's card occupies, or null if the cell is empty (hero clearing). */
export function cellSlot(cx: number, cy: number): CellSlot | null {
  const x = cx * CELL_W - CARD_W / 2
  const y = cy * CELL_H - CARD_H / 2
  if (intersectsHeroZone(x, y, CARD_W, CARD_H)) return null
  return { x, y, width: CARD_W, height: CARD_H }
}

/** Every card slot of a tile — used to render skeletons while it loads. */
export function tileSlots(tx: number, ty: number): CellSlot[] {
  const slots: CellSlot[] = []
  for (let dy = 0; dy < TILE_CELLS; dy++) {
    for (let dx = 0; dx < TILE_CELLS; dx++) {
      const slot = cellSlot(tx * TILE_CELLS + dx, ty * TILE_CELLS + dy)
      if (slot) slots.push(slot)
    }
  }
  return slots
}

/** The single card of a cell, or null (empty cell / hero clearing). */
export function generateCell(cx: number, cy: number): CanvasArtwork | null {
  const slot = cellSlot(cx, cy)
  if (!slot) return null
  const rng = mulberry32(cellSeed(cx, cy))

  const kindRoll = rng()
  const kind: ArtworkKind =
    kindRoll < 0.06 ? 'sponsor' : kindRoll < 0.22 ? 'ai' : 'standard'
  const viewCount = int(rng, 300, 42000)

  return {
    id: artworkIdAt(cx, cy),
    title: `${pick(rng, TITLE_HEAD)} ${pick(rng, TITLE_TAIL)}`,
    category: categoryAt(cx, cy),
    kind,
    color: colorAt(cx, cy, rng),
    viewCount,
    likeCount: Math.round(viewCount * (0.04 + rng() * 0.1)),
    commentCount: int(rng, 2, 24),
    author: pick(rng, AUTHORS),
    x: slot.x,
    y: slot.y,
    width: slot.width,
    height: slot.height,
  }
}

/** All cards of one tile (the fetch unit: TILE_CELLS × TILE_CELLS cells). */
export function generateTile(tx: number, ty: number): CanvasArtwork[] {
  const cards: CanvasArtwork[] = []
  for (let dy = 0; dy < TILE_CELLS; dy++) {
    for (let dx = 0; dx < TILE_CELLS; dx++) {
      const card = generateCell(tx * TILE_CELLS + dx, ty * TILE_CELLS + dy)
      if (card) cards.push(card)
    }
  }
  return cards
}

/** Full detail for one artwork id, or null if the id maps to nothing. */
export function generateDetail(id: string): ArtworkDetail | null {
  const cell = cellOfId(id)
  if (!cell) return null
  const card = generateCell(cell.cx, cell.cy)
  if (!card) return null

  // Fresh xor'd seed so detail extras don't perturb the card's draw order.
  const rng = mulberry32(cellSeed(cell.cx, cell.cy) ^ 0x9e3779b9)
  const tags = [...new Set([card.category as string, pick(rng, TAG_BANK), pick(rng, TAG_BANK)])]

  return {
    id: card.id,
    title: card.title,
    category: card.category,
    kind: card.kind,
    color: card.color,
    viewCount: card.viewCount,
    likeCount: card.likeCount,
    commentCount: card.commentCount,
    author: card.author,
    description: pick(rng, DESCRIPTIONS),
    tags,
  }
}

/** Comment thread for one artwork id (newest first). */
export function generateComments(id: string): ArtworkComment[] {
  const cell = cellOfId(id)
  if (!cell) return []
  const rng = mulberry32(cellSeed(cell.cx, cell.cy) ^ 0x85ebca6b)
  const count = int(rng, 2, 6)
  const comments: ArtworkComment[] = []
  let hoursAgo = 0
  for (let i = 0; i < count; i++) {
    comments.push({
      id: `${id}_c${i}`,
      author: pick(rng, AUTHORS),
      content: pick(rng, COMMENT_BANK),
      likeCount: int(rng, 0, 18),
      hoursAgo,
    })
    hoursAgo += int(rng, 1, 9)
  }
  return comments
}
