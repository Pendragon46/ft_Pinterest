import { http } from '@/lib/http'

import type { User } from './auth.types'

// Both login and register return a bearer token; register signs one too so a new
// account is logged in without a second round-trip (see backend AuthService).
interface AuthResponse {
  access_token: string
}

export interface RegisterInput {
  email: string
  username: string
  password: string
  fullname?: string
  bio?: string
}

export async function login(email: string, password: string): Promise<string> {
  const { data } = await http.post<AuthResponse>('/auth/login', {
    email,
    password,
  })
  return data.access_token
}

export async function register(input: RegisterInput): Promise<string> {
  const { data } = await http.post<AuthResponse>('/auth/register', input)
  return data.access_token
}

// Resolves the current user from the stored token (the request interceptor adds
// the Authorization header). Used on startup to restore the session.
export async function fetchMe(): Promise<User> {
  const { data } = await http.get<User>('/auth/me')
  return data
}
