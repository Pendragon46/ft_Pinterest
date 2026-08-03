import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import { BrowserRouter } from 'react-router-dom'

import { ToastViewport } from '@/components/ui/ToastViewport'
import { AuthGate } from '@/features/auth/AuthGate'
import { ChatProvider } from '@/features/chat/ChatProvider'
import { PresenceProvider } from '@/features/presence/PresenceProvider'
import { i18n } from '@/lib/i18n'
import { isApiError } from '@/lib/http'

// Single QueryClient, stable for the whole app lifetime.
// A 4xx is a verdict, not a hiccup — retrying it only multiplies the console
// noise (one deleted artwork used to log four 404s). Retry what a retry can
// actually fix, and keep data fresh long enough that returning to the tab
// doesn't refetch the whole screen.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (isApiError(error) && error.status >= 400 && error.status < 500) {
          return false
        }
        return failureCount < 2
      },
    },
  },
})

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <AuthGate>
            <PresenceProvider>
              <ChatProvider>{children}</ChatProvider>
            </PresenceProvider>
          </AuthGate>
          <ToastViewport />
        </BrowserRouter>
      </I18nextProvider>
    </QueryClientProvider>
  )
}
