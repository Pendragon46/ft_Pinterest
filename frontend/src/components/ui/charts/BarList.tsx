export interface BarDatum {
  label: string
  value: number
}

// Horizontal bar list: a label, a proportional bar, and the value. Kept as
// flow layout (not SVG) so labels wrap and align naturally; the bar width is
// the only thing scaled. Widths are relative to the largest value.
export function BarList({
  bars,
  color = '#7c3aed',
  emptyLabel,
}: {
  bars: BarDatum[]
  color?: string
  emptyLabel: string
}) {
  const max = Math.max(1, ...bars.map((b) => b.value))

  if (bars.length === 0) {
    return <p className="py-6 text-center text-sm text-neutral-400">{emptyLabel}</p>
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {bars.map((bar) => (
        <li
          key={bar.label}
          title={`${bar.label}: ${bar.value}`}
          className="-mx-1 flex items-center gap-3 rounded-lg px-1 py-0.5 transition-colors hover:bg-neutral-50 motion-reduce:transition-none"
        >
          <span className="w-28 shrink-0 truncate text-sm text-neutral-600">
            {bar.label}
          </span>
          <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${(bar.value / max) * 100}%`,
                backgroundColor: color,
              }}
            />
          </span>
          <span className="w-8 shrink-0 text-end text-sm font-medium tabular-nums text-neutral-900">
            {bar.value}
          </span>
        </li>
      ))}
    </ul>
  )
}
