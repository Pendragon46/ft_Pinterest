import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import { useCompact } from '@/lib/useCompact'

import type { ProfileArtwork } from '../artwork.types'

interface ProfileArtworkCardProps {
  artwork: ProfileArtwork
  /** Centre-out reveal-wave delay (ms) for the profile grid (P2b). */
  revealDelay?: number
}

// A backend-shaped artwork in a profile grid (fixed aspect, uniform heights — not
// the canvas masonry). Opens the detail via the same modal-route pattern as
// ArtworkCard. `mediaUrl` may be null → a neutral placeholder (never a broken img).
export function ProfileArtworkCard({
  artwork,
  revealDelay = 0,
}: ProfileArtworkCardProps) {
  const { t } = useTranslation('common')
  const location = useLocation()
  const compact = useCompact()
  // Tags are free user text → NOT translated (unlike the old category keys).
  const firstTag = artwork.tags[0]?.name

  return (
    <Link
      to={`/artwork/${artwork.id}`}
      state={{ background: location }}
      draggable={false}
      style={{ animationDelay: `${revealDelay}ms` }}
      className="group block animate-reveal rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 motion-reduce:animate-none"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-neutral-100">
        {artwork.mediaUrl ? (
          <img
            src={artwork.mediaUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <span aria-hidden="true" className="block size-full bg-neutral-200" />
        )}
      </div>
      <p className="mt-2 truncate font-serif text-neutral-900">{artwork.title}</p>
      <p className="truncate text-sm text-neutral-500">
        {t('profile.likes', { likes: compact(artwork._count.likes) })}
        {firstTag ? (
          <span className="text-neutral-400"> · #{firstTag}</span>
        ) : null}
      </p>
    </Link>
  )
}

// Shimmer placeholder card — fills the grid while works load (§2.6).
export function ProfileArtworkCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-neutral-200/80">
        <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent motion-reduce:animate-none" />
      </div>
      <div className="mt-2 h-4 w-2/3 rounded bg-neutral-200/80" />
      <div className="mt-1.5 h-3 w-1/3 rounded bg-neutral-200/80" />
    </div>
  )
}
