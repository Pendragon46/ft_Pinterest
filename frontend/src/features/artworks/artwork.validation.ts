// Mirrors the backend CreateArtworkDto (POST /artworks/user/:id). Validators
// return i18n keys, not strings — same shape as auth.validation.ts, so the
// Create form re-translates live and the server maps its 400s to the same keys.

import type { MediaType } from './artwork.types'

export type CreateErrorKey =
  | 'create.errors.fileRequired'
  | 'create.errors.fileType'
  | 'create.errors.fileTooLarge'
  | 'create.errors.titleRequired'
  | 'create.errors.titleLength'
  | 'create.errors.descriptionLength'
  | 'create.errors.tagsMin'
  | 'create.errors.tagsMax'

// The server file pipe accepts exactly these; the front `accept` attribute
// mirrors it so the picker never offers a type the backend will reject.
export const ACCEPTED_MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
] as const

export const ACCEPT_ATTR = ACCEPTED_MEDIA_TYPES.join(',')
export const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB, server-enforced
export const TITLE_MIN = 3
export const TITLE_MAX = 100
export const DESCRIPTION_MAX = 2000 // validator is 2000 (server message says 500 — cosmetic bug)
export const TAGS_MIN = 1
export const TAGS_MAX = 5
export const TAG_MAX_LENGTH = 30 // per-tag chars; mirrors backend @MaxLength(30, { each: true })

/** Image vs video, from the file's MIME type (backend derives the same from Cloudinary). */
export function mediaTypeOf(file: File): MediaType {
  return file.type.startsWith('video/') ? 'video' : 'image'
}

export function validateFile(file: File | null): CreateErrorKey | undefined {
  if (!file) return 'create.errors.fileRequired'
  if (!(ACCEPTED_MEDIA_TYPES as readonly string[]).includes(file.type)) {
    return 'create.errors.fileType'
  }
  if (file.size > MAX_FILE_BYTES) return 'create.errors.fileTooLarge'
  return undefined
}

export function validateTitle(value: string): CreateErrorKey | undefined {
  const trimmed = value.trim()
  if (trimmed.length === 0) return 'create.errors.titleRequired'
  if (trimmed.length < TITLE_MIN || trimmed.length > TITLE_MAX) {
    return 'create.errors.titleLength'
  }
  return undefined
}

export function validateDescription(value: string): CreateErrorKey | undefined {
  if (value.trim().length > DESCRIPTION_MAX) return 'create.errors.descriptionLength'
  return undefined
}

/** Server-parity tag cleanup: trim, lowercase, drop empties, dedupe (order kept). */
export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase()
    if (tag && !seen.has(tag)) {
      seen.add(tag)
      out.push(tag)
    }
  }
  return out
}

export function validateTags(tags: readonly string[]): CreateErrorKey | undefined {
  const normalized = normalizeTags(tags)
  if (normalized.length < TAGS_MIN) return 'create.errors.tagsMin'
  if (normalized.length > TAGS_MAX) return 'create.errors.tagsMax'
  return undefined
}
