import { useTranslation } from 'react-i18next'

import type { AppLanguage } from '@/lib/i18n/config'
import { useLanguage } from '@/lib/i18n/useLanguage'

// Minimal language selector (native <select>). Swap for the design-system
// dropdown once it exists. Uses logical spacing so it works in LTR and RTL.
export function LanguageSwitcher() {
  const { t } = useTranslation('common')
  const { language, languages, setLanguage } = useLanguage()

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-neutral-500">{t('language.label')}</span>
      <select
        className="rounded-md border border-neutral-300 bg-transparent px-2 py-1"
        value={language}
        onChange={(event) => {
          void setLanguage(event.target.value as AppLanguage)
        }}
      >
        {(Object.entries(languages) as [AppLanguage, string][]).map(
          ([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ),
        )}
      </select>
    </label>
  )
}
