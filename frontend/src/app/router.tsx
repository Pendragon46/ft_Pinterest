import { useCallback } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { Modal } from '@/components/ui/Modal'
import { AdminPage } from '@/pages/AdminPage'
import { ArtworkPage } from '@/pages/ArtworkPage'
import { CreatePage } from '@/pages/CreatePage'
import { EditArtworkPage } from '@/pages/EditArtworkPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { OAuthCallbackPage } from '@/pages/OAuthCallbackPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { RegisterPage } from '@/pages/RegisterPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TermsPage } from '@/pages/TermsPage'

export function AppRouter() {
  const location = useLocation()
  const navigate = useNavigate()
  // A modal route stashes the page it was opened from in location.state.background.
  const background = (
    location.state as { background?: ReturnType<typeof useLocation> } | null
  )?.background
  const closeModal = useCallback(() => {
    navigate(-1)
  }, [navigate])

  return (
    <>
      {/* Main routes: keep rendering the background page while a modal is open. */}
      <Routes location={background ?? location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/:userId" element={<ProfilePage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/artwork/:id" element={<ArtworkPage />} />
        <Route path="/artwork/:id/edit" element={<EditArtworkPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Modal routes: rendered on top only when we arrived with a background. */}
      {background ? (
        <Routes>
          <Route
            path="/artwork/:id"
            element={
              <Modal isOpen onClose={closeModal} labelledBy="artwork-title" size="xl">
                <ArtworkPage />
              </Modal>
            }
          />
          <Route
            path="/login"
            element={
              <Modal isOpen onClose={closeModal} labelledBy="login-title" size="wide">
                <LoginPage />
              </Modal>
            }
          />
          <Route
            path="/register"
            element={
              <Modal isOpen onClose={closeModal} labelledBy="register-title" size="wide">
                <RegisterPage />
              </Modal>
            }
          />
        </Routes>
      ) : null}
    </>
  )
}
