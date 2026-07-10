import { Search } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { SUGGESTED_QUERIES } from '../artwork.mock'

interface SearchOverlayProps {
  inputRef: RefObject<HTMLInputElement | null>
}

// Hero anchored to the world origin (see docs/ARCHITECTURE.md).
export function SearchOverlay({ inputRef }: SearchOverlayProps) {
  const { t } = useTranslation('common')
  const [query, setQuery] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // TODO(backend): navigate to results / filter the map by `query`.
  }

  return (
    <section className="pointer-events-auto absolute left-0 top-0 flex w-[min(480px,88vw)] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-6 text-center">
      <h1 className="font-serif text-4xl leading-tight text-neutral-900">
        {t('home.heroLine1')}
        <br />
        {t('home.heroLine2')}
      </h1>

      <form
        role="search"
        onSubmit={handleSubmit}
        className="flex w-full items-center gap-2 rounded-full border border-neutral-200 bg-neutral-100 p-2 transition duration-200 focus-within:scale-[1.02] focus-within:border-neutral-300 focus-within:bg-white focus-within:shadow-lg motion-reduce:transition-none"
      >
        <span aria-hidden="true" className="ps-2 text-neutral-400">
          <Search aria-hidden="true" className="size-5" />
        </span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
          }}
          placeholder={t('home.searchPlaceholder')}
          aria-label={t('home.searchPlaceholder')}
          className="min-w-0 flex-1 bg-transparent text-base text-neutral-900 outline-none placeholder:text-neutral-400"
        />
        <kbd className="hidden rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-500 sm:block">
          {t('home.searchShortcut')}
        </kbd>
        <button
          type="submit"
          className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          {t('home.searchAction')}
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm text-neutral-500">{t('home.suggestedLabel')}</span>
        {SUGGESTED_QUERIES.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => {
              setQuery(suggestion)
              inputRef.current?.focus()
            }}
            className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-700 transition duration-100 hover:border-neutral-300 hover:bg-neutral-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </section>
  )
}
