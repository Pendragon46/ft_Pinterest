// Miroir client des validateurs Nest (ParseFilePipe) ; le serveur reste
// l'autorité. Évite d'attendre l'envoi d'un fichier qui sera refusé.

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

const AVATAR_TYPES = ['image/jpg', 'image/jpeg', 'image/png', 'image/webp']
const ARTWORK_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
]

// Typées (pas `string`) pour que `t(key)` type-check contre les ressources i18next.
export type UploadErrorKey = 'errors.fileTooLarge' | 'errors.fileType'

/** Renvoie une clé i18n si le fichier est invalide, null s'il passe.
    Une clé plutôt qu'un message : le formulaire la traduit lui-même. */
export function validateUpload(
  file: File,
  kind: 'avatar' | 'artwork',
): UploadErrorKey | null {
  const allowed = kind === 'avatar' ? AVATAR_TYPES : ARTWORK_TYPES
  if (file.size > MAX_UPLOAD_BYTES) return 'errors.fileTooLarge'
  if (!allowed.includes(file.type)) return 'errors.fileType'
  return null
}
