import axios from 'axios'
import type { AxiosInstance } from 'axios'

import { useAuthStore } from '@/features/auth/auth.store'
import { tokenStore } from '@/features/auth/token'

// The single HTTP client for the whole app. Wiring the backend means swapping
// each mock fetcher body to call this instance — signatures, query keys and
// component code never change (see docs/BACKEND_INTEGRATION.md §D.1).
// Base URL is provisioned via VITE_API_URL; JSON by default.
export const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Normalised failure shape every caller can rely on. `fieldErrors` maps a DTO
// field → message (or i18n key) so a 400/409 lands on the right input, mapped in
// exactly one place instead of re-parsed per form.
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

// Attach the bearer token to every request when one is stored. The identity now
// travels in the Authorization header, which is why mutation bodies no longer
// need `loggedUser` (BACKEND_INTEGRATION §D.3).
http.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auth endpoints where a 401 means "bad credentials", not "session expired" —
// clearing the session for these would be wrong (login failure is not a logout).
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register']

// The one place that turns any transport/HTTP failure into an ApiError, so
// fetchers and optimistic mutations always reject with the same shape and the
// toast/form layer can map it to i18n keys uniformly. A 401 on a normal request
// means the token is gone/expired: drop the session so gated pages redirect.
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

// Nest's ValidationPipe answers `message: ["fullname must be shorter than or
// equal to 50 characters", …]` — one sentence per broken rule, each prefixed by
// its DTO field. Splitting the field back out is what lets a 400 land on the
// right input instead of becoming a generic "network error" toast plus a raw
// console 400. The sentence itself is English-only, so callers translate by
// field name (see FIELD_ERROR_KEY) rather than displaying the value here.
function fieldErrorsFromMessages(
  messages: string[],
): Record<string, string> | undefined {
  const found: Record<string, string> = {}
  for (const line of messages) {
    const field = line.split(' ')[0]
    // Only a leading bare identifier is a field name; anything else is prose.
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field) && !(field in found)) {
      found[field] = line
    }
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

// Envoi de fichier. Content-Type à `undefined` pour que l'instance axios
// n'impose pas son défaut JSON : le navigateur pose alors lui-même
// « multipart/form-data; boundary=… ». Écrire l'en-tête à la main
// écraserait ce boundary et le serveur ne pourrait plus découper le corps.
export const multipartConfig = {
  headers: { 'Content-Type': undefined },
} as const
