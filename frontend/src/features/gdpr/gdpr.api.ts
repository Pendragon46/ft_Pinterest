import { downloadFile, toCsv } from '@/lib/csv'
import { http } from '@/lib/http'

import type { GdprExport } from './gdpr.types'

export const gdprKeys = {
  export: () => ['gdpr', 'export'] as const,
}

/** Le serveur exclut le mot de passe ; on ne met jamais ce document en cache
    persistant. */
export async function fetchMyData(): Promise<GdprExport> {
  const { data } = await http.get<GdprExport>('/users/me/export')
  return data
}

function exportFilename(username: string, ext: 'json' | 'csv'): string {
  const date = new Date().toISOString().slice(0, 10)
  return `atlaas-data-${username}-${date}.${ext}`
}

export function downloadExport(data: GdprExport, username: string): void {
  downloadFile(
    JSON.stringify(data, null, 2),
    exportFilename(username, 'json'),
    'application/json',
  )
}

/**
 * Un export RGPD couvre plusieurs catégories (compte, compteurs, œuvres,
 * commentaires, …) : chacune devient un tableau titré, séparé par une ligne
 * vide, dans un seul fichier lisible en tableur.
 */
export function downloadExportCsv(data: GdprExport, username: string): void {
  const asRows = (value: unknown): Record<string, unknown>[] =>
    Array.isArray(value) ? (value as Record<string, unknown>[]) : []
  const row = (obj: object): Record<string, unknown> =>
    obj as Record<string, unknown>

  const sections: [string, Record<string, unknown>[]][] = [
    ['meta', [{ exportedAt: data.exportedAt, notice: data.notice }]],
    ['account', [row(data.account)]],
    ['counts', [row(data.counts)]],
    ['artworks', asRows(data.artworks)],
    ['comments', asRows(data.comments)],
    ['likes', asRows(data.likes)],
    ['following', asRows(data.following)],
    ['followers', asRows(data.followers)],
  ]

  const csv = sections
    .map(([title, rows]) => `${title}\r\n${toCsv(rows)}`)
    .join('\r\n\r\n')

  // Lead with a UTF-8 BOM so Excel decodes accented French and Arabic correctly
  // on double-click instead of falling back to its ANSI codepage.
  downloadFile(`\uFEFF${csv}`, exportFilename(username, 'csv'), 'text/csv')
}

/** Irréversible : l'appelant doit avoir obtenu une confirmation explicite. */
export async function deleteMyAccount(userId: string): Promise<void> {
  await http.delete(`/users/${userId}`)
}
