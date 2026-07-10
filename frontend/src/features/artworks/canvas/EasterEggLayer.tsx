import { memo } from 'react'
import type { RefObject } from 'react'

import { CARD_H, CARD_W, CELL_H, CELL_W } from './canvas.constants'

// Zoom-out easter egg: scattered cards resolve into the Atlaas compass mark.
// The mosaic is aligned to grid cells so the cards line up into the logo as
// they fade out. Geometry is computed once at module load into a fixed rect
// list; opacity is driven imperatively by the camera hook via `layerRef`.

const VIEW = 48 // logo viewBox the geometry below is expressed in

// GRID_X is derived to keep the mark visually square in world px despite
// non-square cells, and forced EVEN so the mosaic straddles the world origin.
const GRID_Y = 44
const GRID_X = 2 * Math.round((GRID_Y * CELL_H) / CELL_W / 2)

const COL0 = -GRID_X / 2
const ROW0 = -GRID_Y / 2
const OFFSET_X = (CELL_W - CARD_W) / 2
const OFFSET_Y = (CELL_H - CARD_H) / 2

interface Ellipse {
  cx: number
  cy: number
  rx: number
  ry: number
}

const SHAPES: Ellipse[] = [
  { cx: 24, cy: 9.5, rx: 5.5, ry: 7.5 },
  { cx: 24, cy: 38.5, rx: 5.5, ry: 7.5 },
  { cx: 9.5, cy: 24, rx: 7.5, ry: 5.5 },
  { cx: 38.5, cy: 24, rx: 7.5, ry: 5.5 },
  { cx: 24, cy: 24, rx: 6.5, ry: 6.5 }, // the center circle, as an ellipse
]

function inMark(px: number, py: number): boolean {
  // Sample at each raster cell's center, mapped into the 48-unit viewBox.
  const x = ((px + 0.5) / GRID_X) * VIEW
  const y = ((py + 0.5) / GRID_Y) * VIEW
  return SHAPES.some(({ cx, cy, rx, ry }) => {
    const nx = (x - cx) / rx
    const ny = (y - cy) / ry
    return nx * nx + ny * ny <= 1
  })
}

// Lit pixels → card-sized rects at grid-cell positions, in SVG-local coords.
interface Pixel {
  x: number
  y: number
}

const PIXELS: Pixel[] = (() => {
  const out: Pixel[] = []
  for (let py = 0; py < GRID_Y; py++) {
    for (let px = 0; px < GRID_X; px++) {
      if (inMark(px, py)) {
        out.push({ x: px * CELL_W + OFFSET_X, y: py * CELL_H + OFFSET_Y })
      }
    }
  }
  return out
})()

const SVG_LEFT = COL0 * CELL_W
const SVG_TOP = ROW0 * CELL_H
const SVG_W = GRID_X * CELL_W
const SVG_H = GRID_Y * CELL_H

interface EasterEggLayerProps {
  layerRef: RefObject<HTMLDivElement | null>
}

// React 19 ref-as-prop (no forwardRef); memo because props never change once mounted.
export const EasterEggLayer = memo(function EasterEggLayer({
  layerRef,
}: EasterEggLayerProps) {
  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0"
      style={{ opacity: 0, willChange: 'opacity' }}
    >
      <svg
        width={SVG_W}
        height={SVG_H}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ position: 'absolute', left: SVG_LEFT, top: SVG_TOP }}
      >
        {PIXELS.map((p) => (
          <rect
            key={`${p.x}-${p.y}`}
            x={p.x}
            y={p.y}
            width={CARD_W}
            height={CARD_H}
            rx={24}
            className="fill-neutral-900"
          />
        ))}
      </svg>
    </div>
  )
})
