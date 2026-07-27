// JWT en localStorage : lu en synchrone par l'intercepteur axios, survit au refresh.
const KEY = 'atlaas_token'

export const tokenStore = {
  get: (): string | null => localStorage.getItem(KEY),
  set: (token: string) => localStorage.setItem(KEY, token),
  clear: () => localStorage.removeItem(KEY),
}
