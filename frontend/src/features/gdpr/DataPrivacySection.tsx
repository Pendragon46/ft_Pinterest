import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Download, Eye } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import type { User } from '@/features/auth/auth.types'
import { useToast } from '@/lib/toast.store'

import { DeleteAccountDialog } from './DeleteAccountDialog'
import { downloadExport, downloadExportCsv, fetchMyData } from './gdpr.api'
import type { GdprExport } from './gdpr.types'

type ExportFormat = 'json' | 'csv'

export function DataPrivacySection({ user }: { user: User }) {
  const { t } = useTranslation('common')
  const toast = useToast()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [data, setData] = useState<GdprExport | null>(null)

  const exportMutation = useMutation({
    mutationFn: fetchMyData,
    onSuccess: (result) => {
      setData(result)
    },
    onError: () => {
      toast({ variant: 'error', message: t('errors.network') })
    },
  })

  const save = (doc: GdprExport, format: ExportFormat) => {
    if (format === 'csv') downloadExportCsv(doc, user.username)
    else downloadExport(doc, user.username)
  }

  const handleDownload = (format: ExportFormat) => {
    if (data) {
      save(data, format)
      return
    }
    exportMutation.mutate(undefined, {
      onSuccess: (result) => {
        save(result, format)
      },
    })
  }

  const card = 'flex flex-col gap-4 rounded-2xl border border-neutral-200 p-6'

  return (
    <div className="flex flex-col gap-6">
      <section className={card}>
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-xl text-neutral-900">
            {t('gdpr.section.title')}
          </h2>
          <p className="text-sm text-neutral-500">
            {t('gdpr.section.description')}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            loading={exportMutation.isPending}
            onClick={() => {
              exportMutation.mutate()
            }}
          >
            <Eye aria-hidden="true" className="size-4" />
            {exportMutation.isPending
              ? t('gdpr.view.loading')
              : t('gdpr.view.button')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              handleDownload('json')
            }}
          >
            <Download aria-hidden="true" className="size-4" />
            {t('gdpr.download.json')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              handleDownload('csv')
            }}
          >
            <Download aria-hidden="true" className="size-4" />
            {t('gdpr.download.csv')}
          </Button>
        </div>

        {data ? (
          <p
            role="status"
            className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700"
          >
            {t('gdpr.view.summary', {
              artworks: data.counts.artworks,
              comments: data.counts.comments,
              likes: data.counts.likes,
              following: data.counts.following,
              followers: data.counts.followers,
            })}
          </p>
        ) : (
          <p className="text-xs text-neutral-400">{t('gdpr.download.hint')}</p>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50/40 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-xl text-red-700">
            {t('gdpr.danger.title')}
          </h2>
          <p className="text-sm text-neutral-600">
            {t('gdpr.danger.description')}
          </p>
        </div>
        <div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setDeleteOpen(true)
            }}
          >
            {t('gdpr.danger.button')}
          </Button>
        </div>
      </section>

      <DeleteAccountDialog
        isOpen={deleteOpen}
        onClose={() => {
          setDeleteOpen(false)
        }}
        user={user}
      />
    </div>
  )
}
