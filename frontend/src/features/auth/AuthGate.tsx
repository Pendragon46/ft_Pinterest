import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Spinner } from '@/components/ui/Spinner'

import { fetchMe } from './auth.api'
import { useAuthStore } from './auth.store'
import { tokenStore } from './token'

interface AuthGateProps {
  children: ReactNode
}

// Restores the session before the first render: if a token is stored, ask
// GET /auth/me who it belongs to and seed the store. Blocking until it resolves
// avoids a flash of the signed-out UI (and gated pages bouncing to /login) for a
// user who actually holds a valid token. A dead/expired token is cleared.
export function AuthGate({ children }: AuthGateProps) {
  const { t } = useTranslation('common')
  const login = useAuthStore((state) => state.login)
  // With no token there is nothing to restore, so we start ready — this also
  // keeps the only setReady call inside an async callback (never synchronous in
  // the effect body, which the set-state-in-effect lint rule forbids).
  const [ready, setReady] = useState(() => tokenStore.get() === null)

  useEffect(() => {
    if (tokenStore.get() === null) return
    let alive = true
    fetchMe()
      .then((user) => {
        if (alive) login(user)
      })
      .catch(() => {
        tokenStore.clear() // token rejected → start signed out
      })
      .finally(() => {
        if (alive) setReady(true)
      })
    return () => {
      alive = false
    }
  }, [login])

  if (!ready) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="grid min-h-screen place-items-center bg-neutral-50 text-neutral-500"
      >
        <Spinner size="md" />
        <span className="sr-only">{t('auth.loadingSession')}</span>
      </div>
    )
  }

  return <>{children}</>
}
