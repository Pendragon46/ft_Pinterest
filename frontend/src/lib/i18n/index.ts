import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import { defaultNS, fallbackLng, supportedLngs } from './config'
import ar from './locales/ar/common.json'
import en from './locales/en/common.json'
import fr from './locales/fr/common.json'

// All translations are bundled (no async backend), so `t()` is ready on first render.
export const resources = {
  en: { common: en },
  fr: { common: fr },
  ar: { common: ar },
} as const

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng,
    supportedLngs,
    defaultNS,
    // React already escapes output — disable i18next's own escaping.
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'atlaas.lang',
    },
    // Resources are synchronous, so we don't need a Suspense boundary.
    react: { useSuspense: false },
  })

// Mirror the active language onto <html lang/dir> so CSS logical properties
// (ps-*/pe-*/ms-*/me-*, text-start/end) flip automatically for RTL languages.
function syncHtmlLangDir(lng: string | undefined): void {
  const language = lng ?? fallbackLng
  document.documentElement.lang = language
  document.documentElement.dir = i18n.dir(language)
}

syncHtmlLangDir(i18n.resolvedLanguage)
i18n.on('languageChanged', syncHtmlLangDir)

export default i18n
