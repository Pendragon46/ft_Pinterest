import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import { BrowserRouter } from 'react-router-dom'

import { ToastViewport } from '@/components/ui/ToastViewport'
import { ArtworkSyncProvider } from '@/features/artworks/ArtworkSyncProvider'
import { AuthGate } from '@/features/auth/AuthGate'
import { ChatProvider } from '@/features/chat/ChatProvider'
import { PresenceProvider } from '@/features/presence/PresenceProvider'
import { i18n } from '@/lib/i18n'
import { isApiError } from '@/lib/http'

// Single QueryClient for the app. A 4xx is a verdict, not a hiccup — retrying
// only multiplies console noise (a deleted artwork used to log four 404s), so
// retry only what a retry can fix; staleTime keeps returning to the tab cheap.
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
              <ArtworkSyncProvider>
                <ChatProvider>{children}</ChatProvider>
              </ArtworkSyncProvider>
            </PresenceProvider>
          </AuthGate>
          <ToastViewport />
        </BrowserRouter>
      </I18nextProvider>
    </QueryClientProvider>
  )
}
