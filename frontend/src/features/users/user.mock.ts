// Deterministic mock "users" domain — the stand-in for the absent NestJS/Prisma
// user endpoints. The profile is a small mutable record so Settings edits survive
// a refetch (same trick as the comment store); works are derived from the canvas
// mock so the detail modal opens with matching content. Swap the api bodies for
// real fetches later and the UI is unchanged.

import { generateCell } from '@/features/artworks/artwork.mock'
import type { ProfileArtwork } from '@/features/artworks/artwork.types'
import type { User } from '@/features/auth/auth.types'
import { DEFAULT_AVATAR } from '@/lib/avatar'

// ── Profile ─────────────────────────────────────────────────────────────────

// The single mock account (id 'dev-user'), seeded to match the design. Mutable so
// Settings edits persist across a profile refetch. TODO(backend): delete.
let mockProfile: User = {
  id: 'dev-user',
  fullname: 'Sedra Rabe',
  username: 'sedra',
  email: 'sedra@atlaas.app',
  bio: 'Designer exploring the edges of the creative universe.',
  avatarUrl: DEFAULT_AVATAR,
  roles: 'USER',
}

export function getMockProfile(id: string): User | null {
  return id === mockProfile.id ? { ...mockProfile } : null
}

/** The profile fields Settings → Account can edit. */
export type ProfilePatch = Partial<
  Pick<User, 'fullname' | 'username' | 'email' | 'bio' | 'avatarUrl'>
>

export function updateMockProfile(id: string, patch: ProfilePatch): User {
  if (id === mockProfile.id) mockProfile = { ...mockProfile, ...patch }
  return { ...mockProfile }
}

// ── Works & liked (backend-shaped artworks) ─────────────────────────────────

// Soft gradient pairs — the mock's stand-in image, so the grid looks like the
// design. TODO(backend): real `mediaUrl`s replace these.
const GRADIENTS: readonly (readonly [string, string])[] = [
  ['#e07a9b', '#c0504d'], ['#7ed957', '#3aa856'], ['#5b8fd8', '#3f5bd4'],
  ['#4a3fd4', '#7b1fb0'], ['#e0902a', '#c46a1c'], ['#6cc98a', '#3aa856'],
  ['#c9b98a', '#a89a6a'], ['#7bc0c9', '#4a9aa8'], ['#d88ac0', '#a84d90'],
  ['#8a9ad8', '#4d5da8'], ['#d8c48a', '#a8944d'], ['#8ad8c4', '#4da894'],
]

function gradientDataUri([a, b]: readonly [string, string]): string {
  const c = (hex: string) => hex.replace('#', '%23')
  return `data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%204%203'%3E%3Cdefs%3E%3ClinearGradient%20id='g'%20x1='0'%20y1='0'%20x2='1'%20y2='1'%3E%3Cstop%20offset='0'%20stop-color='${c(a)}'/%3E%3Cstop%20offset='1'%20stop-color='${c(b)}'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width='4'%20height='3'%20fill='url(%23g)'/%3E%3C/svg%3E`
}

// One backend-shaped artwork from a canvas cell: id + title match the cell, so
// opening the detail modal shows the same work; the category becomes its first tag.
function toProfileArtwork(
  cx: number,
  cy: number,
  index: number,
  withImage = true,
): ProfileArtwork | null {
  const cell = generateCell(cx, cy)
  if (!cell) return null
  return {
    id: cell.id,
    title: cell.title,
    mediaUrl: withImage
      ? gradientDataUri(GRADIENTS[index % GRADIENTS.length])
      : null,
    tags: [{ name: cell.category }],
    _count: { likes: cell.likeCount, comments: cell.commentCount },
  }
}

export function mockUserWorks(id: string): ProfileArtwork[] {
  if (id !== mockProfile.id) return []
  const works: ProfileArtwork[] = []
  for (let cy = 2; cy <= 4; cy++) {
    for (let cx = 2; cx <= 5; cx++) {
      const work = toProfileArtwork(cx, cy, works.length)
      if (work) works.push(work)
    }
  }
  return works
}

export function mockUserLiked(id: string): ProfileArtwork[] {
  if (id !== mockProfile.id) return []
  const liked: ProfileArtwork[] = []
  const cells: readonly (readonly [number, number])[] = [
    [6, 2], [7, 2], [8, 3], [6, 3],
  ]
  cells.forEach(([cx, cy], i) => {
    // The second liked work has no image → exercises the neutral placeholder.
    const work = toProfileArtwork(cx, cy, i + 5, i !== 1)
    if (work) liked.push(work)
  })
  return liked
}

export const MOCK_FOLLOWER_COUNT = 1300
export const MOCK_FOLLOWING_COUNT = 142
