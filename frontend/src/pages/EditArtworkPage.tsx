import { useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { AppHeader } from '@/components/AppHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import {
  artworkKeys,
  fetchArtworkDetail,
  updateArtwork,
} from '@/features/artworks/artwork.api'
import {
  normalizeTags,
  TAGS_MAX,
  validateDescription,
  validateTags,
  validateTitle,
} from '@/features/artworks/artwork.validation'
import type { CreateErrorKey } from '@/features/artworks/artwork.validation'
import { useAuthStore } from '@/features/auth/auth.store'
import { useRole } from '@/features/auth/useRole'
import { userKeys } from '@/features/users/user.api'
import { useToast } from '@/lib/toast.store'

interface EditErrors {
  title?: CreateErrorKey
  description?: CreateErrorKey
  tags?: CreateErrorKey
}

// Metadata-only edit (title / description / tags); the uploaded media is kept.
// Reuses the Create form's validators + tag-chip input.
export function EditArtworkPage() {
  const { t } = useTranslation('common')
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const authUser = useAuthStore((state) => state.user)
  const { canAdmin } = useRole()

  const detailQuery = useQuery({
    queryKey: artworkKeys.detail(id),
    queryFn: () => fetchArtworkDetail(id),
  })
  const detail = detailQuery.data

  const [seededId, setSeededId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState<EditErrors>({})

  // Seed the form once the artwork loads — setState during render (the same
  // "adjust state when a prop changes" pattern used for the niche pre-fill),
  // guarded by the id so later refetches never clobber in-progress edits.
  if (detail && detail.id !== seededId) {
    setSeededId(detail.id)
    setTitle(detail.title)
    setDescription(detail.description)
    setTags(detail.tags)
  }

  const addTag = (raw: string) => {
    const candidate = normalizeTags([...tags, raw])
    if (candidate.length === tags.length) {
      setTagInput('')
      return
    }
    if (candidate.length > TAGS_MAX) {
      setErrors((prev) => ({ ...prev, tags: 'create.errors.tagsMax' }))
      return
    }
    setTags(candidate)
    setErrors((prev) => ({ ...prev, tags: undefined }))
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((entry) => entry !== tag))
    setErrors((prev) => ({ ...prev, tags: undefined }))
  }

  const onTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTag(tagInput)
    } else if (event.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  const canSave =
    validateTitle(title) === undefined &&
    validateDescription(description) === undefined &&
    validateTags(tags) === undefined

  const mutation = useMutation({
    mutationFn: () =>
      updateArtwork(id, {
        title: title.trim(),
        description: description.trim(),
        tags: normalizeTags(tags),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: artworkKeys.detail(id) })
      if (authUser) {
        void queryClient.invalidateQueries({
          queryKey: userKeys.works(authUser.id),
        })
        void queryClient.invalidateQueries({
          queryKey: userKeys.profile(authUser.id),
        })
      }
      toast({ message: t('edit.saved') })
      navigate(`/artwork/${id}`)
    },
    onError: () => {
      toast({
        variant: 'error',
        message: t('toast.saveFailed'),
        action: { label: t('artwork.retry'), onClick: () => mutation.mutate() },
      })
    },
  })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const next: EditErrors = {
      title: validateTitle(title),
      description: validateDescription(description),
      tags: validateTags(tags),
    }
    setErrors(next)
    if (next.title || next.description || next.tags) return
    mutation.mutate()
  }

  if (!authUser) {
    return <Navigate to="/login" replace />
  }
  if (detailQuery.isPending) {
    return (
      <div className="min-h-svh bg-white">
        <AppHeader />
        <div role="status" className="grid place-items-center py-24">
          <Spinner size="md" />
          <span className="sr-only">{t('auth.loadingSession')}</span>
        </div>
      </div>
    )
  }
  if (detailQuery.isError || !detail) {
    return <Navigate to="/" replace />
  }
  // Owner (or admin) only.
  if (detail.author.id !== authUser.id && !canAdmin) {
    return <Navigate to={`/artwork/${id}`} replace />
  }

  return (
    <div className="min-h-svh bg-white">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-4xl text-neutral-900">
            {t('edit.title')}
          </h1>
          <p className="text-neutral-500">{t('edit.subtitle')}</p>
        </div>

        <form
          noValidate
          onSubmit={handleSubmit}
          className="mt-8 grid gap-8 md:grid-cols-2"
        >
          {/* Media column — read-only (the uploaded file is kept). */}
          <div className="flex flex-col gap-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950">
              {detail.mediaType === 'video' && detail.mediaUrl ? (
                <video
                  src={detail.mediaUrl}
                  controls
                  muted
                  playsInline
                  className="size-full bg-black object-contain"
                />
              ) : detail.mediaUrl ? (
                <img
                  src={detail.mediaUrl}
                  alt={title || ''}
                  className="size-full object-contain"
                />
              ) : (
                <div
                  className="size-full"
                  style={{ backgroundColor: detail.color }}
                />
              )}
            </div>
            <p className="text-sm text-neutral-400">{t('edit.mediaKept')}</p>
          </div>

          {/* Form column */}
          <div className="flex flex-col gap-5">
            <Input
              label={t('create.fieldTitle')}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
                setErrors((prev) => ({ ...prev, title: undefined }))
              }}
              error={errors.title ? t(errors.title) : undefined}
            />

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="edit-description"
                className="font-serif text-lg text-neutral-900"
              >
                {t('create.fieldDescription')}
              </label>
              <textarea
                id="edit-description"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value)
                  setErrors((prev) => ({ ...prev, description: undefined }))
                }}
                rows={4}
                aria-invalid={errors.description ? true : undefined}
                aria-describedby={
                  errors.description ? 'edit-description-error' : undefined
                }
                className={`w-full rounded-xl border bg-white px-4 py-3 text-base text-neutral-900 transition-colors placeholder:text-neutral-400 focus:outline-none focus:ring-2 motion-reduce:transition-none ${
                  errors.description
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                    : 'border-neutral-300 hover:border-neutral-400 focus:border-neutral-500 focus:ring-neutral-200'
                }`}
              />
              {errors.description ? (
                <p
                  id="edit-description-error"
                  role="alert"
                  className="text-sm text-red-600"
                >
                  {t(errors.description)}
                </p>
              ) : null}
            </div>

            {/* Tags chip input */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="edit-tags"
                className="font-serif text-lg text-neutral-900"
              >
                {t('create.fieldTags')}
              </label>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2 transition-colors focus-within:border-neutral-500 focus-within:ring-2 focus-within:ring-neutral-200 motion-reduce:transition-none">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      removeTag(tag)
                    }}
                    aria-label={t('create.removeTag', { tag })}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-sm text-neutral-700 transition-colors hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 motion-reduce:transition-none"
                  >
                    #{tag}
                    <X aria-hidden="true" className="size-3.5" />
                  </button>
                ))}
                <input
                  id="edit-tags"
                  value={tagInput}
                  onChange={(event) => {
                    setTagInput(event.target.value)
                  }}
                  onKeyDown={onTagKeyDown}
                  aria-describedby={errors.tags ? 'edit-tags-error' : undefined}
                  placeholder={tags.length === 0 ? t('create.tagPlaceholder') : ''}
                  className="min-w-[8rem] flex-1 bg-transparent py-1 text-base text-neutral-900 outline-none placeholder:text-neutral-400"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                {errors.tags ? (
                  <p
                    id="edit-tags-error"
                    role="alert"
                    className="text-sm text-red-600"
                  >
                    {t(errors.tags)}
                  </p>
                ) : (
                  <span />
                )}
                <span className="shrink-0 text-xs text-neutral-400">
                  {tags.length}/{TAGS_MAX}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                loading={mutation.isPending}
                disabled={!canSave}
              >
                {t('edit.save')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  navigate(-1)
                }}
              >
                {t('create.cancel')}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
