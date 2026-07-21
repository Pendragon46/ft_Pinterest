import { ChevronDown, LogOut, Plus, Settings, User as UserIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import { useAuthStore } from '../auth.store'

// Shared pill; neutral-500 keeps the white text above WCAG AA contrast.
// h-10 matches the other floating chrome pills (logo, language, refocus, footer).
const PILL =
  'inline-flex h-10 items-center rounded-full bg-neutral-500 text-sm font-medium text-white transition-colors hover:bg-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2'

// One account-menu row: icon + label, full-width, ≥44px touch target.
const ITEM =
  'flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none motion-reduce:transition-none'

export function AuthButton() {
  const { t } = useTranslation('common')
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  // While open: close on a press outside the menu, or on Escape (which also
  // returns focus to the trigger so keyboard users aren't stranded).
  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Logged out → link that opens the login modal over the current page.
  if (user === null) {
    return (
      <Link
        to="/login"
        state={{ background: location }}
        className={`${PILL} px-4`}
      >
        {t('actions.signIn')}
      </Link>
    )
  }

  // Logged in → avatar + username pill that toggles the account menu.
  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((value) => !value)
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${PILL} gap-2 pe-4 ps-1`}
      >
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
            {(user.fullname ?? user.username).charAt(0).toUpperCase()}
          </span>
        )}
        <span className="max-w-[7rem] truncate sm:max-w-[10rem]">
          {user.fullname ?? user.username}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`size-4 text-neutral-200 transition-transform motion-reduce:transition-none ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={t('auth.menuLabel')}
          className="absolute end-0 top-full z-20 mt-2 w-56 origin-top animate-reveal overflow-hidden rounded-2xl border border-neutral-200 bg-white/95 py-1 text-start shadow-xl backdrop-blur motion-reduce:animate-none"
        >
          <div className="px-4 py-3">
            <p className="truncate text-sm font-medium text-neutral-900">
              {user.fullname ?? user.username}
            </p>
            <p className="truncate text-xs text-neutral-500">
              @{user.username}
            </p>
          </div>
          <div aria-hidden="true" className="h-px bg-neutral-100" />
          <Link
            to="/profile"
            role="menuitem"
            onClick={() => {
              setOpen(false)
            }}
            className={ITEM}
          >
            <UserIcon aria-hidden="true" className="size-4 text-neutral-400" />
            {t('profile.title')}
          </Link>
          <Link
            to="/settings"
            role="menuitem"
            onClick={() => {
              setOpen(false)
            }}
            className={ITEM}
          >
            <Settings aria-hidden="true" className="size-4 text-neutral-400" />
            {t('settings.title')}
          </Link>
          <Link
            to="/create"
            role="menuitem"
            onClick={() => {
              setOpen(false)
            }}
            className={ITEM}
          >
            <Plus aria-hidden="true" className="size-4 text-neutral-400" />
            {t('create.cta')}
          </Link>
          <div aria-hidden="true" className="h-px bg-neutral-100" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              logout()
            }}
            className={`${ITEM} text-red-600 hover:bg-red-50 focus-visible:bg-red-50`}
          >
            <LogOut aria-hidden="true" className="size-4 text-red-500" />
            {t('actions.signOut')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
