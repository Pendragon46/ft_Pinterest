import { http } from '@/lib/http'

import type { GdprExport } from './gdpr.types'

export const gdprKeys = {
  export: () => ['gdpr', 'export'] as const,
}

/** Récupère l'intégralité des données personnelles. Le serveur exclut le
    mot de passe ; on ne met jamais ce document en cache persistant. */
export async function fetchMyData(): Promise<GdprExport> {
  const { data } = await http.get<GdprExport>('/users/me/export')
  return data
}

/** Déclenche le téléchargement du fichier JSON. Passe par un Blob plutôt
    qu'un lien direct : la requête porte le token, un <a href> ne
    l'enverrait pas. */
export function downloadExport(data: GdprExport, username: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const date = new Date().toISOString().slice(0, 10)
  link.download = `atlaas-data-${username}-${date}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Libérer l'URL objet : sans ça le Blob reste en mémoire jusqu'au
  // rechargement de la page.
  URL.revokeObjectURL(url)
}

/** Supprime définitivement le compte. Irréversible : l'appelant doit avoir
    obtenu une confirmation explicite. */
export async function deleteMyAccount(userId: string): Promise<void> {
  await http.delete(`/users/${userId}`)
}
