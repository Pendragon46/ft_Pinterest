import { useTranslation } from 'react-i18next'

import { languageNames, type AppLanguage } from './config'

// Thin wrapper over react-i18next for reading and changing the active language.
export function useLanguage() {
  const { i18n } = useTranslation()
  const language = (i18n.resolvedLanguage ?? 'en') as AppLanguage

  return {
    language,
    languages: languageNames,
    dir: i18n.dir(),
    setLanguage: (lng: AppLanguage) => i18n.changeLanguage(lng),
  }
}
