import axios from 'axios'
import type { AxiosInstance } from 'axios'

import { useAuthStore } from '@/features/auth/auth.store'
import { tokenStore } from '@/features/auth/token'

// The single HTTP client for the whole app; base URL via VITE_API_URL, JSON by
// default. Wiring the backend only swaps mock fetcher bodies to call this —
// signatures and query keys never change (docs/BACKEND_INTEGRATION.md §D.1).
export const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Normalised failure shape every caller relies on. `fieldErrors` maps a DTO
// field → message so a 400/409 lands on the right input, mapped in one place.
export interface ApiError {
  status: number
  message: string
  fieldErrors?: Record<string, string>
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    'message' in value
  )
}

// Attach the bearer token when stored; identity travels in the Authorization
// header, so mutation bodies no longer need `loggedUser` (BACKEND_INTEGRATION §D.3).
http.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// A 401 here means "bad credentials", not "session expired" — clearing the
// session on a login failure would be wrong.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register']

// The one place that turns any transport/HTTP failure into an ApiError, so every
// caller rejects with the same shape. A 401 on a normal request means the token
// expired: drop the session so gated pages redirect.
http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const url = error.config?.url ?? ''
      if (!AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint))) {
        tokenStore.clear()
        useAuthStore.getState().logout()
      }
    }
    return Promise.reject(normaliseError(error))
  },
)

// Nest's ValidationPipe answers `message: ["fullname must be shorter…", …]`,
// one sentence per broken rule prefixed by its DTO field. Splitting the field
// back out lets a 400 land on the right input. English-only, so callers
// translate by field name (see FIELD_ERROR_KEY).
function fieldErrorsFromMessages(
  messages: string[],
): Record<string, string> | undefined {
  const found: Record<string, string> = {}
  for (const line of messages) {
    const first = line.split(' ')[0]
    // Only a leading bare identifier is a field name; anything else is prose.
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(first)) continue
    // Custom DTO messages capitalise the field ("Comment must be at most…"),
    // the default ones do not ("comment must be…"). Normalise so both match.
    const field = first.charAt(0).toLowerCase() + first.slice(1)
    if (!(field in found)) found[field] = line
  }
  return Object.keys(found).length > 0 ? found : undefined
}

function normaliseError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0
    const data = error.response?.data as
      | { message?: string | string[]; fieldErrors?: Record<string, string> }
      | undefined
    const raw = data?.message
    // Nest ValidationPipe returns message as string[]; flatten to one line.
    const message = Array.isArray(raw)
      ? raw.join(' ')
      : raw || error.message || 'errors.network'
    const fieldErrors =
      data?.fieldErrors ??
      (Array.isArray(raw) ? fieldErrorsFromMessages(raw) : undefined)
    return {
      status,
      message,
      ...(fieldErrors ? { fieldErrors } : {}),
    }
  }
  return { status: 0, message: 'errors.network' }
}

// Content-Type `undefined` so axios drops its JSON default and the browser sets
// « multipart/form-data; boundary=… » itself — a manual header kills the boundary.
export const multipartConfig = {
  headers: { 'Content-Type': undefined },
} as const
