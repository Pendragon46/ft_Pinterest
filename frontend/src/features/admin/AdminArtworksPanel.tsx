import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Heart,
  ImageOff,
  MessageCircle,
  RefreshCw,
  Search,
  Trash2,
  Video,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SafeImage } from '@/components/ui/SafeImage'
import { artworkKeys, invalidateCanvas } from '@/features/artworks/artwork.api'
import { videoPosterUrl } from '@/lib/mappers'
import { useToast } from '@/lib/toast.store'

import {
  adminKeys,
  deleteArtworkAsAdmin,
  fetchAllArtworks,
  type AdminArtworkRow,
} from './admin.api'

const PAGE = 12

// Onglet « Œuvres » du dashboard : liste + suppression admin.
export function AdminArtworksPanel({ canAdmin }: { canAdmin: boolean }) {
  const { t } = useTranslation('common')
  const qc = useQueryClient()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [toDelete, setToDelete] = useState<AdminArtworkRow | null>(null)

  const artQuery = useQuery({
    queryKey: adminKeys.artworks(),
    queryFn: fetchAllArtworks,
  })
  const artworks = useMemo(() => artQuery.data ?? [], [artQuery.data])

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteArtworkAsAdmin(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: adminKeys.artworks() })
      // Drop the artwork's own cache entries too: an ArtworkDetail still open
      // elsewhere would keep polling detail/comments for a row that is gone.
      // No observer is mounted on them from here, so removing cannot refetch.
      qc.removeQueries({ queryKey: artworkKeys.detail(id) })
      qc.removeQueries({ queryKey: artworkKeys.comments(id) })
      invalidateCanvas(qc)
      setToDelete(null)
    },
    onError: () => {
      toast({ variant: 'error', message: t('errors.network') })
    },
  })

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return artworks
    return artworks.filter(
      (a) =>
        a.title.toLowerCase().includes(needle) ||
        (a.author?.username.toLowerCase().includes(needle) ?? false),
    )
  }, [artworks, query])

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE))
  const safePage = Math.min(page, pageCount)
  const rows = visible.slice((safePage - 1) * PAGE, safePage * PAGE)

  if (artQuery.isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle aria-hidden="true" className="size-6" />
        </span>
        <p className="font-serif text-lg text-neutral-900">{t('admin.error.title')}</p>
        <Button variant="outline" size="sm" onClick={() => void artQuery.refetch()}>
          <RefreshCw aria-hidden="true" className="size-4" />
          {t('admin.error.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative sm:max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setPage(1)
          }}
          aria-label={t('admin.artworks.search')}
          placeholder={t('admin.artworks.search')}
          className="h-11 w-full rounded-xl border border-neutral-300 bg-white ps-9 pe-3 text-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200"
        />
      </div>

      {artQuery.isPending ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
            <span key={n} className="aspect-[4/3] animate-pulse rounded-2xl bg-neutral-200" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
            <ImageOff aria-hidden="true" className="size-6" />
          </span>
          <p className="font-serif text-lg text-neutral-900">{t('admin.artworks.empty')}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((a) => (
            <li key={a.id} className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <div className="relative aspect-[4/3] bg-neutral-100">
                {a.mediaUrl ? (
                  // Videos live at /video/upload/. The admin grid only needs a
                  // still, so show Cloudinary's JPEG derivative instead of a
                  // <video>: no Range request, no media-cache read to fail.
                  a.mediaUrl.includes('/video/') ? (
                    <>
                      <SafeImage
                        src={videoPosterUrl(a.mediaUrl) ?? a.mediaUrl}
                        alt=""
                        loading="lazy"
                        draggable={false}
                        className="size-full object-cover"
                      />
                      <span
                        role="img"
                        aria-label={t('create.videoBadge')}
                        className="absolute start-2 top-2 flex items-center justify-center rounded-full bg-neutral-900/60 p-1.5 text-white backdrop-blur"
                      >
                        <Video aria-hidden="true" className="size-4" />
                      </span>
                    </>
                  ) : (
                    <img src={a.mediaUrl} alt={a.title} loading="lazy" draggable={false} className="size-full object-cover" />
                  )
                ) : (
                  <span aria-hidden="true" className="block size-full bg-neutral-200" />
                )}
                {canAdmin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setToDelete(a)
                    }}
                    aria-label={t('admin.artworks.delete')}
                    className="absolute end-2 top-2 flex size-8 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-sm backdrop-blur transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 motion-reduce:transition-none"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                ) : null}
              </div>
              <div className="flex flex-col gap-1 p-3">
                <p className="truncate font-medium text-neutral-900">{a.title}</p>
                <p className="truncate text-xs text-neutral-500">
                  {t('admin.artworks.by', { author: a.author?.fullname ?? a.author?.username ?? '—' })}
                </p>
                <p className="flex items-center gap-3 text-xs text-neutral-400">
                  <span className="inline-flex items-center gap-1"><Heart aria-hidden="true" className="size-3" />{a._count?.likes ?? 0}</span>
                  <span className="inline-flex items-center gap-1"><MessageCircle aria-hidden="true" className="size-3" />{a._count?.comments ?? 0}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 ? (
        <nav aria-label={t('admin.artworks.title')} className="flex items-center justify-center gap-1">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label={t('admin.pagination.previous')}
            className="flex size-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <span aria-current="page" className="min-w-9 rounded-lg bg-neutral-900 px-3 py-1.5 text-center text-sm text-white">{safePage}</span>
          <span className="text-sm text-neutral-400">/ {pageCount}</span>
          <button
            type="button"
            disabled={safePage >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            aria-label={t('admin.pagination.next')}
            className="flex size-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </nav>
      ) : null}

      {toDelete ? (
        <Modal isOpen onClose={() => setToDelete(null)} labelledBy="admin-art-delete" size="md">
          <div className="flex flex-col gap-5 p-6">
            <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Trash2 className="size-6" />
            </span>
            <div className="flex flex-col gap-2">
              <h2 id="admin-art-delete" className="font-serif text-2xl text-neutral-900">
                {t('admin.artworks.deleteTitle')}
              </h2>
              <p className="text-sm text-neutral-600">
                {t('admin.artworks.deleteBody', { title: toDelete.title })}
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setToDelete(null)}>
                {t('admin.artworks.deleteCancel')}
              </Button>
              <Button
                variant="danger"
                loading={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate(toDelete.id)
                }}
              >
                {t('admin.artworks.deleteConfirm')}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
