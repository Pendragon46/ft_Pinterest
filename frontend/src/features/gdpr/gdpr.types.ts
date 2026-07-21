// Miroir du document renvoyé par GET /users/me/export. Le backend est
// l'autorité sur cette forme ; ces types servent au téléchargement et à
// l'affichage du récapitulatif.

export interface GdprExportCounts {
  artworks: number
  comments: number
  likes: number
  following: number
  followers: number
}

export interface GdprExport {
  exportedAt: string
  format: string
  notice: string
  account: {
    id: string
    fullname: string | null
    username: string
    email: string
    bio: string | null
    avatarUrl: string
    role: string
    registeredAt: string
    lastUpdatedAt: string
  }
  artworks: unknown[]
  comments: unknown[]
  likes: unknown[]
  following: unknown[]
  followers: unknown[]
  counts: GdprExportCounts
}
