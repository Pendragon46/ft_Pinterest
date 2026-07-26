import { useQuery } from '@tanstack/react-query'

import { artworkKeys, fetchArtworkDetail } from '@/features/artworks/artwork.api'
import { realArtworkId } from '@/lib/mappers'

import type { SharedArtwork } from '../chat.types'
import { MessageText } from './MessageText'
import { SharedArtworkCard } from './SharedArtworkCard'

// Renders an artwork link pasted into a message as the same rich card used for
// artworks shared through the API. Resolves the artwork by id (sharing the
// modal's query cache); on failure it falls back to the original message text
// so nothing is ever lost.
export function LinkedArtworkCard({
  id,
  mine,
  rest,
  fallback,
}: {
  id: string
  mine: boolean
  /** Message text left over once the link is removed. */
  rest: string
  /** Original message content, shown verbatim if the artwork can't be loaded. */
  fallback: string
}) {
  const { data, isPending, isError } = useQuery({
    queryKey: artworkKeys.detail(realArtworkId(id)),
    queryFn: () => fetchArtworkDetail(id),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  if (isError || (!isPending && !data)) {
    return <MessageText mine={mine}>{fallback}</MessageText>
  }

  if (isPending) {
    return (
      <>
        {rest ? <MessageText mine={mine}>{rest}</MessageText> : null}
        <span
          aria-hidden="true"
          className={`block w-60 max-w-[80%] overflow-hidden rounded-2xl border p-1.5 ${
            mine ? 'ms-auto border-[#252c55]/25' : 'me-auto border-neutral-200'
          }`}
        >
          <span className="block aspect-[16/9] rounded-xl bg-neutral-200 animate-pulse motion-reduce:animate-none" />
        </span>
      </>
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

  return (
    <>
      {rest ? <MessageText mine={mine}>{rest}</MessageText> : null}
      <SharedArtworkCard artwork={shared} mine={mine} />
    </>
  )
}
