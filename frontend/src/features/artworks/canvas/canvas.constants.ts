// Discovery-canvas tunables. Lengths are WORLD pixels (1 world px = `scale` CSS
// px on screen). Full geometry rationale lives in docs/ARCHITECTURE.md.

// Grid pitch — one card slot. Sized so the hero fills exactly one cell.
export const CELL_W = 540
export const CELL_H = 360

// Card size; the leftover (CELL − CARD) splits into even gutters.
export const CARD_W = 460
export const CARD_H = 300

// Fetch/cache unit = TILE_CELLS × TILE_CELLS cells.
export const TILE_CELLS = 4
export const TILE_W = CELL_W * TILE_CELLS
export const TILE_H = CELL_H * TILE_CELLS

// Extra ring of tiles kept warm around the visible ones.
export const TILE_MARGIN = 1

// Hard cap on simultaneously mounted tiles (degrades to empty, never freezes).
export const MAX_TILES = 80

// Zoom bounds (1 = the mockup framing; the far low end feeds the easter egg).
export const MAX_SCALE = 1
export const MIN_SCALE = 0.015

// Cross-fade thresholds (scale) from map cards to the brand mosaic.
export const CARDS_FADE_START = 0.5
export const CARDS_MIN_SCALE = 0.32
export const EGG_FADE_START = 0.45
export const EGG_FULL_SCALE = 0.28

// Card-free rectangle the hero sits in — clears exactly the centre cell (0,0).
export const HERO_ZONE = { x: -270, y: -180, width: 540, height: 360 }

// Camera distance (world px) or any zoom-out past which the Refocus pill shows.
export const AWAY_DISTANCE = 240

// Keyboard pan step, in screen px per key press.
export const KEY_PAN_STEP = 90

// Wheel-zoom sensitivity: factor = exp(-deltaY × intensity).
export const WHEEL_ZOOM_INTENSITY = 0.0022
