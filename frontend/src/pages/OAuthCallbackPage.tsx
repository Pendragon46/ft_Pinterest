import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { fetchMe } from '@/features/auth/auth.api'
import { useAuthStore } from '@/features/auth/auth.store'
import { tokenStore } from '@/features/auth/token'
import { useToastStore } from '@/lib/toast.store'

export function OAuthCallbackPage() {
  const navigate = useNavigate()
  const storeLogin = useAuthStore((s) => s.login)
  const showToast = useToastStore((s) => s.show)
  const { t } = useTranslation('common')
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    tokenStore.set(token)
    fetchMe()
      .then((user) => {
        storeLogin(user)
        navigate('/', { replace: true })
      })
      .catch(() => {
        tokenStore.clear()
        showToast({ variant: 'error', message: t('errors.network') })
        navigate('/login', { replace: true })
      })
  }, [navigate, storeLogin, showToast, t])

  return (
    <div className="flex min-h-svh items-center justify-center bg-white">
      <span
        role="status"
        aria-label={t('actions.signIn')}
        className="size-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900"
      />
    </div>
  )
}
