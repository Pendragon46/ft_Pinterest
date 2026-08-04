// Le backend renvoie des listes plates, sans coordonnees. Ce module les
// place dans le plan du canvas de façon deterministe : une même tuile
// produit toujours la même disposition, donc la camera peut revenir en
// arriere sans que le contenu ne saute.

import type { CanvasArtwork, Category } from '@/features/artworks/artwork.types'
import {
  CARD_H,
  CARD_W,
  CELL_H,
  CELL_W,
  HERO_ZONE,
  TILE_CELLS,
} from '@/features/artworks/canvas/canvas.constants'
import {
  colorFromId,
  mediaTypeFromUrl,
  toAuthorSummary,
  type ServerArtwork,
} from '@/lib/mappers'

// PRNG a graine (mulberry32). Indispensable : Math.random() ferait varier
// la mise en page a chaque rendu, et les cartes danseraient sous la camera.
function seeded(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Deux entiers signes → une graine unique. Le decalage evite que (2,3) et
// (3,2) produisent la même valeur.
function tileSeed(tx: number, ty: number): number {
  return ((tx & 0xffff) << 16) ^ (ty & 0xffff) ^ 0x9e3779b9
}

/** Page de resultats a demander pour une tuile donnee. Deterministe :
    même tuile → même page → même contenu. */
export function pageForTile(tx: number, ty: number, totalPages = 5): number {
  const rnd = seeded(tileSeed(tx, ty))
  return Math.floor(rnd() * totalPages) + 1
}

/** Rectangle (coin haut-gauche) occupe par la carte d'une cellule, ou null si
    la cellule tombe dans la zone du heros — qu'on garde degagee, exactement
    comme le mock. Coordonnees MONDE : la carte est centree sur le point de
    grille `(cx·CELL_W, cy·CELL_H)`. */
function cellSlot(cx: number, cy: number): { x: number; y: number } | null {
  const x = cx * CELL_W - CARD_W / 2
  const y = cy * CELL_H - CARD_H / 2
  const hitsHero =
    x < HERO_ZONE.x + HERO_ZONE.width &&
    x + CARD_W > HERO_ZONE.x &&
    y < HERO_ZONE.y + HERO_ZONE.height &&
    y + CARD_H > HERO_ZONE.y
  return hitsHero ? null : { x, y }
}

/** Place des artworks serveur dans la tuile (tx, ty). Reproduit la grille du
    mock : cartes de **taille fixe** (CARD_W × CARD_H) centrees sur leur
    cellule, et cellules du heros **laissees vides**. Seul le contenu (quelle
    œuvre dans quelle cellule) vient du serveur. */
export function layoutTile(
  items: ServerArtwork[],
  slug: Category | undefined,
  tx: number,
  ty: number,
): CanvasArtwork[] {
  if (items.length === 0) return []

  const cards: CanvasArtwork[] = []
  let n = 0 // index dans `items`, avance seulement pour les cellules remplies
  for (let row = 0; row < TILE_CELLS; row += 1) {
    for (let col = 0; col < TILE_CELLS; col += 1) {
      const slot = cellSlot(tx * TILE_CELLS + col, ty * TILE_CELLS + row)
      if (!slot) continue // cellule du heros : laissee vide
      // Si le serveur renvoie moins d'items que de cellules, on boucle.
      const src = items[n % items.length]
      n += 1
      cards.push({
        // `id` unique par emplacement, `sourceId` stable pour la modale.
        id: `${src.id}@${tx}.${ty}.${col}.${row}`,
        sourceId: src.id,
        title: src.title,
        category: (slug ?? 'illustration') as Category,
        kind: 'standard' as const,
        color: colorFromId(src.id),
        // Media reel : la carte affiche l'image, pas seulement `color`.
        mediaUrl: src.mediaUrl,
        mediaType: mediaTypeFromUrl(src.mediaUrl),
        viewCount: 0,
        likeCount: src._count?.likes ?? 0,
        commentCount: src._count?.comments ?? 0,
        author: toAuthorSummary(src.author, src.authorId),
        x: slot.x,
        y: slot.y,
        width: CARD_W,
        height: CARD_H,
      })
    }
  }
  return cards
}
