import { useMutation } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/lib/toast.store'

import { deleteArtwork } from '../artwork.api'

interface Props {
  artwork: { id: string; title: string } | null
  onClose: () => void
  onDeleted: () => void
}

export function DeleteArtworkDialog({ artwork, onClose, onDeleted }: Props) {
  const { t } = useTranslation('common')
  const toast = useToast()

  const mutation = useMutation({
    mutationFn: (id: string) => deleteArtwork(id),
    onSuccess: () => {
      onDeleted()
      onClose()
    },
    onError: () => {
      toast({ variant: 'error', message: t('errors.network') })
    },
  })

  if (!artwork) return null

  return (
    <Modal isOpen onClose={onClose} labelledBy="artwork-delete-title" size="md">
      <div className="flex flex-col gap-5 p-6">
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600"
        >
          <Trash2 className="size-6" />
        </span>
        <div className="flex flex-col gap-2">
          <h2
            id="artwork-delete-title"
            className="font-serif text-2xl text-neutral-900"
          >
            {t('artwork.deleteTitle')}
          </h2>
          <p className="text-sm text-neutral-600">
            {t('artwork.deleteBody', { title: artwork.title })}
          </p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            {t('artwork.deleteCancel')}
          </Button>
          <Button
            variant="danger"
            loading={mutation.isPending}
            onClick={() => {
              mutation.mutate(artwork.id)
            }}
          >
            {t('artwork.deleteConfirm')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
