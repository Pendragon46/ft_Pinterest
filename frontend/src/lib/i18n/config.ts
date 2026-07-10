// Shared i18n config. Add a language (code + endonym) and a matching ./locales folder.
export const languageNames = {
  en: 'English',
  fr: 'Français',
  ar: 'العربية',
} as const

export type AppLanguage = keyof typeof languageNames

export const supportedLngs = Object.keys(languageNames) as AppLanguage[]

export const fallbackLng: AppLanguage = 'en'

export const defaultNS = 'common' as const
