import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ATLAAS_MARK_CENTER, ATLAAS_MARK_PATHS } from '@/components/ui/atlaasMark'

/**
 * Branded intro reveal.
 *
 * A near-black curtain covers the app on first load. A small **solid white**
 * Atlaas mark sits on it — the home is hidden. As the mark swells, the white
 * fades away to expose a logo-shaped hole (an SVG `<mask>`) through which the
 * live homepage shows, until the hole engulfs the screen and the curtain
 * dissolves. Two words flank the mark and fly apart during the reveal.
 *
 * Driven by a single `requestAnimationFrame` timeline (no animation library). It
 * is decorative (`aria-hidden`), plays once per tab session, and degrades to a
 * motion-free fade under `prefers-reduced-motion`. Visit with `?intro` to force
 * a replay (handy in dev / for demos).
 */

/** Play the reveal at most once per browser-tab session. */
const SESSION_KEY = 'atlaas:intro-seen'

// Timeline milestones, in milliseconds from the first frame.
const ENTER_MS = 800 // words + mark ease in
const HOLD_MS = 500 // a beat
const REVEAL_MS = 1500 // mark swells, white fades to home, words fly out
const REVEAL_AT = ENTER_MS + HOLD_MS
const END_MS = REVEAL_AT + REVEAL_MS
/** Fraction of the reveal over which the white mark fades to expose the home. */
const WHITE_FADE = 0.55
/** Curtain fades over the final stretch — a soft, artifact-free finish. */
const DISSOLVE_MS = 520

/** neutral-950; brand near-black (curtain is a full-bleed brand surface). */
const CURTAIN = '#0a0a0a'

// Easing helpers — unitless progress t in [0, 1].
const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n)
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3
const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
const easeInOutExpo = (t: number): number => {
  if (t <= 0) return 0
  if (t >= 1) return 1
  return t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2
}
const easeOutBack = (t: number): number => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** `?intro` in the URL forces a replay regardless of the session flag. */
const introForced = (): boolean => {
  try {
    return new URLSearchParams(window.location.search).has('intro')
  } catch {
    return false
  }
}
const seenThisSession = (): boolean => {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}
const markSeen = (): void => {
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    /* storage disabled (private mode) — the reveal just replays next time */
  }
}

export function IntroReveal() {
  const { t, i18n } = useTranslation('common')
  const [visible, setVisible] = useState(
    () => introForced() || !seenThisSession(),
  )

  const holeRef = useRef<SVGGElement | null>(null) // mask hole (reveals home)
  const logoRef = useRef<SVGGElement | null>(null) // solid white mark on top
  const curtainRef = useRef<SVGRectElement | null>(null)
  const leftWordRef = useRef<HTMLSpanElement | null>(null)
  const rightWordRef = useRef<HTMLSpanElement | null>(null)

  // useLayoutEffect (not useEffect): the t=0 state is written synchronously
  // below, *before* the browser paints, so the first paint already matches the
  // animation's start — no flash of an un-positioned mark or fully-lit words.
  useLayoutEffect(() => {
    if (!visible) return

    let alive = true
    let raf = 0
    let started = false
    let startTime = 0

    const finish = () => {
      if (!alive) return
      alive = false
      cancelAnimationFrame(raf)
      markSeen()
      setVisible(false)
    }

    // Scale/rotate the hole AND its white cover together, around the viewport
    // centre — they stay perfectly registered so the white exactly hides the hole.
    const setMark = (scale: number, rotate: number) => {
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      const { x, y } = ATLAAS_MARK_CENTER
      const transform = `translate(${cx} ${cy}) rotate(${rotate}) scale(${scale}) translate(${-x} ${-y})`
      holeRef.current?.setAttribute('transform', transform)
      logoRef.current?.setAttribute('transform', transform)
    }
    const setLogoOpacity = (o: number) => {
      logoRef.current?.setAttribute('opacity', String(o))
    }
    const setCurtainOpacity = (o: number) => {
      curtainRef.current?.setAttribute('opacity', String(o))
    }
    const setWord = (
      el: HTMLSpanElement | null,
      direction: -1 | 1,
      slideX: number,
      opacity: number,
    ) => {
      if (!el) return
      el.style.opacity = String(opacity)
      // translateY(-50%) keeps the word vertically centred; translateX drives it.
      el.style.transform = `translate(${direction * slideX}px, -50%)`
    }

    // Resting size of the mark: small and understated, capped on large screens.
    const restScale = (): number => {
      const target = Math.min(
        120,
        Math.min(window.innerWidth, window.innerHeight) * 0.2,
      )
      return target / 194
    }
    // Over-scale so the mark's SOLID CORE covers the viewport corners. The core's
    // min radius from the centre is ~27 of the 194 mark units, so (halfDiag / 20)
    // gives 27 / 20 ≈ 1.35× the corner distance — the whole viewport sits inside
    // the solid core (no black petal-gap wedges), for any aspect ratio.
    const coverScale = (): number =>
      Math.hypot(window.innerWidth, window.innerHeight) / 2 / 20

    const frame = (now: number) => {
      if (!alive) return
      if (!started) {
        started = true
        startTime = now
      }

      const e = now - startTime
      const rest = restScale()

      // Mark: pop in small, hold, then swell to cover with a hint of rotation.
      // The white cover stays opaque until the reveal, then fades to expose home.
      if (e < ENTER_MS) {
        setMark(lerp(rest * 0.35, rest, easeOutBack(clamp01(e / ENTER_MS))), 0)
        setLogoOpacity(1)
      } else if (e < REVEAL_AT) {
        setMark(rest, 0)
        setLogoOpacity(1)
      } else {
        const rp = clamp01((e - REVEAL_AT) / REVEAL_MS)
        setMark(lerp(rest, coverScale(), easeInOutExpo(rp)), lerp(0, 6, rp))
        setLogoOpacity(1 - easeInOutCubic(clamp01(rp / WHITE_FADE)))
      }

      // Words: slide in, hold, then fly apart and fade.
      if (e < ENTER_MS) {
        const p = easeOutCubic(clamp01(e / ENTER_MS))
        setWord(leftWordRef.current, -1, lerp(28, 0, p), p)
        setWord(rightWordRef.current, 1, lerp(28, 0, p), p)
      } else if (e < REVEAL_AT) {
        setWord(leftWordRef.current, -1, 0, 1)
        setWord(rightWordRef.current, 1, 0, 1)
      } else {
        const p = easeInOutCubic(clamp01((e - REVEAL_AT) / REVEAL_MS))
        const fly = window.innerWidth * 0.72 * p
        const opacity = 1 - clamp01(p * 1.4)
        setWord(leftWordRef.current, -1, fly, opacity)
        setWord(rightWordRef.current, 1, fly, opacity)
      }

      // Dissolve the curtain over the tail for a soft, artifact-free finish.
      if (e > END_MS - DISSOLVE_MS) {
        const p = easeInOutCubic(clamp01((e - (END_MS - DISSOLVE_MS)) / DISSOLVE_MS))
        setCurtainOpacity(1 - p)
      }

      if (e >= END_MS) {
        finish()
        return
      }
      raf = requestAnimationFrame(frame)
    }

    // Reduced motion: a still branded frame (small white mark on black), then a
    // gentle opacity fade of everything to expose the home. No scaling/sliding.
    const reducedFrame = (now: number) => {
      if (!alive) return
      if (!started) {
        started = true
        startTime = now
      }
      const held = now - startTime
      if (held > 520) {
        const k = clamp01((held - 520) / 700)
        setLogoOpacity(1 - k)
        setCurtainOpacity(1 - k)
        if (leftWordRef.current) leftWordRef.current.style.opacity = String(1 - k)
        if (rightWordRef.current) rightWordRef.current.style.opacity = String(1 - k)
        if (k >= 1) {
          finish()
          return
        }
      }
      raf = requestAnimationFrame(reducedFrame)
    }

    const reduced = prefersReducedMotion()

    // Paint the t=0 state synchronously, before the browser's first paint.
    setLogoOpacity(1)
    if (reduced) {
      setMark(restScale(), 0)
      setWord(leftWordRef.current, -1, 0, 1)
      setWord(rightWordRef.current, 1, 0, 1)
    } else {
      setMark(restScale() * 0.35, 0)
      setWord(leftWordRef.current, -1, 28, 0)
      setWord(rightWordRef.current, 1, 28, 0)
    }

    raf = requestAnimationFrame(reduced ? reducedFrame : frame)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [visible])

  if (!visible) return null

  // Reading order flips in RTL: the first-read word sits on the right there. The
  // fly-apart is a mirror-symmetric physical motion, so the layout is forced LTR
  // and we swap which word lands in the left / right slot instead.
  const rtl = i18n.dir() === 'rtl'
  const leftWord = rtl ? t('intro.wordTrail') : t('intro.wordLead')
  const rightWord = rtl ? t('intro.wordLead') : t('intro.wordTrail')

  return (
    <div aria-hidden="true" className="fixed inset-0 z-[100] overflow-hidden">
      <svg className="absolute inset-0 size-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id="atlaas-intro-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <g ref={holeRef} fill="black">
              {ATLAAS_MARK_PATHS.map((path) => (
                <path key={path.id} d={path.d} />
              ))}
            </g>
          </mask>
        </defs>
        {/* Black curtain with the logo-shaped hole punched out of it. */}
        <rect
          ref={curtainRef}
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill={CURTAIN}
          mask="url(#atlaas-intro-mask)"
        />
        {/* Solid white mark on top, registered to the hole — hides the home until
            it fades out during the reveal. */}
        <g ref={logoRef} fill="white">
          {ATLAAS_MARK_PATHS.map((path) => (
            <path key={path.id} d={path.d} />
          ))}
        </g>
      </svg>

      {/* Words are anchored symmetrically to the viewport centre (not to each
          other) so the mark always sits dead-centre in the gap between them,
          whatever the two words' widths. `dir="ltr"` keeps left/right physical —
          the reading order is handled above by which word lands in each slot.
          Inline opacity:0 matches the reveal's t=0 (belt-and-braces vs a flash). */}
      <div dir="ltr" className="absolute inset-0">
        <span
          ref={leftWordRef}
          style={{ opacity: 0 }}
          className="absolute top-1/2 end-[calc(50%+3.25rem)] whitespace-nowrap font-serif text-base leading-none text-white will-change-transform sm:end-[calc(50%+7rem)] sm:text-5xl"
        >
          {leftWord}
        </span>
        <span
          ref={rightWordRef}
          style={{ opacity: 0 }}
          className="absolute top-1/2 start-[calc(50%+3.25rem)] whitespace-nowrap font-serif text-base leading-none text-white will-change-transform sm:start-[calc(50%+7rem)] sm:text-5xl"
        >
          {rightWord}
        </span>
      </div>
    </div>
  )
}
