// The users "API": every read/write the profile & settings pages perform goes
// through here. Today each resolves from the mock; when the NestJS/Prisma backend
// lands only the bodies change (signatures + query keys stay identical). The
// mock shapes already mirror the backend (`_count`, minimal DTO bodies, `mediaUrl`).

import type { ProfileArtwork } from '@/features/artworks/artwork.types'
import type { User } from '@/features/auth/auth.types'

import {
  getMockProfile,
  mockUserLiked,
  mockUserWorks,
  MOCK_FOLLOWER_COUNT,
  MOCK_FOLLOWING_COUNT,
  updateMockProfile,
  type ProfilePatch,
} from './user.mock'

const LATENCY_MS = 200

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

// React Query key factory — single source of truth for the users cache keys.
export const userKeys = {
  profile: (id: string) => ['users', 'profile', id] as const,
  works: (id: string) => ['users', 'works', id] as const,
  liked: (id: string) => ['users', 'liked', id] as const,
  followerCount: (id: string) => ['users', 'followerCount', id] as const,
  followingCount: (id: string) => ['users', 'followingCount', id] as const,
}

/** One user's profile.
    TODO(backend): GET /users/:id → User (404 if unknown). */
export async function fetchProfile(id: string): Promise<User> {
  await delay(LATENCY_MS)
  const profile = getMockProfile(id)
  if (!profile) throw new Error(`User not found: ${id}`)
  return profile
}

/** A user's own works.
    TODO(backend): GET /users/:id/artworks → Artwork[] (each with `_count`). */
export async function fetchUserWorks(id: string): Promise<ProfileArtwork[]> {
  await delay(LATENCY_MS)
  return mockUserWorks(id)
}

/** A user's liked works.
    TODO(backend): GET /users/:id/artworks/liked → Artwork[]. */
export async function fetchUserLiked(id: string): Promise<ProfileArtwork[]> {
  await delay(LATENCY_MS)
  return mockUserLiked(id)
}

/** TODO(backend): GET /users/:id/followers/count → number. */
export async function fetchFollowerCount(id: string): Promise<number> {
  await delay(LATENCY_MS)
  return getMockProfile(id) ? MOCK_FOLLOWER_COUNT : 0
}

/** TODO(backend): GET /users/:id/following/count → number. */
export async function fetchFollowingCount(id: string): Promise<number> {
  await delay(LATENCY_MS)
  return getMockProfile(id) ? MOCK_FOLLOWING_COUNT : 0
}

// ── Mutations ───────────────────────────────────────────────────────────────
// The global ValidationPipe uses forbidNonWhitelisted, so bodies carry ONLY the
// DTO fields + `loggedUser` (the current user's id — the temporary auth seam).

export interface UpdateProfileInput {
  loggedUser: string
  fullname?: string | null
  username?: string
  bio?: string | null
  avatarUrl?: string
}

/** Save Account → Profile.
    TODO(backend): PATCH /users/:id (multipart/form-data if the avatar changed,
    else JSON), then invalidate userKeys.profile(id). */
export async function updateProfile(
  id: string,
  input: UpdateProfileInput,
): Promise<User> {
  await delay(LATENCY_MS)
  // Send only the changed profile fields (the backend DTO forbids extra keys);
  // `loggedUser` is the auth seam meant for the server, not the client cache.
  const patch: ProfilePatch = {}
  if (input.fullname !== undefined) patch.fullname = input.fullname
  if (input.username !== undefined) patch.username = input.username
  if (input.bio !== undefined) patch.bio = input.bio
  if (input.avatarUrl !== undefined) patch.avatarUrl = input.avatarUrl
  return updateMockProfile(id, patch)
}

export interface UpdateAccountInput {
  loggedUser: string
  email?: string
  password?: string
}

/** Save Account → Email & password.
    TODO(backend): PATCH /users/:id with { email?, password? } (+ loggedUser),
    then invalidate userKeys.profile(id). The password is never stored client-side. */
export async function updateAccount(
  id: string,
  input: UpdateAccountInput,
): Promise<User> {
  await delay(LATENCY_MS)
  const patch: ProfilePatch = {}
  if (input.email !== undefined) patch.email = input.email
  // A password change is server-only — nothing to reflect in the client cache.
  return updateMockProfile(id, patch)
}
