// Central i18n configuration shared by the init, the switcher and the hook.
// Add a language here (code + endonym) and drop a matching folder in ./locales.
export const languageNames = {
  en: 'English',
  fr: 'Français',
  ar: 'العربية',
} as const

export type AppLanguage = keyof typeof languageNames

export const supportedLngs = Object.keys(languageNames) as AppLanguage[]

export const fallbackLng: AppLanguage = 'en'

export const defaultNS = 'common' as const
