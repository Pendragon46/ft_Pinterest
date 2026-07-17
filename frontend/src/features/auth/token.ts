// The JWT lives in localStorage so the session survives a page refresh and the
// axios request interceptor can read it synchronously. Pragmatic for a 42
// project without SSR; a httpOnly cookie would be the stronger anti-XSS choice
// but needs CORS credentials + CSRF handling (see docs/BACKEND_INTEGRATION.md).
const KEY = 'atlaas_token'

export const tokenStore = {
  get: (): string | null => localStorage.getItem(KEY),
  set: (token: string) => localStorage.setItem(KEY, token),
  clear: () => localStorage.removeItem(KEY),
}
