import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import { useAuthStore } from '../auth.store'

// Shared pill styling (matches the mockup: gray rounded-full pill, light text).
// neutral-500 keeps the white text above the WCAG AA contrast ratio.
const PILL =
  'inline-flex items-center rounded-full bg-neutral-500 font-medium text-white transition-colors hover:bg-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2'

export function AuthButton() {
  const { t } = useTranslation('common')
  const location = useLocation()
  const user = useAuthStore((state) => state.user)

  // Logged out → pill link that opens the login modal over the current page.
  if (user === null) {
    return (
      <Link
        to="/login"
        state={{ background: location }}
        className={`${PILL} px-6 py-3`}
      >
        {t('actions.signIn')}
      </Link>
    )
  }

  // Logged in → avatar + username pill. The chevron hints at the dropdown menu
  // to come (purely decorative for now — the click does nothing yet).
  return (
    <button type="button" className={`${PILL} gap-2.5 py-1.5 pe-5 ps-1.5`}>
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={t('auth.avatarAlt', { username: user.username })}
          className="size-8 rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-neutral-700 text-sm font-semibold text-white"
        >
          {user.username.charAt(0).toUpperCase()}
        </span>
      )}
      <span>{user.username}</span>
      <span aria-hidden="true" className="text-neutral-200">
        ⌄
      </span>
    </button>
  )
}
