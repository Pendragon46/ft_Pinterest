import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

import {
  AWAY_DISTANCE,
  CARDS_FADE_START,
  CARDS_MIN_SCALE,
  CELL_H,
  CELL_W,
  EGG_FADE_START,
  EGG_FULL_SCALE,
  KEY_PAN_STEP,
  MAX_SCALE,
  MAX_TILES,
  MIN_SCALE,
  TILE_H,
  TILE_MARGIN,
  TILE_W,
  WHEEL_ZOOM_INTENSITY,
} from './canvas.constants'

// Continuous camera values live in refs and are written to the DOM in one rAF
// loop; React state holds only the sparse render snapshot. See docs/ARCHITECTURE.md.

/** Inclusive tile-coordinate range to mount (null = no cards at all). */
export interface TileWindow {
  minTx: number
  maxTx: number
  minTy: number
  maxTy: number
}

/** The sparse, render-driving snapshot the hook reports to React. */
/** Inclusive on-screen cell range (no margin) — the surface the viewport covers. */
export interface CellRange {
  minCx: number
  maxCx: number
  minCy: number
  maxCy: number
}

export interface CanvasView {
  window: TileWindow | null
  cells: CellRange | null
  showEgg: boolean
  isAway: boolean
}

interface Camera {
  x: number
  y: number
  scale: number
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/** Screen distance under which a press-release counts as a click, not a pan. */
const CLICK_SLOP_PX = 6

export function useCanvasCamera() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const worldRef = useRef<HTMLDivElement | null>(null)
  const cardsLayerRef = useRef<HTMLDivElement | null>(null)
  const eggLayerRef = useRef<HTMLDivElement | null>(null)

  const [view, setView] = useState<CanvasView>({
    window: null,
    cells: null,
    showEgg: false,
    isAway: false,
  })
  // Mirror of `view` readable inside the rAF loop without re-subscribing.
  const viewRef = useRef<CanvasView>(view)

  const cam = useRef<Camera>({ x: 0, y: 0, scale: MAX_SCALE })
  const viewport = useRef({ w: 1, h: 1 })
  /** Content velocity in screen px/ms — feeds the release inertia. */
  const velocity = useRef({ x: 0, y: 0 })
  /** Refocus animation target (null = no animation running). */
  const target = useRef<Camera | null>(null)

  const dragging = useRef(false)
  const captured = useRef(false)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinchLastDist = useRef(0)
  const pinchLastMid = useRef({ x: 0, y: 0 })
  const lastMove = useRef({ x: 0, y: 0, t: 0 })
  const dragDistance = useRef(0)

  const rafId = useRef<number | null>(null)
  const lastFrame = useRef(0)
  const reducedMotion = useRef(false)
  // Latest `frame` so the rAF loop can re-schedule without self-referencing
  // (linter-forbidden and a stale-closure risk).
  const frameRef = useRef<(now: number) => void>(() => {})

  // Per-frame sync: DOM writes + sparse React state.
  const syncFrame = useCallback(() => {
    const { x, y, scale } = cam.current
    const { w, h } = viewport.current

    const world = worldRef.current
    if (world) {
      world.style.transform = `translate3d(${w / 2 - x * scale}px, ${
        h / 2 - y * scale
      }px, 0) scale(${scale})`
    }
    // Cross-fade cards → brand mosaic, driven per-frame outside React.
    const cards = cardsLayerRef.current
    if (cards) {
      cards.style.opacity = String(
        clamp((scale - CARDS_MIN_SCALE) / (CARDS_FADE_START - CARDS_MIN_SCALE), 0, 1),
      )
    }
    const egg = eggLayerRef.current
    if (egg) {
      egg.style.opacity = String(
        clamp((EGG_FADE_START - scale) / (EGG_FADE_START - EGG_FULL_SCALE), 0, 1),
      )
    }

    // Derived state is ints/bools only, so a plain comparison gates re-renders.
    let nextWindow: TileWindow | null = null
    let cells: CellRange | null = null
    if (scale >= CARDS_MIN_SCALE) {
      const halfW = w / 2 / scale
      const halfH = h / 2 / scale
      nextWindow = {
        minTx: Math.floor((x - halfW) / TILE_W) - TILE_MARGIN,
        maxTx: Math.floor((x + halfW) / TILE_W) + TILE_MARGIN,
        minTy: Math.floor((y - halfH) / TILE_H) - TILE_MARGIN,
        maxTy: Math.floor((y + halfH) / TILE_H) + TILE_MARGIN,
      }
      // Safety valve: never mount an unbounded number of tiles.
      const count =
        (nextWindow.maxTx - nextWindow.minTx + 1) *
        (nextWindow.maxTy - nextWindow.minTy + 1)
      if (count > MAX_TILES) nextWindow = null
      // On-screen cell range (no margin) — the surface the viewport has covered,
      // which drives niche completion (§8.1).
      cells = {
        minCx: Math.floor((x - halfW) / CELL_W),
        maxCx: Math.floor((x + halfW) / CELL_W),
        minCy: Math.floor((y - halfH) / CELL_H),
        maxCy: Math.floor((y + halfH) / CELL_H),
      }
    }
    const showEgg = scale < EGG_FADE_START
    const isAway = Math.hypot(x, y) > AWAY_DISTANCE || scale < 0.95

    const prev = viewRef.current
    const sameWindow =
      (prev.window === null && nextWindow === null) ||
      (prev.window !== null &&
        nextWindow !== null &&
        prev.window.minTx === nextWindow.minTx &&
        prev.window.maxTx === nextWindow.maxTx &&
        prev.window.minTy === nextWindow.minTy &&
        prev.window.maxTy === nextWindow.maxTy)
    const sameCells =
      (prev.cells === null && cells === null) ||
      (prev.cells !== null &&
        cells !== null &&
        prev.cells.minCx === cells.minCx &&
        prev.cells.maxCx === cells.maxCx &&
        prev.cells.minCy === cells.minCy &&
        prev.cells.maxCy === cells.maxCy)
    if (
      !sameWindow ||
      !sameCells ||
      prev.showEgg !== showEgg ||
      prev.isAway !== isAway
    ) {
      // Reuse window's reference when its values are unchanged (only `cells`
      // moved) so the tile memo / queries don't re-subscribe on a plain pan.
      const next: CanvasView = {
        window: sameWindow ? prev.window : nextWindow,
        cells,
        showEgg,
        isAway,
      }
      viewRef.current = next
      setView(next)
    }
  }, [])

  // The single rAF loop — runs only while something moves, then stops.
  const frame = useCallback(
    (now: number) => {
      rafId.current = null
      const dt = Math.min(48, Math.max(1, now - lastFrame.current))
      lastFrame.current = now

      let active = dragging.current

      // Release inertia — the map keeps gliding, then eases out.
      if (!dragging.current) {
        const v = velocity.current
        if (Math.hypot(v.x, v.y) > 0.005) {
          cam.current.x -= (v.x * dt) / cam.current.scale
          cam.current.y -= (v.y * dt) / cam.current.scale
          const decay = Math.pow(0.94, dt / 16)
          v.x *= decay
          v.y *= decay
          active = true
        } else {
          v.x = 0
          v.y = 0
        }
      }

      // Refocus animation: exponential approach — same feel at any frame rate.
      const t = target.current
      if (t) {
        const k = 1 - Math.exp(-dt / 120)
        cam.current.x += (t.x - cam.current.x) * k
        cam.current.y += (t.y - cam.current.y) * k
        cam.current.scale += (t.scale - cam.current.scale) * k
        const settled =
          Math.abs(t.x - cam.current.x) < 0.5 &&
          Math.abs(t.y - cam.current.y) < 0.5 &&
          Math.abs(t.scale - cam.current.scale) < 0.002
        if (settled) {
          cam.current = { ...t }
          target.current = null
        } else {
          active = true
        }
      }

      syncFrame()
      if (active) rafId.current = requestAnimationFrame(frameRef.current)
    },
    [syncFrame],
  )

  // Keep the ref pointing at the current frame implementation (in an effect).
  useEffect(() => {
    frameRef.current = frame
  }, [frame])

  /** Ask for (at least) one synced frame; keeps itself alive while moving. */
  const requestSync = useCallback(() => {
    if (rafId.current === null) {
      lastFrame.current = performance.now()
      rafId.current = requestAnimationFrame(frameRef.current)
    }
  }, [])

  /** Animate the camera toward a target — the primitive `refocus` builds on.
      Kept private (the hero stays fixed on search, so nothing else animates the
      camera). Instant under reduced motion. */
  const flyTo = useCallback(
    (next: Camera) => {
      velocity.current = { x: 0, y: 0 }
      if (reducedMotion.current) {
        cam.current = { ...next }
        target.current = null
      } else {
        target.current = { ...next }
      }
      requestSync()
    },
    [requestSync],
  )

  /** Animate home: origin, mockup zoom. Instant under reduced motion. */
  const refocus = useCallback(() => {
    flyTo({ x: 0, y: 0, scale: MAX_SCALE })
  }, [flyTo])

  // Gestures & environment — one effect, symmetric add/remove (StrictMode-safe).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Snapshot refs used by cleanup so it reads the same objects the effect set up.
    const activePointers = pointers.current
    const rafHandle = rafId

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotion.current = motionQuery.matches
    const onMotionChange = () => {
      reducedMotion.current = motionQuery.matches
    }
    motionQuery.addEventListener('change', onMotionChange)

    const measure = () => {
      viewport.current = { w: el.clientWidth, h: el.clientHeight }
      requestSync()
    }
    measure()
    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(el)

    /** Form controls handle their own events; cards are <a> so a pan may start on them. */
    const isFormTarget = (eventTarget: EventTarget | null): boolean =>
      eventTarget instanceof Element &&
      eventTarget.closest('input, textarea, select, button') !== null

    const zoomAtLocal = (px: number, py: number, factor: number) => {
      const { w, h } = viewport.current
      const c = cam.current
      const nextScale = clamp(c.scale * factor, MIN_SCALE, MAX_SCALE)
      if (nextScale === c.scale) return
      // Keep the world point under (px, py) pinned while the scale changes.
      const worldX = c.x + (px - w / 2) / c.scale
      const worldY = c.y + (py - h / 2) / c.scale
      c.scale = nextScale
      c.x = worldX - (px - w / 2) / nextScale
      c.y = worldY - (py - h / 2) / nextScale
      requestSync()
    }

    const onPointerDown = (event: PointerEvent) => {
      if (isFormTarget(event.target)) return
      if (event.pointerType === 'mouse' && event.button !== 0) return
      pointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      })
      target.current = null
      velocity.current = { x: 0, y: 0 }
      if (pointers.current.size === 1) {
        dragging.current = true
        captured.current = false
        dragDistance.current = 0
        lastMove.current = { x: event.clientX, y: event.clientY, t: event.timeStamp }
      } else if (pointers.current.size === 2) {
        // Entering pinch: both fingers belong to the gesture from now on.
        const [a, b] = [...pointers.current.values()]
        pinchLastDist.current = Math.hypot(a.x - b.x, a.y - b.y)
        pinchLastMid.current = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        el.setPointerCapture(event.pointerId)
      }
      requestSync()
    }

    const onPointerMove = (event: PointerEvent) => {
      const point = pointers.current.get(event.pointerId)
      if (!point) return
      point.x = event.clientX
      point.y = event.clientY

      if (pointers.current.size >= 2) {
        // Pinch: zoom around the midpoint, pan with the midpoint.
        const [a, b] = [...pointers.current.values()]
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        if (pinchLastDist.current > 0) {
          const rect = el.getBoundingClientRect()
          zoomAtLocal(mid.x - rect.left, mid.y - rect.top, dist / pinchLastDist.current)
          cam.current.x -= (mid.x - pinchLastMid.current.x) / cam.current.scale
          cam.current.y -= (mid.y - pinchLastMid.current.y) / cam.current.scale
        }
        pinchLastDist.current = dist
        pinchLastMid.current = mid
        dragDistance.current = CLICK_SLOP_PX + 1 // a pinch is never a click
        requestSync()
        return
      }

      if (!dragging.current) return
      const dx = event.clientX - lastMove.current.x
      const dy = event.clientY - lastMove.current.y
      const dt = Math.max(1, event.timeStamp - lastMove.current.t)
      dragDistance.current += Math.hypot(dx, dy)

      // Capture only once the press is proven a pan; capturing on pointerdown
      // would retarget the release and eat the click that opens a card.
      if (!captured.current && dragDistance.current > CLICK_SLOP_PX) {
        el.setPointerCapture(event.pointerId)
        captured.current = true
      }

      cam.current.x -= dx / cam.current.scale
      cam.current.y -= dy / cam.current.scale
      // Low-pass filter so inertia launches with recent hand speed, not one sample.
      velocity.current.x = 0.75 * velocity.current.x + 0.25 * (dx / dt)
      velocity.current.y = 0.75 * velocity.current.y + 0.25 * (dy / dt)
      lastMove.current = { x: event.clientX, y: event.clientY, t: event.timeStamp }
      requestSync()
    }

    const onPointerEnd = (event: PointerEvent) => {
      if (!pointers.current.delete(event.pointerId)) return
      if (pointers.current.size === 0) {
        dragging.current = false
        captured.current = false
        pinchLastDist.current = 0
        if (reducedMotion.current) velocity.current = { x: 0, y: 0 }
        requestSync() // hands over to the inertia
      } else if (pointers.current.size === 1) {
        // Pinch → single-finger pan: re-anchor to the remaining finger.
        const [rest] = [...pointers.current.values()]
        lastMove.current = { x: rest.x, y: rest.y, t: event.timeStamp }
        pinchLastDist.current = 0
        dragging.current = true
      }
    }

    // Swallow the click after a real drag (capture phase) so a pan ending on a card doesn't open it.
    const onClickCapture = (event: MouseEvent) => {
      if (dragDistance.current > CLICK_SLOP_PX) {
        event.preventDefault()
        event.stopPropagation()
        dragDistance.current = 0
      }
    }

    // Plain wheel pans; Ctrl/⌘+wheel (and trackpad pinch, reported as ctrl+wheel)
    // zooms toward the cursor. Non-passive: we must preventDefault or the page zooms.
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      target.current = null
      const unit = event.deltaMode === 1 ? 16 : 1 // lines → px
      if (event.ctrlKey || event.metaKey) {
        const rect = el.getBoundingClientRect()
        zoomAtLocal(
          event.clientX - rect.left,
          event.clientY - rect.top,
          Math.exp(-event.deltaY * unit * WHEEL_ZOOM_INTENSITY),
        )
      } else {
        cam.current.x += (event.deltaX * unit) / cam.current.scale
        cam.current.y += (event.deltaY * unit) / cam.current.scale
        velocity.current = { x: 0, y: 0 }
        requestSync()
      }
    }

    // Keyboard: arrows pan, +/− zoom, Home/0 recenters.
    const onKeyDown = (event: KeyboardEvent) => {
      if (isFormTarget(event.target)) return
      const step = KEY_PAN_STEP / cam.current.scale
      const { w, h } = viewport.current
      let handled = true
      switch (event.key) {
        case 'ArrowLeft':
          cam.current.x -= step
          break
        case 'ArrowRight':
          cam.current.x += step
          break
        case 'ArrowUp':
          cam.current.y -= step
          break
        case 'ArrowDown':
          cam.current.y += step
          break
        case '+':
        case '=':
          zoomAtLocal(w / 2, h / 2, 1.25)
          break
        case '-':
        case '_':
          zoomAtLocal(w / 2, h / 2, 1 / 1.25)
          break
        case 'Home':
        case '0':
          refocus()
          break
        default:
          handled = false
      }
      if (handled) {
        event.preventDefault()
        requestSync()
      }
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerEnd)
    el.addEventListener('pointercancel', onPointerEnd)
    el.addEventListener('click', onClickCapture, true)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('keydown', onKeyDown)
    requestSync()

    return () => {
      resizeObserver.disconnect()
      motionQuery.removeEventListener('change', onMotionChange)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerEnd)
      el.removeEventListener('pointercancel', onPointerEnd)
      el.removeEventListener('click', onClickCapture, true)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('keydown', onKeyDown)
      if (rafHandle.current !== null) {
        cancelAnimationFrame(rafHandle.current)
        rafHandle.current = null
      }
      activePointers.clear()
      dragging.current = false
    }
  }, [refocus, requestSync])

  return {
    containerRef: containerRef as RefObject<HTMLDivElement | null>,
    worldRef: worldRef as RefObject<HTMLDivElement | null>,
    cardsLayerRef: cardsLayerRef as RefObject<HTMLDivElement | null>,
    eggLayerRef: eggLayerRef as RefObject<HTMLDivElement | null>,
    view,
    refocus,
    requestSync,
  }
}
