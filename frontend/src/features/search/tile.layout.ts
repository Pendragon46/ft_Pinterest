// Le backend renvoie des listes plates, sans coordonnées. Ce module les
// place dans le plan du canvas de façon déterministe : une même tuile
// produit toujours la même disposition, donc la caméra peut revenir en
// arrière sans que le contenu ne saute.

import type { CanvasArtwork, Category } from '@/features/artworks/artwork.types'
import {
  CARD_H,
  CARD_W,
  CELL_H,
  CELL_W,
  TILE_CELLS,
} from '@/features/artworks/canvas/canvas.constants'
import { colorFromId, toAuthorSummary, type ServerArtwork } from '@/lib/mappers'

// PRNG à graine (mulberry32). Indispensable : Math.random() ferait varier
// la mise en page à chaque rendu, et les cartes danseraient sous la caméra.
function seeded(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Deux entiers signés → une graine unique. Le décalage évite que (2,3) et
// (3,2) produisent la même valeur.
function tileSeed(tx: number, ty: number): number {
  return ((tx & 0xffff) << 16) ^ (ty & 0xffff) ^ 0x9e3779b9
}

/** Page de résultats à demander pour une tuile donnée. Déterministe :
    même tuile → même page → même contenu. */
export function pageForTile(tx: number, ty: number, totalPages = 5): number {
  const rnd = seeded(tileSeed(tx, ty))
  return Math.floor(rnd() * totalPages) + 1
}

/** Nombre de cartes par tuile — une par cellule de la grille. */
export const ITEMS_PER_TILE = TILE_CELLS * TILE_CELLS

/** Place des artworks serveur dans la tuile (tx, ty). Une carte occupe le
    centre de sa cellule ; la variation de hauteur crée le rythme vertical
    du mur d'images sans jamais déborder de la cellule. */
export function layoutTile(
  items: ServerArtwork[],
  slug: Category | undefined,
  tx: number,
  ty: number,
): CanvasArtwork[] {
  if (items.length === 0) return []

  const rnd = seeded(tileSeed(tx, ty))
  const originX = tx * CELL_W * TILE_CELLS
  const originY = ty * CELL_H * TILE_CELLS
  // Marges internes de la cellule, réparties également.
  const padX = (CELL_W - CARD_W) / 2
  const padY = (CELL_H - CARD_H) / 2

  return Array.from({ length: ITEMS_PER_TILE }, (_, i) => {
    // Si le serveur renvoie moins d'items que de cellules, on boucle :
    // la tuile reste dense au lieu d'afficher des trous.
    const src = items[i % items.length]
    const col = i % TILE_CELLS
    const row = Math.floor(i / TILE_CELLS)

    // Hauteur entre 72 % et 100 % de la carte de référence.
    const height = Math.round(CARD_H * (0.72 + rnd() * 0.28))

    return {
      // `id` unique par emplacement (une œuvre peut se répéter),
      // `sourceId` stable pour ouvrir la bonne modale au clic.
      id: `${src.id}@${tx}.${ty}.${i}`,
      sourceId: src.id,
      title: src.title,
      category: (slug ?? 'illustration') as Category,
      kind: 'standard' as const,
      color: colorFromId(src.id),
      viewCount: 0,
      likeCount: src._count?.likes ?? 0,
      commentCount: src._count?.comments ?? 0,
      author: toAuthorSummary(src.author, src.authorId),
      x: Math.round(originX + col * CELL_W + padX),
      y: Math.round(originY + row * CELL_H + padY),
      width: CARD_W,
      height,
    }
  })
}
