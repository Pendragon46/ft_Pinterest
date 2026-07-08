import { useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { SUGGESTED_QUERIES } from '../artwork.mock'

interface SearchOverlayProps {
  /** The camera hook focuses this input on Ctrl+K / Refocus. */
  inputRef: RefObject<HTMLInputElement | null>
}

// The hero at the heart of the map: the two-line serif line, the search pill
// and the trending chips. It is ANCHORED TO THE WORLD at the origin (it lives
// inside the transformed plane), so it pans and scales with the canvas and
// naturally sits in the card-free HERO_ZONE. Centered on (0,0) via a
// translate(-50%, -50%) on its own box.
export function SearchOverlay({ inputRef }: SearchOverlayProps) {
  const { t } = useTranslation('common')
  const [query, setQuery] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // TODO(backend): navigate to results / filter the map by `query`.
  }

  return (
    <section
      // Sits on the plane, but its contents must stay clickable while the
      // plane behind stays draggable — pointer-events re-enabled on the box.
      className="pointer-events-auto absolute left-0 top-0 flex w-[min(620px,86vw)] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-6 text-center"
    >
      <h1 className="font-serif text-4xl leading-tight text-neutral-900 sm:text-5xl">
        {t('home.heroLine1')}
        <br />
        {t('home.heroLine2')}
      </h1>

      <form
        role="search"
        onSubmit={handleSubmit}
        className="flex w-full items-center gap-2 rounded-full border border-neutral-200 bg-neutral-100/95 p-2 shadow-sm backdrop-blur"
      >
        <span aria-hidden="true" className="ps-2 text-neutral-400">
          <SearchIcon />
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
        {/* The Ctrl+K affordance, hidden on small screens where there's no
            physical keyboard to speak of. */}
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
        <span className="text-sm text-neutral-500">
          {t('home.suggestedLabel')}
        </span>
        {SUGGESTED_QUERIES.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => {
              setQuery(suggestion)
              inputRef.current?.focus()
            }}
            className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </section>
  )
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
      className="size-5"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  )
}
