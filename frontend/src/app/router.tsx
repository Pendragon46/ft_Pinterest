import { useCallback } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { DevNav } from '@/components/dev/DevNav'
import { Modal } from '@/components/ui/Modal'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { RegisterPage } from '@/pages/RegisterPage'

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
      {/* TEMPORARY: remove DevNav before production. */}
      <DevNav />

      {/* Main routes: when a modal is open, keep rendering the background page. */}
      <Routes location={background ?? location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Modal routes: rendered on top only when we arrived with a background. */}
      {background ? (
        <Routes>
          <Route
            path="/login"
            element={
              <Modal isOpen onClose={closeModal} labelledBy="login-title">
                <LoginPage />
              </Modal>
            }
          />
          <Route
            path="/register"
            element={
              <Modal isOpen onClose={closeModal} labelledBy="register-title">
                <RegisterPage />
              </Modal>
            }
          />
        </Routes>
      ) : null}
    </>
  )
}
