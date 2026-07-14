import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FormEvent, KeyboardEvent, RefObject } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import {
  fetchContextualTags,
  fetchSuggestions,
  searchKeys,
} from '@/features/search/search.api'
import { recordSearch, resolveSearch } from '@/features/search/search.mock'
import type { Niche, Suggestion } from '@/features/search/search.types'

import { HeroTitle } from './HeroTitle'

interface SearchOverlayProps {
  inputRef: RefObject<HTMLInputElement | null>
  /** The active niche (drives the title + pre-fill), or null at home. */
  niche: Niche | null
  /** Submit a resolved term (Enter / Go / tag / suggestion) — same path (§4.5). */
  onSubmit?: (term: string) => void
  /** Clearing the bar while in a niche returns to the global map (§6.4). */
  onExit?: () => void
}

// Hero anchored to the world origin — it pans and zooms with the map. On focus it
// opens a rich categorised autocomplete below the bar (Search spec §2–4, §7). The
// tags and dropdown float (absolute) so opening them never shifts the title/bar.
export function SearchOverlay({
  inputRef,
  niche,
  onSubmit,
  onExit,
}: SearchOverlayProps) {
  const { t } = useTranslation('common')
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(false)
  const [highlight, setHighlight] = useState(-1)

  // Pre-fill the bar with the niche label when a niche is entered, reset on leave
  // (§6.4). Adjusting state during render (not an effect) keeps it lint-clean.
  const nicheSlug = niche?.slug ?? null
  const [lastNicheSlug, setLastNicheSlug] = useState<string | null>(null)
  if (nicheSlug !== lastNicheSlug) {
    setLastNicheSlug(nicheSlug)
    setHighlight(-1)
    if (niche) {
      // Entering a niche: pre-fill with its label and drop focus.
      setQuery(t(`category.${niche.slug}`))
      setActive(false)
    } else {
      // Leaving (the bar was cleared): empty it but keep the focus state so the
      // user can type a fresh query straight away without re-focusing.
      setQuery('')
    }
  }

  const trimmed = query.trim()
  const suggestionsQuery = useQuery({
    queryKey: searchKeys.suggestions(trimmed),
    queryFn: () => fetchSuggestions(trimmed),
    enabled: active && trimmed.length > 0,
    staleTime: 60_000,
  })
  const tagsQuery = useQuery({
    queryKey: searchKeys.contextualTags(),
    queryFn: fetchContextualTags,
    staleTime: 60_000,
  })

  const data = suggestionsQuery.data
  const groups = data ?? { disciplines: [], creators: [] }
  // Flatten across categories for one keyboard cursor (§4.4).
  const flat = useMemo(
    () => (data ? [...data.disciplines, ...data.creators] : []),
    [data],
  )
  // Clamp the cursor at read time so a shrinking result set can't point past it.
  const activeIndex = highlight >= 0 && highlight < flat.length ? highlight : -1
  const hasSuggestions = flat.length > 0
  const showDropdown = active && trimmed.length > 0
  const showTags = !active || trimmed.length === 0

  const close = () => {
    setActive(false)
    setHighlight(-1)
    inputRef.current?.blur()
  }

  const submit = (term: string) => {
    const value = term.trim()
    if (!value) return
    recordSearch(value)
    onSubmit?.(value)
    close()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (activeIndex >= 0) submit(flat[activeIndex].term)
    else submit(query)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      close()
      return
    }
    if (!hasSuggestions) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setHighlight((h) => {
        const cur = h >= 0 && h < flat.length ? h : -1
        if (cur === -1) return step === 1 ? 0 : flat.length - 1
        return (cur + step + flat.length) % flat.length
      })
    }
  }

  const suggestionLabel = (s: Suggestion): string =>
    s.kind === 'discipline' && s.categoryKey
      ? t(`category.${s.categoryKey}`)
      : (s.username ?? s.term)

  // Home tagline, or the niche's "Exploring {niche} Universe" (§5.2). Two lines,
  // "\n"-separated, so HeroTitle types across them.
  const titleText = niche
    ? `${t('search.exploringTitle1')}\n${t('search.exploringTitle2', {
        niche: t(`category.${niche.slug}`),
      })}`
    : `${t('home.heroLine1')}\n${t('home.heroLine2')}`

  return (
    <section className="pointer-events-auto absolute left-0 top-0 flex w-[min(480px,88vw)] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-6 text-center">
      <HeroTitle text={titleText} />

      <div className="relative w-full">
        <form
          role="search"
          onSubmit={handleSubmit}
          className="flex w-full items-center gap-2 rounded-full border border-neutral-200 bg-neutral-100 p-2 transition duration-200 focus-within:border-neutral-300 focus-within:bg-white focus-within:shadow-lg motion-reduce:transition-none"
        >
          <span aria-hidden="true" className="ps-2 text-neutral-400">
            <Search aria-hidden="true" className="size-5" />
          </span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => {
              const value = event.target.value
              setQuery(value)
              setHighlight(-1)
              // Emptying the bar while in a niche returns to the global map (§6.4).
              if (niche && value.trim() === '') onExit?.()
            }}
            onFocus={() => {
              setActive(true)
            }}
            onBlur={close}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls="search-suggestions"
            aria-autocomplete="list"
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

        {showDropdown ? (
          <div
            id="search-suggestions"
            // Keep the input focused while interacting so onBlur doesn't close first.
            onMouseDown={(event) => {
              event.preventDefault()
            }}
            className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-2xl border border-neutral-200 bg-white text-start shadow-xl"
          >
            {hasSuggestions ? (
              <ul role="listbox" className="max-h-[60vh] overflow-y-auto py-2">
                {groups.disciplines.length > 0 ? (
                  <SuggestionGroup
                    label={t('search.groupDisciplines')}
                    items={groups.disciplines}
                    flat={flat}
                    highlight={activeIndex}
                    labelOf={suggestionLabel}
                    onHover={setHighlight}
                    onPick={submit}
                  />
                ) : null}
                {groups.creators.length > 0 ? (
                  <SuggestionGroup
                    label={t('search.groupCreators')}
                    items={groups.creators}
                    flat={flat}
                    highlight={activeIndex}
                    labelOf={suggestionLabel}
                    onHover={setHighlight}
                    onPick={submit}
                  />
                ) : null}
              </ul>
            ) : suggestionsQuery.isPending ? (
              <p className="px-4 py-6 text-center text-sm text-neutral-400">
                {t('search.searching')}
              </p>
            ) : (
              <NearestRegion term={trimmed} onPick={submit} />
            )}
          </div>
        ) : null}

        {showTags ? (
          <div
            onMouseDown={(event) => {
              event.preventDefault()
            }}
            className="absolute inset-x-0 top-full mt-3 flex flex-wrap items-center justify-center gap-2"
          >
            <span className="text-sm text-neutral-500">
              {t('home.suggestedLabel')}
            </span>
            {(tagsQuery.data ?? []).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  submit(suggestion)
                }}
                className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-700 transition duration-100 hover:border-neutral-300 hover:bg-neutral-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

interface SuggestionGroupProps {
  label: string
  items: Suggestion[]
  flat: Suggestion[]
  highlight: number
  labelOf: (s: Suggestion) => string
  onHover: (index: number) => void
  onPick: (term: string) => void
}

// One labelled category of rows, each with a micro-preview (§4.1, §4.2).
function SuggestionGroup({
  label,
  items,
  flat,
  highlight,
  labelOf,
  onHover,
  onPick,
}: SuggestionGroupProps) {
  return (
    <li>
      <p className="px-4 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <ul>
        {items.map((item) => {
          const index = flat.indexOf(item)
          const isActive = index === highlight
          return (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={isActive}
                onMouseEnter={() => {
                  onHover(index)
                }}
                onClick={() => {
                  onPick(item.term)
                }}
                className={`flex min-h-11 w-full items-center gap-3 px-4 py-2 text-start transition-colors motion-reduce:transition-none ${
                  isActive ? 'bg-neutral-100' : 'hover:bg-neutral-50'
                }`}
              >
                {item.kind === 'creator' ? (
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: item.previews[0] }}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  >
                    {labelOf(item).charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <span aria-hidden="true" className="flex shrink-0 gap-0.5">
                    {item.previews.map((colour, i) => (
                      <span
                        key={i}
                        style={{ backgroundColor: colour }}
                        className="size-5 rounded-[4px]"
                      />
                    ))}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">
                  <span className="text-sm text-neutral-900">{labelOf(item)}</span>
                  {item.kind === 'creator' && item.handle ? (
                    <span className="text-sm text-neutral-400"> @{item.handle}</span>
                  ) : null}
                  {item.kind === 'discipline' && item.path?.length ? (
                    <span className="text-xs text-neutral-400">
                      {' › '}
                      {item.path.join(' › ')}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </li>
  )
}

interface NearestRegionProps {
  term: string
  onPick: (term: string) => void
}

// No match → point at the nearest region, in the product's tone (§7). Never a cold
// "No results".
function NearestRegion({ term, onPick }: NearestRegionProps) {
  const { t } = useTranslation('common')
  const niche = resolveSearch(term).niche

  return (
    <div className="flex flex-col items-start gap-3 px-4 py-5">
      <p className="text-sm text-neutral-500">{t('search.emptyBody')}</p>
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-neutral-400">
          {t('search.nearestRegion')}
        </span>
        <button
          type="button"
          onClick={() => {
            onPick(niche.slug)
          }}
          className="rounded-full bg-neutral-900 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          {t(`category.${niche.slug}`)}
        </button>
      </div>
    </div>
  )
}
