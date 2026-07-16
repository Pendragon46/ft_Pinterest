import { useTranslation } from 'react-i18next'

import { ATLAAS_MARK_PATHS, ATLAAS_MARK_VIEWBOX } from './atlaasMark'

interface LogoProps {
  withWordmark?: boolean
  className?: string
}

// The mark is drawn inline with `fill="currentColor"` so it follows the text
// colour of its context — dark on light chrome (home pill), white on the dark
// legal/404 headers. (An <img> of the white picto vanished on light backgrounds.)
export function Logo({ withWordmark = false, className = '' }: LogoProps) {
  const { t } = useTranslation('common')

  return (
    <span className={`inline-flex items-center gap-[0.35em] ${className}`}>
      <svg
        viewBox={ATLAAS_MARK_VIEWBOX}
        fill="currentColor"
        // With the wordmark the text names the brand, so the mark is decorative;
        // alone, the mark carries the accessible name.
        role={withWordmark ? undefined : 'img'}
        aria-hidden={withWordmark ? true : undefined}
        aria-label={withWordmark ? undefined : t('app.name')}
        className="size-[1.15em]"
      >
        {ATLAAS_MARK_PATHS.map((path) => (
          <path key={path.id} d={path.d} />
        ))}
      </svg>

      {withWordmark && <span className="font-serif">{t('app.name')}</span>}
    </span>
  )
}
