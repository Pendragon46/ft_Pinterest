import { useState } from 'react'

export interface AreaPoint {
  label: string
  value: number
}

// Dependency-free area/line chart for a time series. The plot is a stretched
// 100x100 viewBox (preserveAspectRatio="none") so it fills any width; the line
// keeps a crisp constant weight via non-scaling-stroke. Axis text and the hover
// tooltip live in HTML around the SVG, never inside the stretched space, so they
// never distort.
export function AreaChart({
  points,
  color = '#7c3aed',
  ariaLabel,
  className = '',
}: {
  points: AreaPoint[]
  color?: string
  ariaLabel: string
  className?: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...points.map((p) => p.value))
  const n = points.length
  const coords =
    n === 1
      ? [
          { x: 0, y: 100 - (points[0].value / max) * 100 },
          { x: 100, y: 100 - (points[0].value / max) * 100 },
        ]
      : points.map((p, i) => ({
          x: (i / (n - 1)) * 100,
          y: 100 - (p.value / max) * 100,
        }))

  const line = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
    .join(' ')
  const area = `${line} L100,100 L0,100 Z`
  const first = points[0]?.label ?? ''
  const last = points[n - 1]?.label ?? ''

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (n === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    setHover(Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1)))))
  }

  const hx = hover == null ? 0 : n > 1 ? (hover / (n - 1)) * 100 : 50
  const hy = hover == null ? 0 : 100 - (points[hover].value / max) * 100

  return (
    <div className={className}>
      {n === 0 ? (
        <div className="grid h-28 place-items-center text-sm text-neutral-400">
          —
        </div>
      ) : (
        <>
          <div
            className="relative"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          >
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              role="img"
              aria-label={ariaLabel}
              className="h-28 w-full"
            >
              <path d={area} fill={color} fillOpacity={0.12} />
              <path
                d={line}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {hover != null && (
              <>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 w-px bg-neutral-300"
                  style={{ left: `${hx}%` }}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
                  style={{ left: `${hx}%`, top: `${hy}%`, backgroundColor: color }}
                />
                <span
                  dir="ltr"
                  className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white"
                  style={{ left: `${hx}%` }}
                >
                  {points[hover].label} · {points[hover].value}
                </span>
              </>
            )}
          </div>
          {/* Force LTR: the SVG plots oldest->newest left->right regardless of
              locale, so the captions must not flip under an RTL document. */}
          <div
            dir="ltr"
            className="mt-1 flex justify-between text-xs text-neutral-400"
          >
            <span>{first}</span>
            <span>{last}</span>
          </div>
        </>
      )}
    </div>
  )
}
