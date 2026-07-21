import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

import type { CanvasArtwork } from '../artwork.types'

type CardLayout = 'canvas' | 'grid'

interface ArtworkCardProps {
  artwork: CanvasArtwork
  /** 'canvas' (default): absolute at world coords. 'grid': normal flow (masonry fallback). */
  layout?: CardLayout
  /** Centre-out delay (ms) for the search-transition reveal wave (§5.3). */
  revealDelay?: number
}

// Layout-agnostic: same component in the infinite canvas and the fallback grid.
// The colored block is a placeholder for the future <img src={imageUrl}>.
export const ArtworkCard = memo(function ArtworkCard({
  artwork,
  layout = 'canvas',
  revealDelay = 0,
}: ArtworkCardProps) {
  const { t } = useTranslation('common')
  const location = useLocation()

  // Fold the kind into the accessible name: the Link's aria-label overrides its
  // descendants, so the Sponsor/AI badges are otherwise never announced (§2.1).
  const baseLabel = t('artwork.openAria', {
    title: artwork.title,
    author: artwork.author.username,
  })
  const kindLabel =
    artwork.kind === 'sponsor'
      ? t('artwork.badgeSponsor')
      : artwork.kind === 'ai'
        ? t('artwork.badgeAi')
        : ''
  const ariaLabel = kindLabel ? `${baseLabel}, ${kindLabel}` : baseLabel

  // Modal-route pattern: stash the current page so detail opens as an overlay;
  // a refresh or shared link lands on the standalone page instead.
  return (
    <Link
      to={`/artwork/${artwork.sourceId ?? artwork.id}`}
      state={{ background: location }}
      // No native drag: a card drag must pan the map.
      draggable={false}
      aria-label={ariaLabel}
      className={`group block animate-reveal overflow-hidden rounded-md outline-none transition duration-200 hover:z-10 hover:scale-[1.02] hover:shadow-xl focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 motion-reduce:animate-none motion-reduce:transition-none ${
        layout === 'grid' ? 'relative w-full' : ''
      }`}
      style={{
        backgroundColor: artwork.color,
        animationDelay: `${revealDelay}ms`,
        ...(layout === 'canvas'
          ? {
              position: 'absolute' as const,
              left: artwork.x,
              top: artwork.y,
              width: artwork.width,
              height: artwork.height,
            }
          : { aspectRatio: `${artwork.width} / ${artwork.height}` }),
      }}
    >
      {/* Uploaded media fills the card; the `color` background shows through
          only while it loads or when a work has no media. */}
      {artwork.mediaUrl ? (
        artwork.mediaType === 'video' ? (
          <video
            src={artwork.mediaUrl}
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <img
            src={artwork.mediaUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
        )
      ) : null}

      {/* Badges use logical sides so they swap in RTL. */}
      {artwork.kind === 'sponsor' ? (
        <span className="absolute start-3 top-3 rounded-full bg-black/25 px-3 py-1 text-xs font-medium text-white">
          {t('artwork.badgeSponsor')}
        </span>
      ) : null}
      {artwork.kind === 'ai' ? (
        <span
          role="img"
          aria-label={t('artwork.badgeAi')}
          className="absolute end-3 top-3 flex size-8 items-center justify-center rounded-full bg-black/20 text-white"
        >
          <Sparkles aria-hidden="true" className="size-4" />
        </span>
      ) : null}

      {/* Title reveals on hover/focus; pointer-events-none so it never intercepts the click. */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/45 to-transparent p-4 pt-10 text-start opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
        <span className="truncate font-serif text-lg text-white">
          {artwork.title}
        </span>
        <span className="truncate text-xs text-white/80">
          {artwork.author.username}
        </span>
      </span>
    </Link>
  )
})
