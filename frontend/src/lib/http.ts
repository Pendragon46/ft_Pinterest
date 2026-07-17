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
    return {
      status,
      message,
      ...(data?.fieldErrors ? { fieldErrors: data.fieldErrors } : {}),
    }
  }
  return { status: 0, message: 'errors.network' }
}
