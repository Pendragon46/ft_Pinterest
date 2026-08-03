// JWT en localStorage : lu en synchrone par l'intercepteur axios, survit au refresh.
const KEY = 'atlaas_token'

// A JWT past its `exp` is worthless: sending it only earns a 401 that the
// browser logs in red at boot. Decode the claim locally and treat an expired
// (or unparseable) token as absent, so no request — REST or socket — ever
// leaves with a dead token. The backend still validates every token it
// receives; this only spares the guaranteed-losing round-trip.
function isExpired(token: string): boolean {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    )
    const { exp } = JSON.parse(atob(padded)) as { exp?: number }
    return typeof exp === 'number' && exp * 1000 <= Date.now()
  } catch {
    return true
  }
}

export const tokenStore = {
  get: (): string | null => {
    const token = localStorage.getItem(KEY)
    if (token && isExpired(token)) {
      localStorage.removeItem(KEY)
      return null
    }
    return token
  },
  set: (token: string) => localStorage.setItem(KEY, token),
  clear: () => localStorage.removeItem(KEY),
}
