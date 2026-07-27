import { useQuery } from '@tanstack/react-query'

import { artworkKeys, fetchArtworkDetail } from '@/features/artworks/artwork.api'

import type { SharedArtwork } from '../chat.types'
import { MessageText } from './MessageText'
import { SharedArtworkCard } from './SharedArtworkCard'

// Resolves the pasted artwork id via the shared detail query cache and renders
// the same rich card as an API share; on failure falls back to the link text.
export function LinkedArtworkCard({
  id,
  mine,
  fallback,
}: {
  id: string
  mine: boolean
  /** The link text, shown verbatim if the artwork can't be loaded. */
  fallback: string
}) {
  const { data, isPending, isError } = useQuery({
    queryKey: artworkKeys.detail(id),
    queryFn: () => fetchArtworkDetail(id),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  if (isError || (!isPending && !data)) {
    return <MessageText mine={mine}>{fallback}</MessageText>
  }

  if (isPending) {
    return (
      <span
        aria-hidden="true"
        className={`block w-60 max-w-[80%] overflow-hidden rounded-2xl border p-1.5 ${
          mine ? 'ms-auto border-[#252c55]/25' : 'me-auto border-neutral-200'
        }`}
      >
        <span className="block aspect-[16/9] rounded-xl bg-neutral-200 animate-pulse motion-reduce:animate-none" />
      </span>
    )
  }

  const shared: SharedArtwork = {
    id: data.id,
    title: data.title,
    mediaUrl: data.mediaUrl ?? null,
    author: {
      id: data.author.id,
      username: data.author.username,
      fullname: null,
    },
  }

  return <SharedArtworkCard artwork={shared} mine={mine} />
}
