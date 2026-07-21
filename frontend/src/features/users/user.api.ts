// L'API "users" : toutes les lectures/écritures des pages Profil & Réglages
// passent par ici. Lectures + mutations profil/compte appellent le backend
// NestJS ; `setFollow` reste sur mock jusqu'au ticket T1. Clés de cache
// inchangées.

import type { ProfileArtwork } from '@/features/artworks/artwork.types'
import type { User } from '@/features/auth/auth.types'
import { http, isApiError, multipartConfig } from '@/lib/http'
import {
  toProfileArtwork,
  toUser,
  type ServerArtwork,
  type ServerFollow,
  type ServerUser,
} from '@/lib/mappers'

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
// Profil, compte et follow passent par le backend ; l'identité voyage dans le
// token, donc plus de `loggedUser` dans les corps.

export interface UpdateProfileInput {
  fullname?: string | null
  username?: string
  bio?: string | null
  // Fichier choisi dans le formulaire ; absent si l'avatar est inchangé.
  avatarFile?: File | null
}

/** Enregistre le profil. Deux formes selon qu'un fichier accompagne la
    requête : multipart avec avatar, JSON sinon. On n'envoie que les champs
    réellement modifiés — forbidNonWhitelisted rejette le reste. */
export async function updateProfile(
  id: string,
  input: UpdateProfileInput,
): Promise<User> {
  const { avatarFile, ...fields } = input

  if (avatarFile) {
    const form = new FormData()
    // FormData transporte des chaînes : on saute null et undefined, sinon
    // ils arrivent en « null » littéral côté serveur.
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        form.append(key, String(value))
      }
    })
    form.append('avatar', avatarFile)

    const { data } = await http.patch<ServerUser>(
      `/users/${id}`,
      form,
      multipartConfig,
    )
    return toUser(data)
  }

  const { data } = await http.patch<ServerUser>(`/users/${id}`, fields)
  return toUser(data)
}

export interface UpdateAccountInput {
  email?: string
  password?: string
}

/** Email et mot de passe. Toujours JSON — aucun fichier ici. Le mot de
    passe n'est jamais conservé côté client. */
export async function updateAccount(
  id: string,
  input: UpdateAccountInput,
): Promise<User> {
  const { data } = await http.patch<ServerUser>(`/users/${id}`, input)
  return toUser(data)
}

export interface FollowInput {
  id: string
  following: boolean
  // `loggedUser` retiré : identité portée par le token.
}

/** Suit / ne suit plus un user. 400 si la relation existe déjà, 404 si elle
    est absente lors d'un unfollow : deux façons de dire « c'est déjà l'état
    demandé », donc traitées en succès. */
export async function setFollow(input: FollowInput): Promise<boolean> {
  try {
    if (input.following) {
      await http.post(`/users/${input.id}/follow`)
    } else {
      await http.delete(`/users/${input.id}/unfollow`)
    }
    return input.following
  } catch (error) {
    if (isApiError(error) && (error.status === 400 || error.status === 404)) {
      return input.following
    }
    throw error
  }
}

/** Est-ce que je suis déjà cet utilisateur ? Le backend renvoie des relations
    Follow brutes : on cherche la cible dans mes abonnements. */
export async function fetchIsFollowing(
  currentUserId: string,
  targetId: string,
): Promise<boolean> {
  const { data } = await http.get<ServerFollow[]>(
    `/users/${currentUserId}/following`,
  )
  return data.some((f) => f.followingId === targetId)
}
