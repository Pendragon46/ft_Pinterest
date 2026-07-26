export interface AreaPoint {
  label: string
  value: number
}

// Dependency-free area/line chart for a time series. The plot is a stretched
// 100x100 viewBox (preserveAspectRatio="none") so it fills any width; the line
// keeps a crisp constant weight via non-scaling-stroke. Axis text lives in HTML
// around the SVG, never inside the stretched space, so it never distorts.
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
  const max = Math.max(1, ...points.map((p) => p.value))
  const coords =
    points.length === 1
      ? [
          { x: 0, y: 100 - (points[0].value / max) * 100 },
          { x: 100, y: 100 - (points[0].value / max) * 100 },
        ]
      : points.map((p, i) => ({
          x: (i / (points.length - 1)) * 100,
          y: 100 - (p.value / max) * 100,
        }))

  const line = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
    .join(' ')
  const area = `${line} L100,100 L0,100 Z`
  const first = points[0]?.label ?? ''
  const last = points[points.length - 1]?.label ?? ''

  return (
    <div className={className}>
      {points.length === 0 ? (
        <div className="grid h-28 place-items-center text-sm text-neutral-400">
          —
        </div>
      ) : (
        <>
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
