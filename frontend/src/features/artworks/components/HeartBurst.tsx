import { useEffect, useRef, useState } from 'react'
import lottie from 'lottie-web'

import heartAnimation from '@/assets/heart-fav.json'

const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// One-shot heart burst driven by lottie-web directly (no React wrapper — the
// wrapper's default export broke under this bundler). Remount with a fresh
// `key` to replay; removes itself on complete; no-op under reduced motion.
export function HeartBurst() {
  const containerRef = useRef<HTMLSpanElement | null>(null)
  const [done, setDone] = useState(prefersReducedMotion)

  useEffect(() => {
    if (done) return
    const container = containerRef.current
    if (!container) return

    const animation = lottie.loadAnimation({
      container,
      // Clone: lottie-web mutates the data, and the JSON import is a shared
      // module singleton (would corrupt on StrictMode's double-mount / replays).
      animationData: structuredClone(heartAnimation),
      renderer: 'svg',
      loop: false,
      autoplay: true,
    })
    const handleComplete = () => {
      setDone(true)
    }
    animation.addEventListener('complete', handleComplete)
    return () => {
      animation.destroy()
    }
  }, [done])

  if (done) return null

  return (
    <span
      ref={containerRef}
      className="pointer-events-none absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2"
    />
  )
}
