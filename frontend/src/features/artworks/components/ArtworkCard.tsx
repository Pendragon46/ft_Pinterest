import { memo, useState } from 'react'
import { Video } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import { videoPosterUrl } from '@/lib/mappers'

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
  const isVideo = artwork.mediaType === 'video'
  // Cloudinary still frame. Mounting a <video preload="metadata"> per card made
  // the front page fire one Range request per video, and Chrome intermittently
  // failed to read those partial responses back out of its media cache
  // (ERR_CACHE_READ_FAILURE 206). An <img> does not use that code path.
  const poster = isVideo ? videoPosterUrl(artwork.mediaUrl) : undefined
  // The real <video> is mounted only while hovered/focused, so idle cards cost
  // one image and playback still starts on hover.
  const [playing, setPlaying] = useState(false)

  const playHover = () => {
    if (isVideo) setPlaying(true)
  }
  const stopHover = () => {
    if (isVideo) setPlaying(false)
  }

  const ariaLabel = t('artwork.openAria', {
    title: artwork.title,
    author: artwork.author.username,
  })

  const cardStyle = {
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
  }

  const media = (
    <>
      {/* Uploaded media fills the card; the `color` background shows through
          only while it loads or when a work has no media. */}
      {artwork.mediaUrl ? (
        isVideo && (playing || !poster) ? (
          <video
            src={artwork.mediaUrl}
            muted
            loop
            playsInline
            // Autoplay on mount: the element only exists while hovered. Without
            // a poster (non-Cloudinary URL) it stays mounted as before.
            autoPlay={playing}
            preload={playing ? 'auto' : 'metadata'}
            // A native drag on the media would fight the canvas pan.
            draggable={false}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
            className="pointer-events-none absolute inset-0 size-full object-cover"
          />
        ) : (
          <img
            src={isVideo ? poster : artwork.mediaUrl}
            alt=""
            loading="lazy"
            draggable={false}
            // A dead media URL hides itself so the card's `color` shows through,
            // instead of leaving a broken frame over the canvas.
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
            className="pointer-events-none absolute inset-0 size-full object-cover"
          />
        )
      ) : null}

      {artwork.mediaType === 'video' ? (
        <span
          role="img"
          aria-label={t('create.videoBadge')}
          className="absolute end-3 top-3 flex items-center justify-center rounded-full bg-neutral-900/60 p-1.5 text-white backdrop-blur"
        >
          <Video aria-hidden="true" className="size-4" />
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
    </>
  )

  // A card without a real sourceId is a placeholder cell, not a work: its `id`
  // is a grid-cell key (`w_x_y`), so a <Link> would navigate to a 404. Render it
  // inert instead of pretending it leads somewhere.
  if (!artwork.sourceId) {
    return (
      <div
        aria-hidden="true"
        className={`block animate-reveal overflow-hidden rounded-md motion-reduce:animate-none ${
          layout === 'grid' ? 'relative w-full' : ''
        }`}
        style={cardStyle}
      >
        {media}
      </div>
    )
  }

  // Modal-route pattern: stash the current page so detail opens as an overlay;
  // a refresh or shared link lands on the standalone page instead.
  return (
    <Link
      to={`/artwork/${artwork.sourceId}`}
      state={{ background: location }}
      // No native drag: a card drag must pan the map.
      draggable={false}
      onMouseEnter={playHover}
      onMouseLeave={stopHover}
      onFocus={playHover}
      onBlur={stopHover}
      aria-label={ariaLabel}
      className={`group block animate-reveal overflow-hidden rounded-md outline-none transition duration-200 hover:z-10 hover:scale-[1.02] hover:shadow-xl focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 motion-reduce:animate-none motion-reduce:transition-none ${
        layout === 'grid' ? 'relative w-full' : ''
      }`}
      style={cardStyle}
    >
      {media}
    </Link>
  )
})
