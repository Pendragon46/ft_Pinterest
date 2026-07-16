import { useEffect, useRef, useState } from 'react'

interface HeroTitleProps {
  /** Two lines, separated by "\n". */
  text: string
}

// The hero title. When `text` changes (entering / leaving a niche) the previous
// title is cleared and the new one is typed out letter by letter (§5.2). Instant
// under reduced motion. Always renders two line-slots so its height never shifts.
export function HeroTitle({ text }: HeroTitleProps) {
  const [displayed, setDisplayed] = useState(text)
  // `displayedRef` mirrors `displayed` (written only inside timers, never during
  // render); `lastText` is the last text we animated to, so the typewriter fires
  // on a real change, not on mount.
  const displayedRef = useRef(text)
  const lastText = useRef(text)

  useEffect(() => {
    if (text === lastText.current) return
    lastText.current = text
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    // setState only fires inside a timer callback, never synchronously here.
    const show = (value: string, ms: number) => {
      timers.push(
        setTimeout(() => {
          if (cancelled) return
          displayedRef.current = value
          setDisplayed(value)
        }, ms),
      )
    }

    if (reduce) {
      show(text, 0)
    } else {
      // Delete the old title letter by letter, then type the new one (§5.2). The
      // erase runs faster than the type so a long previous title stays quick, and
      // the two titles never overlap (new starts only once old is fully erased).
      const DELETE_MS = 9
      const TYPE_MS = 24
      const from = displayedRef.current
      let clock = 0
      for (let n = from.length - 1; n >= 0; n--) {
        clock += DELETE_MS
        show(from.slice(0, n), clock)
      }
      for (let i = 1; i <= text.length; i++) {
        clock += TYPE_MS
        show(text.slice(0, i), clock)
      }
    }
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [text])

  const [line1 = '', line2 = ''] = displayed.split('\n')
  const typing = displayed !== text
  const caretOnLine2 = displayed.includes('\n')
  const caret = (
    <span
      aria-hidden="true"
      className="ms-[0.06em] inline-block h-[0.85em] w-[2px] translate-y-[0.08em] animate-pulse bg-neutral-800"
    />
  )

  return (
    <h1 className="font-serif text-4xl leading-tight text-neutral-900">
      <span className="block">
        {line1 || ' '}
        {typing && !caretOnLine2 ? caret : null}
      </span>
      <span className="block">
        {line2 || ' '}
        {typing && caretOnLine2 ? caret : null}
      </span>
    </h1>
  )
}
