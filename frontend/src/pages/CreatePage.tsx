import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ImageUp, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { AppHeader } from '@/components/AppHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createArtwork } from '@/features/artworks/artwork.api'
import type { MediaType } from '@/features/artworks/artwork.types'
import {
  ACCEPT_ATTR,
  mediaTypeOf,
  normalizeTags,
  TAGS_MAX,
  validateDescription,
  validateFile,
  validateTags,
  validateTitle,
} from '@/features/artworks/artwork.validation'
import type { CreateErrorKey } from '@/features/artworks/artwork.validation'
import { useAuthStore } from '@/features/auth/auth.store'
import { userKeys } from '@/features/users/user.api'
import { useToast } from '@/lib/toast.store'

interface CreateErrors {
  file?: CreateErrorKey
  title?: CreateErrorKey
  description?: CreateErrorKey
  tags?: CreateErrorKey
}

// Dedicated builder for publishing a work (§0). Mirrors the detail page's two-
// column anatomy so publish → detail feels like the same object coming to life.
export function CreatePage() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const toast = useToast()
  const authUser = useAuthStore((state) => state.user)
  const userId = authUser?.id ?? ''

  const inputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<MediaType | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState<CreateErrors>({})
  const [progress, setProgress] = useState<number | null>(null)

  // Revoke the *preview* object URL on replace/unmount. The published copy mints
  // its own URL in the store, so navigating away never blanks the new detail.
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    },
    [],
  )

  const setPreview = (next: File | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const url = next ? URL.createObjectURL(next) : null
    previewUrlRef.current = url
    setPreviewUrl(url)
    setFile(next)
    setMediaType(next ? mediaTypeOf(next) : null)
  }

  const acceptFile = (next: File) => {
    const error = validateFile(next)
    setErrors((prev) => ({ ...prev, file: error }))
    // Don't preview an unshowable file; a too-large but valid type still previews
    // (Publish stays gated) so the user sees what they picked.
    if (error === 'create.errors.fileType') return
    setPreview(next)
  }

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0]
    if (next) acceptFile(next)
    event.target.value = '' // allow re-picking the same file after a clear
  }

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragOver(false)
    const next = event.dataTransfer.files?.[0]
    if (next) acceptFile(next)
  }

  const clearFile = () => {
    setPreview(null)
    setErrors((prev) => ({ ...prev, file: undefined }))
    inputRef.current?.focus()
  }

  const addTag = (raw: string) => {
    const candidate = normalizeTags([...tags, raw])
    if (candidate.length === tags.length) {
      setTagInput('') // empty or duplicate — nothing added
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

  // Live gate (§4): Publish enabled only once file + title + ≥1 tag all pass.
  const canPublish =
    validateFile(file) === undefined &&
    validateTitle(title) === undefined &&
    validateDescription(description) === undefined &&
    validateTags(tags) === undefined

  const mutation = useMutation({
    mutationFn: () =>
      createArtwork(
        {
          title: title.trim(),
          description: description.trim(),
          tags: normalizeTags(tags),
          file: file as File,
        },
        (pct) => setProgress(pct),
      ),
    onSuccess: () => {
      setProgress(null)
      void queryClient.invalidateQueries({ queryKey: userKeys.works(userId) })
      void queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) })
      toast({ message: t('create.published') })
      // Land on the author's profile so the fresh work is seen in context.
      navigate(`/profile/${userId}`)
    },
    onError: () => {
      setProgress(null)
      toast({
        variant: 'error',
        message: t('toast.saveFailed'),
        action: { label: t('artwork.retry'), onClick: () => mutation.mutate() },
      })
    },
  })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const next: CreateErrors = {
      file: validateFile(file),
      title: validateTitle(title),
      description: validateDescription(description),
      tags: validateTags(tags),
    }
    setErrors(next)
    if (next.file || next.title || next.description || next.tags) return
    setProgress(0)
    mutation.mutate()
  }

  // Signed-out direct visit → sign in first, then return here (§2).
  if (!authUser) {
    return <Navigate to="/login" state={{ background: location }} replace />
  }

  return (
    <div className="min-h-svh bg-white">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-4xl text-neutral-900">
            {t('create.title')}
          </h1>
          <p className="text-neutral-500">{t('create.subtitle')}</p>
        </div>

        <form
          noValidate
          onSubmit={handleSubmit}
          className="mt-8 grid gap-8 md:grid-cols-2"
        >
          {/* Media column */}
          <div className="flex flex-col gap-2">
            {/* One persistent, AT-operable input; the label (and Replace) drive it. */}
            <input
              ref={inputRef}
              id="create-file"
              type="file"
              accept={ACCEPT_ATTR}
              onChange={onFileChange}
              className="peer sr-only"
            />
            {file && previewUrl ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950">
                {mediaType === 'video' ? (
                  <video
                    src={previewUrl}
                    controls
                    muted
                    playsInline
                    className="size-full bg-black object-contain"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt={title || ''}
                    className="size-full object-contain"
                  />
                )}
                <div className="absolute end-2 top-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="cursor-pointer rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 motion-reduce:transition-none"
                  >
                    {t('create.replace')}
                  </button>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="cursor-pointer rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 motion-reduce:transition-none"
                  >
                    {t('create.clear')}
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="create-file"
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => {
                  setDragOver(false)
                }}
                onDrop={onDrop}
                className={`flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-colors peer-focus-visible:border-neutral-900 peer-focus-visible:ring-2 peer-focus-visible:ring-neutral-900 motion-reduce:transition-none ${
                  dragOver
                    ? 'border-neutral-900 bg-neutral-50'
                    : 'border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50'
                }`}
              >
                <ImageUp aria-hidden="true" className="size-8 text-neutral-400" />
                <span className="font-medium text-neutral-700">
                  {dragOver ? t('create.dropzoneActive') : t('create.dropzoneIdle')}
                </span>
                <span className="text-sm text-neutral-400">
                  {t('create.dropzoneHint')}
                </span>
              </label>
            )}
            {errors.file ? (
              <p role="alert" className="text-sm text-red-600">
                {t(errors.file)}
              </p>
            ) : null}
            {progress !== null ? (
              <div
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200"
              >
                <div
                  className="h-full rounded-full bg-neutral-900 transition-[width] duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            ) : null}
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
                htmlFor="create-description"
                className="font-serif text-lg text-neutral-900"
              >
                {t('create.fieldDescription')}
              </label>
              <textarea
                id="create-description"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value)
                  setErrors((prev) => ({ ...prev, description: undefined }))
                }}
                rows={4}
                aria-invalid={errors.description ? true : undefined}
                aria-describedby={
                  errors.description ? 'create-description-error' : undefined
                }
                className={`w-full rounded-xl border bg-white px-4 py-3 text-base text-neutral-900 transition-colors placeholder:text-neutral-400 focus:outline-none focus:ring-2 motion-reduce:transition-none ${
                  errors.description
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                    : 'border-neutral-300 hover:border-neutral-400 focus:border-neutral-500 focus:ring-neutral-200'
                }`}
              />
              {errors.description ? (
                <p
                  id="create-description-error"
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
                htmlFor="create-tags"
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
                  id="create-tags"
                  value={tagInput}
                  onChange={(event) => {
                    setTagInput(event.target.value)
                  }}
                  onKeyDown={onTagKeyDown}
                  aria-describedby={errors.tags ? 'create-tags-error' : undefined}
                  placeholder={tags.length === 0 ? t('create.tagPlaceholder') : ''}
                  className="min-w-[8rem] flex-1 bg-transparent py-1 text-base text-neutral-900 outline-none placeholder:text-neutral-400"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                {errors.tags ? (
                  <p
                    id="create-tags-error"
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
              <Button type="submit" loading={mutation.isPending} disabled={!canPublish}>
                {t('create.publish')}
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
