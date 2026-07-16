import { useTranslation } from 'react-i18next'

import { SUGGESTED_QUERIES } from '../artwork.mock'

interface SearchEmptyStateProps {
  onPick: (query: string) => void
}

// Shown when a search returns nothing: keeps the tone and offers the trending
// tags to relaunch. Wire into the search-results flow once search filters the
// map (currently a TODO(backend) in SearchOverlay).
export function SearchEmptyState({ onPick }: SearchEmptyStateProps) {
  const { t } = useTranslation('common')

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span aria-hidden="true" className="text-5xl">
        🧭
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-serif text-xl text-neutral-900">
          {t('search.emptyTitle')}
        </p>
        <p className="text-sm text-neutral-500">{t('search.emptyBody')}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {SUGGESTED_QUERIES.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => {
              onPick(suggestion)
            }}
            className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-700 transition duration-100 hover:border-neutral-300 hover:bg-neutral-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
