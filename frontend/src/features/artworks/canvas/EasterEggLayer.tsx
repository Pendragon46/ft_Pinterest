import { memo, useEffect, useState } from 'react'
import type { RefObject } from 'react'

import {
  ATLAAS_MARK_CENTER,
  ATLAAS_MARK_PATHS,
  ATLAAS_MARK_VIEWBOX,
} from '@/components/ui/atlaasMark'

import { CARD_H, CARD_W, CELL_H, CELL_W } from './canvas.constants'

// Zoom-out easter egg: scattered cards resolve into the Atlaas compass mark.
// The mosaic is aligned to grid cells so the cards line up into the logo as they
// fade out. The lit cells are computed by sampling the SAME picto geometry the
// rest of the app uses (`ATLAAS_MARK_PATHS`) — not a private ellipse
// approximation — so the mark can never drift from the real logo, and the
// non-square cell ratio is applied exactly once, at the mapping step. Opacity is
// driven imperatively by the camera hook via `layerRef`.

// Mosaic resolution. GRID_X is derived so the world-px span (GRID_X*CELL_W wide,
// GRID_Y*CELL_H tall) is visually SQUARE despite non-square cells, and forced
// EVEN so the mosaic straddles the world origin.
const GRID_Y = 44
const GRID_X = 2 * Math.round((GRID_Y * CELL_H) / CELL_W / 2)

const COL0 = -GRID_X / 2
const ROW0 = -GRID_Y / 2
const OFFSET_X = (CELL_W - CARD_W) / 2
const OFFSET_Y = (CELL_H - CARD_H) / 2

// 1 = the mosaic covers the full mark; >1 insets it toward the centre (if
// detached petals ever need to read better at this resolution). 1 is truest.
const MARK_INSET = 1

const [VIEW_W, VIEW_H] = (() => {
  const [, , w, h] = ATLAAS_MARK_VIEWBOX.split(' ').map(Number)
  return [w, h]
})()

interface Pixel {
  x: number
  y: number
}

// Sample the real picto: for each grid cell centre, map into the picto's own
// viewBox and test membership against the union of its sub-paths via native
// Path2D + isPointInPath (the exact fill test the browser already implements).
// Browser-only (Path2D doesn't exist in Node); returns [] without a 2D context.
function computePixels(): Pixel[] {
  if (typeof document === 'undefined') return []
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return []

  const paths = ATLAAS_MARK_PATHS.map(({ d }) => new Path2D(d))
  const inMark = (vx: number, vy: number) =>
    paths.some((p) => ctx.isPointInPath(p, vx, vy))

  const out: Pixel[] = []
  for (let py = 0; py < GRID_Y; py++) {
    for (let px = 0; px < GRID_X; px++) {
      // Cell centre in [-0.5, 0.5] across the (square) span → picto viewBox.
      const u = (px + 0.5) / GRID_X - 0.5
      const v = (py + 0.5) / GRID_Y - 0.5
      const vx = ATLAAS_MARK_CENTER.x + (u * VIEW_W) / MARK_INSET
      const vy = ATLAAS_MARK_CENTER.y + (v * VIEW_H) / MARK_INSET
      if (inMark(vx, vy)) {
        out.push({ x: px * CELL_W + OFFSET_X, y: py * CELL_H + OFFSET_Y })
      }
    }
  }
  return out
}

// Computed once at module load in the browser. The layer only mounts far past
// the mockup zoom, so this has run long before it's needed.
const INITIAL_PIXELS = computePixels()

const SVG_LEFT = COL0 * CELL_W
const SVG_TOP = ROW0 * CELL_H
const SVG_W = GRID_X * CELL_W
const SVG_H = GRID_Y * CELL_H

interface EasterEggLayerProps {
  layerRef: RefObject<HTMLDivElement | null>
}

// React 19 ref-as-prop (no forwardRef). PIXELS is effectively constant; the lone
// effect only covers the edge case where the module first ran without a DOM.
export const EasterEggLayer = memo(function EasterEggLayer({
  layerRef,
}: EasterEggLayerProps) {
  const [pixels, setPixels] = useState(INITIAL_PIXELS)
  useEffect(() => {
    if (pixels.length === 0) setPixels(computePixels())
  }, [pixels.length])

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
        {pixels.map((p) => (
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