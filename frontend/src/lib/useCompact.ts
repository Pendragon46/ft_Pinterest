import { useTranslation } from 'react-i18next'

// Localised compact number formatting (12000 → "12K" / "12 k" / "١٢ ألف").
export function useCompact() {
  const { i18n } = useTranslation()
  return (value: number) =>
    new Intl.NumberFormat(i18n.language, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
}
