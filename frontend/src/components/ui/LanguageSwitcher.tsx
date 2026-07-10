import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { AppLanguage } from '@/lib/i18n/config'
import { useLanguage } from '@/lib/i18n/useLanguage'

// Compact language pill (EN/FR/AR); native <select> keeps it keyboard/AT-accessible.
export function LanguageSwitcher() {
  const { t } = useTranslation('common')
  const { language, languages, setLanguage } = useLanguage()

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t('language.label')}</span>
      <select
        value={language}
        onChange={(event) => {
          void setLanguage(event.target.value as AppLanguage)
        }}
        className="cursor-pointer appearance-none bg-transparent pe-5 text-sm font-medium uppercase text-neutral-900 outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
      >
        {(Object.keys(languages) as AppLanguage[]).map((code) => (
          <option key={code} value={code}>
            {code.toUpperCase()}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute end-0 size-4 text-neutral-500"
      />
    </label>
  )
}
