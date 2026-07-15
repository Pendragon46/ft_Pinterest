import axios from 'axios'
import type { AxiosInstance } from 'axios'

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

// TODO(backend): inject the JWT here once POST /auth/login + GET /auth/me land,
// then delete every `loggedUser` field from mutation bodies (BACKEND_INTEGRATION
// §D.3). Left as a pass-through so the seam is already in place.
http.interceptors.request.use((config) => config)

// The one place that turns any transport/HTTP failure into an ApiError, so
// fetchers and optimistic mutations always reject with the same shape and the
// toast/form layer can map it to i18n keys uniformly.
http.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(normaliseError(error)),
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
