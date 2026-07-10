import type { CellSlot } from '../artwork.mock'

// Neutral shimmer placeholder at a card slot, shown while its tile loads.
// (Tinting toward the card's dominant colour is future — it needs the colour
// served as tile metadata before the data arrives.)
export function SkeletonCell({ slot }: { slot: CellSlot }) {
  return (
    <span
      aria-hidden="true"
      className="absolute overflow-hidden rounded-md bg-neutral-200/80"
      style={{
        left: slot.x,
        top: slot.y,
        width: slot.width,
        height: slot.height,
      }}
    >
      <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent motion-reduce:animate-none" />
    </span>
  )
}
