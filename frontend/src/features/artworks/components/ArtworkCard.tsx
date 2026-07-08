import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import type { CanvasArtwork } from '../artwork.types'

type CardLayout = 'canvas' | 'grid'

interface ArtworkCardProps {
  artwork: CanvasArtwork
  /** 'canvas' (default): absolutely placed at the artwork's world coords.
      'grid': flows in a normal layout — the masonry fallback. */
  layout?: CardLayout
}

// One artwork tile. Deliberately layout-agnostic: the SAME component renders
// inside the infinite canvas and inside the fallback grid (Context.MD risk
// plan) — only the wrapper geometry changes. The colored block stands in for
// the future image: swap `backgroundColor` for an <img src={imageUrl}> when
// uploads exist, everything else stays.
export function ArtworkCard({ artwork, layout = 'canvas' }: ArtworkCardProps) {
  const { t } = useTranslation('common')
  const location = useLocation()

  // Same modal-route pattern as login/register: stash the current page so
  // the detail opens as an overlay ON TOP of the map, and a refresh or a
  // shared link lands on the standalone page instead.
  return (
    <Link
      to={`/artwork/${artwork.id}`}
      state={{ background: location }}
      // No native anchor drag: a drag on a card must pan the map, and the
      // camera hook swallows the trailing click when it was a real pan.
      draggable={false}
      aria-label={t('artwork.openAria', {
        title: artwork.title,
        author: artwork.author.username,
      })}
      className={`group block overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 ${
        layout === 'grid' ? 'relative w-full' : ''
      }`}
      style={{
        backgroundColor: artwork.color,
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
      {/* Kind badges — sponsor label at the start, AI sparkle at the end.
          Logical sides: they swap on their own in RTL. */}
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
          <SparkleIcon />
        </span>
      ) : null}

      {/* Title reveal on hover/focus: discoverability without cluttering the
          map. pointer-events-none so it never intercepts the click. */}
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
}

function SparkleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="size-4"
    >
      <path d="M12 2l2.1 5.9L20 10l-5.9 2.1L12 18l-2.1-5.9L4 10l5.9-2.1L12 2z" />
      <path d="M19 14.5l1.1 2.9 2.9 1.1-2.9 1.1-1.1 2.9-1.1-2.9-2.9-1.1 2.9-1.1 1.1-2.9z" />
    </svg>
  )
}
