export interface DonutSegment {
  label: string
  value: number
  color: string
}

const RADIUS = 42
const CIRC = 2 * Math.PI * RADIUS

// Dependency-free donut: each segment is a circle whose stroke-dasharray draws
// one arc, offset so the arcs sit end to end. Rotated -90° to start at the top.
// The center total and the legend are HTML overlays for crisp text.
export function DonutChart({
  segments,
  ariaLabel,
  centerValue,
  centerLabel,
}: {
  segments: DonutSegment[]
  ariaLabel: string
  centerValue: string | number
  centerLabel: string
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  let offset = 0

  return (
    <div className="flex items-center gap-5">
      <div className="relative size-32 shrink-0">
        <svg viewBox="0 0 100 100" role="img" aria-label={ariaLabel} className="size-full -rotate-90">
          <circle cx={50} cy={50} r={RADIUS} fill="none" stroke="#f1f1f3" strokeWidth={12} />
          {total > 0 &&
            segments.map((seg) => {
              const dash = (seg.value / total) * CIRC
              const circle = (
                <circle
                  key={seg.label}
                  cx={50}
                  cy={50}
                  r={RADIUS}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={12}
                  strokeDasharray={`${dash} ${CIRC - dash}`}
                  strokeDashoffset={-offset}
                />
              )
              offset += dash
              return circle
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold text-neutral-900">{centerValue}</span>
          <span className="text-xs text-neutral-400">{centerLabel}</span>
        </div>
      </div>

      <ul className="flex min-w-0 flex-col gap-1.5 text-sm">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            <span className="truncate text-neutral-600">{seg.label}</span>
            <span className="ms-auto font-medium tabular-nums text-neutral-900">
              {seg.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
