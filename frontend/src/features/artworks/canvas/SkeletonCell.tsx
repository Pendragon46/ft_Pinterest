import type { CellSlot } from '../artwork.mock'

// Neutral shimmer placeholder at a card slot, shown while its tile loads.
// (Tinting toward the card's dominant colour is future — it needs the colour
// served as tile metadata before the data arrives.)
// `revealDelay` staggers its fade-in during the centre-out search wave (§5.3).
export function SkeletonCell({
  slot,
  revealDelay = 0,
}: {
  slot: CellSlot
  revealDelay?: number
}) {
  return (
    <span
      aria-hidden="true"
      className="absolute animate-reveal overflow-hidden rounded-md bg-neutral-200/80 motion-reduce:animate-none"
      style={{
        left: slot.x,
        top: slot.y,
        width: slot.width,
        height: slot.height,
        animationDelay: `${revealDelay}ms`,
      }}
    >
      <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent motion-reduce:animate-none" />
    </span>
  )
}
