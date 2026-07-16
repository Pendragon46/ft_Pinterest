import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { AppLanguage } from '@/lib/i18n/config'
import { useLanguage } from '@/lib/i18n/useLanguage'

interface LanguageSwitcherProps {
  /** 'light' for dark backgrounds (e.g. the legal header gradient). */
  tone?: 'dark' | 'light'
}

// Compact language pill (EN/FR/AR); native <select> keeps it keyboard/AT-accessible.
export function LanguageSwitcher({ tone = 'dark' }: LanguageSwitcherProps) {
  const { t } = useTranslation('common')
  const { language, languages, setLanguage } = useLanguage()
  const textClass = tone === 'light' ? 'text-white' : 'text-neutral-900'
  const chevronClass = tone === 'light' ? 'text-white/70' : 'text-neutral-500'
  // Tone-aware focus ring so keyboard focus stays visible on dark backgrounds.
  const ringClass =
    tone === 'light' ? 'focus-visible:ring-white' : 'focus-visible:ring-neutral-900'

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t('language.label')}</span>
      <select
        value={language}
        onChange={(event) => {
          void setLanguage(event.target.value as AppLanguage)
        }}
        className={`cursor-pointer appearance-none bg-transparent pe-5 text-sm font-medium uppercase outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${ringClass} ${textClass}`}
      >
        {(Object.keys(languages) as AppLanguage[]).map((code) => (
          <option key={code} value={code} className="text-neutral-900">
            {code.toUpperCase()}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className={`pointer-events-none absolute end-0 size-4 ${chevronClass}`}
      />
    </label>
  )
}
