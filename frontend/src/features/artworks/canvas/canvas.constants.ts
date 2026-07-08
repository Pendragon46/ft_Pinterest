// Every tunable of the discovery canvas, in one place.
//
// All lengths are WORLD pixels (the plane's own unit) unless stated
// otherwise. On screen, one world pixel measures `scale` CSS pixels.
//
// The plane has two nested grids:
// - CELL: one card slot. Each cell holds AT MOST one card, jittered inside
//   it with padding — overlaps are impossible by construction, placement is
//   O(1), and any region generates in O(cells), never O(world).
// - TILE: the fetch/cache unit = TILE_CELLS × TILE_CELLS cells. Fetching by
//   tile keeps the number of requests low (one per ~16 cards) and gives the
//   future backend a sane, cacheable endpoint shape.

/** Size of one card slot — the grid pitch. Non-square on purpose: rows read
    tighter than columns, like the mockup. */
export const CELL_W = 780
export const CELL_H = 620

/** Fixed card size. Every card is identical and centered in its cell, so the
    plane reads as a clean, evenly-guttered grid. The leftover space
    (CELL − CARD) is split into equal gutters on each side — 50 world px, i.e.
    100 world px between neighbours in both axes. */
export const CARD_W = 680
export const CARD_H = 520

/** Cells per tile side (tile = 4×4 cells → ≈ 3120×2480 world px). */
export const TILE_CELLS = 4
export const TILE_W = CELL_W * TILE_CELLS
export const TILE_H = CELL_H * TILE_CELLS

/** Extra ring of tiles fetched around the visible ones so cards already sit
    in cache when they enter the screen while panning. */
export const TILE_MARGIN = 1

/** Hard safety cap on simultaneously mounted tiles. If a future tweak breaks
    the window math, we degrade to an empty map instead of freezing the tab
    with thousands of nodes. */
export const MAX_TILES = 80

/** Zoom bounds. 1 = the mockup's framing (the design forbids zooming closer);
    the far low end exists for the easter egg. */
export const MAX_SCALE = 1
export const MIN_SCALE = 0.015

/** Cross-fade thresholds (scale values), from "map" to "brand mosaic":
    cards start fading below CARDS_FADE_START, unmount below CARDS_MIN_SCALE;
    the logo mosaic fades in between EGG_FADE_START and EGG_FULL_SCALE. */
export const CARDS_FADE_START = 0.5
export const CARDS_MIN_SCALE = 0.32
export const EGG_FADE_START = 0.45
export const EGG_FULL_SCALE = 0.28

/** World rectangle kept card-free so the hero/search overlay can breathe
    (the airy middle of the mockup). Cards whose rect intersects it are
    simply not generated. */
export const HERO_ZONE = { x: -560, y: -360, width: 1120, height: 720 }

/** Camera distance from the origin (world px) past which the Refocus pill
    shows up. Any zoom-out also counts as "away". */
export const AWAY_DISTANCE = 240

/** Keyboard pan step, in SCREEN pixels per key press. */
export const KEY_PAN_STEP = 90

/** Wheel-zoom sensitivity: scale factor = exp(-deltaY × intensity). */
export const WHEEL_ZOOM_INTENSITY = 0.0022
