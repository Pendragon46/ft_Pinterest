import { Video } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import { mediaTypeFromUrl } from '@/lib/mappers'

import type { SharedArtwork } from '../chat.types'
import { SafeImage } from '@/components/ui/SafeImage'

export function SharedArtworkCard({
  artwork,
  mine,
}: {
  artwork: SharedArtwork
  mine: boolean
}) {
  const { t } = useTranslation('common')
  const location = useLocation()
  const author = artwork.author.fullname ?? artwork.author.username
  const isVideo =
    artwork.mediaUrl != null && mediaTypeFromUrl(artwork.mediaUrl) === 'video'

  return (
    <Link
      to={`/artwork/${artwork.id}`}
      state={{ background: location }}
      aria-label={`${t('chat.openArtwork')}, ${artwork.title}`}
      className={`block w-60 max-w-[80%] overflow-hidden rounded-2xl border p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 ${
        mine
          ? 'ms-auto border-[#252c55]/25 bg-[#252c55]/10 hover:bg-[#252c55]/15'
          : 'me-auto border-neutral-200 bg-neutral-100 hover:bg-neutral-200/70'
      }`}
    >
      <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-neutral-200">
        {artwork.mediaUrl && !isVideo ? (
          <SafeImage src={artwork.mediaUrl} alt="" className="size-full object-cover" />
        ) : null}
        {isVideo ? (
          <span className="absolute end-1.5 top-1.5 flex items-center justify-center rounded-full bg-neutral-900/60 p-1 text-white backdrop-blur">
            <Video aria-hidden="true" className="size-3.5" />
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 truncate px-1 text-xs text-neutral-600">
        {t('chat.artworkBy', { title: artwork.title, author })}
      </p>
    </Link>
  )
}
