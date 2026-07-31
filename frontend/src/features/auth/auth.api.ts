import { http } from '@/lib/http'

import type { User } from './auth.types'

// A token on success, or per-field conflict keys (email / username taken). The
// backend answers 2xx in both cases so the browser logs no network error.
export type RegisterResult =
  | { ok: true; token: string }
  | { ok: false; fieldErrors?: Record<string, string> }

export interface RegisterInput {
  email: string
  username: string
  password: string
  fullname?: string
  bio?: string
}

// null = bad credentials (backend answers 2xx); a thrown error is a real fault.
export async function login(
  email: string,
  password: string,
): Promise<string | null> {
  const { data } = await http.post<{ access_token?: string; error?: string }>(
    '/auth/login',
    { email, password },
  )
  return data.access_token ?? null
}

export async function register(input: RegisterInput): Promise<RegisterResult> {
  const { data } = await http.post<{
    access_token?: string
    fieldErrors?: Record<string, string>
  }>('/auth/register', input)
  return data.access_token
    ? { ok: true, token: data.access_token }
    : { ok: false, fieldErrors: data.fieldErrors }
}

// Resolves the current user from the stored token (the request interceptor adds
// the Authorization header). Used on startup to restore the session.
export async function fetchMe(): Promise<User> {
  const { data } = await http.get<User>('/auth/me')
  return data
}
