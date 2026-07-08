import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

import {
  AWAY_DISTANCE,
  CARDS_FADE_START,
  CARDS_MIN_SCALE,
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

// The camera of the discovery canvas.
//
// THE core decision of the whole page: continuous values (camera position,
// scale, layer opacities) live in REFS and are written straight to the DOM
// inside one requestAnimationFrame loop — React renders NOTHING during a
// pan. React state only holds what changes the RENDERED TREE: the window of
// visible tiles (integers), and two booleans (easter egg mounted, camera
// away from home). Those change a few times per second at most, so React
// work stays negligible while the gesture itself runs at the display's
// refresh rate.
//
// Screen ↔ world: a world point p appears on screen at
//   screen = viewport/2 + (p − cam) × scale
// hence the layer transform
//   translate3d(vw/2 − cam.x·s, vh/2 − cam.y·s, 0) scale(s)
// and the inverse used for cursor-anchored zoom:
//   world = cam + (screen − viewport/2) / scale

/** Inclusive range of tile coordinates to mount (null = no cards at all,
    e.g. deep in easter-egg territory). */
export interface TileWindow {
  minTx: number
  maxTx: number
  minTy: number
  maxTy: number
}

/** The sparse, render-driving snapshot the hook reports to React. */
export interface CanvasView {
  window: TileWindow | null
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
  // Holds the latest `frame` so the rAF loop can re-schedule itself without
  // `frame` referencing its own binding (which the linter forbids and which
  // would also capture a stale closure).
  const frameRef = useRef<(now: number) => void>(() => {})

  // -------------------------------------------------------------------------
  // Per-frame sync: DOM writes + sparse React state
  // -------------------------------------------------------------------------
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

    // Derived React state — integers and booleans only, so a plain
    // comparison tells us whether a re-render is warranted at all.
    let nextWindow: TileWindow | null = null
    if (scale >= CARDS_MIN_SCALE) {
      const halfW = w / 2 / scale
      const halfH = h / 2 / scale
      nextWindow = {
        minTx: Math.floor((x - halfW) / TILE_W) - TILE_MARGIN,
        maxTx: Math.floor((x + halfW) / TILE_W) + TILE_MARGIN,
        minTy: Math.floor((y - halfH) / TILE_H) - TILE_MARGIN,
        maxTy: Math.floor((y + halfH) / TILE_H) + TILE_MARGIN,
      }
      // Safety valve: never mount an unbounded number of tiles. With the
      // current thresholds this can't trigger; it protects future tweaks.
      const count =
        (nextWindow.maxTx - nextWindow.minTx + 1) *
        (nextWindow.maxTy - nextWindow.minTy + 1)
      if (count > MAX_TILES) nextWindow = null
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
    if (!sameWindow || prev.showEgg !== showEgg || prev.isAway !== isAway) {
      const next: CanvasView = { window: nextWindow, showEgg, isAway }
      viewRef.current = next
      setView(next)
    }
  }, [])

  // -------------------------------------------------------------------------
  // The single rAF loop — runs only while something moves, then stops
  // -------------------------------------------------------------------------
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

  // Keep the ref pointing at the current frame implementation (updated in an
  // effect, never during render).
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

  /** Animate home: origin, mockup zoom. Instant under reduced motion. */
  const refocus = useCallback(() => {
    velocity.current = { x: 0, y: 0 }
    if (reducedMotion.current) {
      cam.current = { x: 0, y: 0, scale: MAX_SCALE }
      target.current = null
    } else {
      target.current = { x: 0, y: 0, scale: MAX_SCALE }
    }
    requestSync()
  }, [requestSync])

  // -------------------------------------------------------------------------
  // Gestures & environment — one effect, symmetric add/remove (StrictMode-safe)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Snapshot the mutable refs used by the cleanup, so the linter can prove
    // the cleanup reads the SAME objects the effect set up (their .current
    // may change, but the container objects are stable for the effect's life).
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

    /** Form controls own their own pointer/keyboard interactions. Artwork
        cards are <a> on purpose — a pan may start on them. */
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

      // Only capture once the press is proven to be a pan: capturing on
      // pointerdown would retarget the release and eat the click that opens
      // a card. Under CLICK_SLOP_PX, the tap stays a normal click.
      if (!captured.current && dragDistance.current > CLICK_SLOP_PX) {
        el.setPointerCapture(event.pointerId)
        captured.current = true
      }

      cam.current.x -= dx / cam.current.scale
      cam.current.y -= dy / cam.current.scale
      // Low-pass filter — the inertia launches with the RECENT hand speed,
      // not with one noisy last sample.
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

    // Swallow the click that follows a real drag, in capture phase, so a pan
    // that ends on a card never opens it — while a clean tap still does.
    const onClickCapture = (event: MouseEvent) => {
      if (dragDistance.current > CLICK_SLOP_PX) {
        event.preventDefault()
        event.stopPropagation()
        dragDistance.current = 0
      }
    }

    // Figma-convention wheel: plain wheel pans, Ctrl/⌘+wheel (and trackpad
    // pinch, which browsers report as ctrl+wheel) zooms toward the cursor.
    // Non-passive on purpose: we must preventDefault or the page zooms.
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

    // Keyboard support: the canvas is focusable; arrows pan, +/− zoom,
    // Home/0 recenters. A map you can drive without a pointer.
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
