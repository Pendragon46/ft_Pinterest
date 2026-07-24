import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import { BrowserRouter } from 'react-router-dom'

import { ToastViewport } from '@/components/ui/ToastViewport'
import { AuthGate } from '@/features/auth/AuthGate'
import { PresenceProvider } from '@/features/presence/PresenceProvider'
import { i18n } from '@/lib/i18n'

// Single QueryClient, stable for the whole app lifetime.
const queryClient = new QueryClient()

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <AuthGate>
            <PresenceProvider>{children}</PresenceProvider>
          </AuthGate>
          <ToastViewport />
        </BrowserRouter>
      </I18nextProvider>
    </QueryClientProvider>
  )
}
