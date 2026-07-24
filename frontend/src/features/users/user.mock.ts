// Deterministic mock "users" domain — the stand-in for the absent NestJS/Prisma
// user endpoints. The profile is a small mutable record so Settings edits survive
// a refetch (same trick as the comment store); works are derived from the canvas
// mock so the detail modal opens with matching content. Swap the api bodies for
// real fetches later and the UI is unchanged.

import { AUTHORS, generateCell } from '@/features/artworks/artwork.mock'
import type {
  ArtworkDetail,
  AuthorSummary,
  MediaType,
  ProfileArtwork,
} from '@/features/artworks/artwork.types'
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
  role: 'USER',
}

export function getMockProfile(id: string): User | null {
  if (id === mockProfile.id) return { ...mockProfile }
  // Any canvas author (u1–u8) resolves to a synthesized profile so their page
  // opens populated from the artwork detail. TODO(backend): GET /users/:id.
  const author = AUTHORS.find((entry) => entry.id === id)
  return author ? profileFromAuthor(author) : null
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

// ── Other users (the canvas authors) ────────────────────────────────────────
// Tapping an author in the detail view opens their profile, so every canvas
// author must resolve to a populated page. We synthesize one from the
// AuthorSummary; only the signed-in account (above) is editable.

const AUTHOR_BIOS: readonly string[] = [
  'Visual artist chasing light and texture.',
  'Illustrator — coffee, ink, repeat.',
  'Exploring color, form and quiet moments.',
  'Designer of small worlds and big skies.',
  'Photography, collage and happy accidents.',
  'Making things that move, sometimes literally.',
  'Type, grids and the space between.',
  'Painting in pixels since forever.',
]

// 0-based rank of a known user (the account → 0, else the author's position),
// or -1 if the id is unknown. Drives a per-user rotation so each grid differs.
function knownUserIndex(id: string): number {
  if (id === mockProfile.id) return 0
  return AUTHORS.findIndex((author) => author.id === id)
}

function profileFromAuthor(author: AuthorSummary): User {
  const i = Math.max(0, AUTHORS.indexOf(author))
  return {
    id: author.id,
    fullname: author.username, // AUTHORS.username is the display name…
    username: author.handle, //   …and handle is the unique @username
    email: `${author.handle}@atlaas.app`,
    bio: AUTHOR_BIOS[i % AUTHOR_BIOS.length],
    avatarUrl: gradientDataUri(GRADIENTS[i % GRADIENTS.length]),
    role: 'USER',
  }
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

// Cells spread across the eight compass directions → varied first tags (the world
// maps each direction to a different discipline).
const WORK_CELLS: readonly (readonly [number, number])[] = [
  [4, 0], [3, 3], [0, 4], [-3, 3], [-4, 0], [-3, -3],
  [0, -4], [3, -3], [5, 2], [-2, 5], [-5, -2], [2, -5],
]
const LIKED_CELLS: readonly (readonly [number, number])[] = [
  [6, 1], [-1, 6], [-6, -1], [1, -6],
]

export function mockUserWorks(id: string): ProfileArtwork[] {
  const offset = knownUserIndex(id)
  if (offset < 0) return []
  const works: ProfileArtwork[] = []
  WORK_CELLS.forEach((_cell, k) => {
    const [cx, cy] = WORK_CELLS[(k + offset) % WORK_CELLS.length]
    const work = toProfileArtwork(cx, cy, works.length)
    if (work) works.push(work)
  })
  // Works published this session come first, so a fresh publish is visible atop
  // the deterministic list (§5).
  return [...getCreatedWorks(id), ...works]
}

export function mockUserLiked(id: string): ProfileArtwork[] {
  const offset = knownUserIndex(id)
  if (offset < 0) return []
  const liked: ProfileArtwork[] = []
  LIKED_CELLS.forEach((_cell, i) => {
    const [cx, cy] = LIKED_CELLS[(i + offset) % LIKED_CELLS.length]
    // The second liked work has no image → exercises the neutral placeholder.
    const work = toProfileArtwork(cx, cy, i + 5, i !== 1)
    if (work) liked.push(work)
  })
  return liked
}

export const MOCK_FOLLOWER_COUNT = 1300
export const MOCK_FOLLOWING_COUNT = 142

// ── User-created works (session store) ──────────────────────────────────────
// Stand-in for POST /artworks + persistence: works published this session live
// here so the whole loop (publish → detail → Profile Works) closes on mocks,
// prepended ahead of the deterministic list. TODO(backend): delete — the server
// persists artworks and the user/detail GETs return them.

export interface CreateArtworkMockInput {
  file: File
  mediaType: MediaType
  title: string
  description: string
  tags: string[]
  userId: string
}

interface CreatedArtwork extends CreateArtworkMockInput {
  id: string
  mediaUrl: string
  author: AuthorSummary
}

let createdSeq = 0
const createdWorks: CreatedArtwork[] = []

// The signed-in account as an artwork author (User has no `color` → neutral).
function selfAsAuthor(): AuthorSummary {
  return {
    id: mockProfile.id,
    username: mockProfile.fullname ?? mockProfile.username,
    handle: mockProfile.username,
    color: '#525252',
  }
}

function createdToProfileArtwork(work: CreatedArtwork): ProfileArtwork {
  return {
    id: work.id,
    title: work.title,
    mediaUrl: work.mediaUrl,
    mediaType: work.mediaType,
    tags: work.tags.map((name) => ({ name })),
    _count: { likes: 0, comments: 0 },
  }
}

/** Publish a work into the session store; returns its profile-grid shape. The
    object URL is minted here (not the form's preview URL) so it survives the
    Create page unmounting right after publish. */
export function addCreatedArtwork(input: CreateArtworkMockInput): ProfileArtwork {
  createdSeq += 1
  const record: CreatedArtwork = {
    ...input,
    id: `local_${createdSeq}`,
    mediaUrl: URL.createObjectURL(input.file),
    author: selfAsAuthor(),
  }
  createdWorks.unshift(record)
  return createdToProfileArtwork(record)
}

/** Session-created works for a user, newest first. */
export function getCreatedWorks(userId: string): ProfileArtwork[] {
  return createdWorks
    .filter((work) => work.userId === userId)
    .map(createdToProfileArtwork)
}

/** Resolve a `local_*` id to a full detail, or null if it isn't a created work. */
export function getCreatedDetail(id: string): ArtworkDetail | null {
  const work = createdWorks.find((entry) => entry.id === id)
  if (!work) return null
  return {
    id: work.id,
    title: work.title,
    color: '#e5e5e5', // neutral; the uploaded media is the hero, not a colour
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    author: work.author,
    description: work.description,
    tags: work.tags,
    mediaUrl: work.mediaUrl,
    mediaType: work.mediaType,
  }
}
