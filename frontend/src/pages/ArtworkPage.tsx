import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { Spinner } from '@/components/ui/Spinner'
import { TextLink } from '@/components/ui/TextLink'
import { artworkKeys, fetchArtworkDetail } from '@/features/artworks/artwork.api'
import { ArtworkDetail } from '@/features/artworks/components/ArtworkDetail'

// Renders as modal (location.state.background) or standalone; always exposes
// id="artwork-title" so the modal's aria-labelledby resolves in every state.
export function ArtworkPage() {
  const { t } = useTranslation('common')
  const { id = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const background = (
    location.state as { background?: ReturnType<typeof useLocation> } | null
  )?.background

  const detailQuery = useQuery({
    queryKey: artworkKeys.detail(id),
    queryFn: () => fetchArtworkDetail(id),
    retry: false, // a missing artwork is a 404, not a transient failure
  })

  let content: ReactNode
  if (detailQuery.isPending) {
    content = (
      <div className="flex min-h-64 items-center justify-center p-10 text-neutral-400">
        {/* Keep the labelling target present even while loading. */}
        <h1 id="artwork-title" className="sr-only">
          {t('artwork.loading')}
        </h1>
        <Spinner size="md" />
      </div>
    )
  } else if (detailQuery.isError || !detailQuery.data) {
    content = (
      <div className="flex flex-col items-start gap-3 p-8">
        <h1 id="artwork-title" className="font-serif text-2xl text-neutral-900">
          {t('artwork.notFoundTitle')}
        </h1>
        <p className="text-neutral-500">{t('artwork.notFoundBody')}</p>
        <TextLink to="/">{t('artwork.backHome')}</TextLink>
      </div>
    )
  } else {
    content = (
      <ArtworkDetail
        artwork={detailQuery.data}
        // Modal closes by stepping back in history; standalone has no overlay.
        onClose={background ? () => navigate(-1) : undefined}
      />
    )
  }

  if (background) return content

  return (
    <main className="flex min-h-svh items-center justify-center bg-neutral-100 p-4 sm:p-6">
      <div className="w-full max-w-6xl overflow-hidden rounded-xl bg-white shadow-xl">
        {content}
      </div>
    </main>
  )
}
