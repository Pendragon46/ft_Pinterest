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
  // A pasted link outlives the work it points at: the id is baked into the
  // message text, so re-opening the conversation would re-request a deleted
  // artwork and log a 404 every single time (issue #29). Resolve a miss to
  // `null` and keep it forever, so each dead link costs at most one request per
  // session — and none at all when ArtworkSyncProvider already saw the delete.
  //
  // Deliberately NOT artworkKeys.detail(id): caching a null under the shared
  // detail key would make the real artwork page believe the work is gone.
  const { data, isPending } = useQuery({
    queryKey: artworkKeys.linkPreview(id),
    queryFn: () => fetchArtworkDetail(id).catch(() => null),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  })

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

  // Deleted, or never existed: show the raw link the user typed.
  if (!data) {
    return <MessageText mine={mine}>{fallback}</MessageText>
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
