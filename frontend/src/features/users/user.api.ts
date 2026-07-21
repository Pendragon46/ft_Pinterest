// L'API "users" : toutes les lectures/écritures des pages Profil & Réglages
// passent par ici. Les lectures appellent le backend NestJS ; les mutations
// (profil, compte, follow) restent sur mocks jusqu'aux phases 3/4. Signatures
// et clés de cache inchangées.

import type { ProfileArtwork } from '@/features/artworks/artwork.types'
import type { User } from '@/features/auth/auth.types'
import { http } from '@/lib/http'
import {
  toProfileArtwork,
  toUser,
  type ServerArtwork,
  type ServerUser,
} from '@/lib/mappers'
import { maybeFailMutation } from '@/lib/devFail'
import { updateMockProfile, type ProfilePatch } from './user.mock'

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

/** Profil d'un user. GET /users/:id → 404 si inconnu (remonté en ApiError). */
export async function fetchProfile(id: string): Promise<User> {
  const { data } = await http.get<ServerUser>(`/users/${id}`)
  return toUser(data)
}

/** Œuvres publiées. Le backend inclut déjà `_count`. */
export async function fetchUserWorks(id: string): Promise<ProfileArtwork[]> {
  const { data } = await http.get<ServerArtwork[]>(`/users/${id}/artworks`)
  return data.map(toProfileArtwork)
}

/** Œuvres likées. Le service déplie déjà `like.artwork` côté serveur. */
export async function fetchUserLiked(id: string): Promise<ProfileArtwork[]> {
  const { data } = await http.get<ServerArtwork[]>(
    `/users/${id}/artworks/liked`,
  )
  return data.map(toProfileArtwork)
}

/** Nombre d'abonnés. Le backend renvoie un entier nu, pas un objet. */
export async function fetchFollowerCount(id: string): Promise<number> {
  const { data } = await http.get<number>(`/users/${id}/followers/count`)
  return data
}

/** Nombre d'abonnements. Même forme. */
export async function fetchFollowingCount(id: string): Promise<number> {
  const { data } = await http.get<number>(`/users/${id}/following/count`)
  return data
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
  maybeFailMutation()
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
  maybeFailMutation()
  const patch: ProfilePatch = {}
  if (input.email !== undefined) patch.email = input.email
  // A password change is server-only — nothing to reflect in the client cache.
  return updateMockProfile(id, patch)
}

export interface FollowInput {
  id: string
  following: boolean
  loggedUser: string
}

/** Follow / unfollow a user (optimistic caller). The mock echoes the requested state.
    TODO(backend): POST/DELETE /users/:id/follow (body { loggedUser }). */
export async function setFollow(input: FollowInput): Promise<boolean> {
  await delay(LATENCY_MS)
  maybeFailMutation()
  return input.following
}
