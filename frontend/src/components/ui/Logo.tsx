import { useTranslation } from 'react-i18next'
import logo from '@/assets/picto.svg'

interface LogoProps {
  withWordmark?: boolean
  className?: string
}

export function Logo({ withWordmark = false, className = '' }: LogoProps) {
  const { t } = useTranslation('common')

  return (
    <span className={`inline-flex items-center gap-[0.35em] ${className}`}>
      <img
        src={logo}
        alt="Atlaas"
        className="size-[1.15em]"
      />

      {withWordmark && (
        <span className="font-serif">{t('app.name')}</span>
      )}
    </span>
  )
}