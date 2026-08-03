import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { Logo } from '@/components/ui/Logo'
import { AuthButton } from '@/features/auth/components/AuthButton'

import { LEGAL } from './legal.config'

interface LegalSection {
  heading: string
  body: string
}

interface LegalPageProps {
  /** Which legal document to render; also the i18n namespace under `common`. */
  doc: 'privacy' | 'terms'
}

/**
 * Shared shell for the Privacy Policy and Terms of Service pages: a branded
 * gradient header, a sticky "Table of content" that scroll-spies the active
 * section, and the numbered sections. Interpolated facts (contact, jurisdiction,
 * age, date) come from a single config so all three languages stay in sync.
 */
export function LegalPage({ doc }: LegalPageProps) {
  const { t, i18n } = useTranslation('common')

  // returnObjects gives the whole array; the bodies carry `{{var}}` placeholders
  // that we fill from the single legal config (a dynamic `t()` key can't be typed).
  const sections = t(`${doc}.sections`, {
    returnObjects: true,
  }) as unknown as LegalSection[]
  const facts: Record<string, string> = {
    contactEmail: LEGAL.contactEmail,
    jurisdiction: LEGAL.jurisdiction,
    minAge: String(LEGAL.minAge),
  }
  const fill = (text: string): string =>
    text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => facts[key] ?? `{{${key}}}`)

  const [activeIndex, setActiveIndex] = useState(0)
  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  const visible = useRef<Set<number>>(new Set())

  // Scroll-spy: the topmost section within the reading band becomes active. The
  // observer callback runs off the render path, so no setState-in-render.
  useEffect(() => {
    visible.current = new Set()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.index)
          if (entry.isIntersecting) visible.current.add(index)
          else visible.current.delete(index)
        }
        if (visible.current.size > 0) {
          const top = Math.min(...visible.current)
          setActiveIndex((current) => (current === top ? current : top))
        }
      },
      { rootMargin: '-20% 0px -75% 0px', threshold: 0 },
    )
    for (const el of sectionRefs.current) if (el) observer.observe(el)
    return () => {
      observer.disconnect()
    }
    // Rebind on language change too: translated headings re-key the sections, so
    // their DOM nodes remount and the observer must observe the new ones.
  }, [doc, i18n.language])

  const goToSection = (index: number) => {
    const el = sectionRefs.current[index]
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    setActiveIndex(index)
  }

  return (
    <main className="min-h-svh bg-white">
      <header className="bg-gradient-to-br from-neutral-950 from-30% via-[#252c55] via-70% to-[#a9b5ea] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 pt-5">
          <Link
            to="/"
            aria-label={t('app.name')}
            className="inline-flex cursor-pointer items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Logo withWordmark className="text-white" />
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher tone="light" />
            <AuthButton />
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 pb-12 pt-10">
          <Link
            to="/"
            aria-label={t('legal.back')}
            className="-ms-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
          >
            <ArrowLeft aria-hidden="true" className="size-6 rtl:rotate-180" />
          </Link>
          <h1 className="font-serif text-4xl">{t(`${doc}.title`)}</h1>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-x-12 gap-y-8 px-6 py-12 md:grid-cols-[15rem_1fr]">
        <nav aria-label={t(`${doc}.toc`)} className="hidden md:block">
          <div className="sticky top-8">
            <p className="mb-4 font-serif text-lg text-neutral-900">
              {t(`${doc}.toc`)}
            </p>
            <ul className="flex flex-col">
              {sections.map((section, index) => (
                <li key={section.heading}>
                  <button
                    type="button"
                    onClick={() => {
                      goToSection(index)
                    }}
                    aria-current={activeIndex === index ? 'true' : undefined}
                    className={`w-full cursor-pointer rounded-sm border-s-2 py-1.5 ps-3 text-start text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 motion-reduce:transition-none ${
                      activeIndex === index
                        ? 'border-neutral-900 font-medium text-neutral-900'
                        : 'border-transparent text-neutral-400 hover:text-neutral-700'
                    }`}
                  >
                    {section.heading}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="min-w-0">
          <p className="text-sm text-neutral-400">
            {t(`${doc}.updated`, { date: LEGAL.lastUpdated })}
          </p>
          <p className="mt-2 text-lg text-neutral-600">{t(`${doc}.subtitle`)}</p>

          <div className="mt-10 flex flex-col gap-10">
            {sections.map((section, index) => (
              <section
                key={section.heading}
                id={`${doc}-section-${index}`}
                data-index={index}
                ref={(el) => {
                  sectionRefs.current[index] = el
                }}
                aria-labelledby={`${doc}-heading-${index}`}
                className="scroll-mt-8"
              >
                <h2
                  id={`${doc}-heading-${index}`}
                  className="mb-3 font-serif text-2xl text-neutral-900"
                >
                  {section.heading}
                </h2>
                <p className="leading-relaxed text-neutral-700">
                  {fill(section.body)}
                </p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
