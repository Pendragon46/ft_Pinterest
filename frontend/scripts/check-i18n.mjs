#!/usr/bin/env node
// i18n parity guard: every leaf key must exist in en/fr/ar common.json with an
// identical key set. Exits non-zero on any difference so CI / a pre-commit hook
// blocks a missing or stray translation. Run: `node scripts/check-i18n.mjs`.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const LOCALES = resolve(here, '../src/lib/i18n/locales')
const LANGS = ['en', 'fr', 'ar']
const NS = 'common'

// Collect dotted leaf-key paths. Descend into arrays too (index becomes a path
// segment) so a language with a different number of legal sections / list items
// fails parity instead of passing on a matching top-level key.
const flatten = (value, path = '') => {
  if (value && typeof value === 'object') {
    const entries = Array.isArray(value)
      ? value.map((item, index) => [index, item])
      : Object.entries(value)
    return entries.flatMap(([key, child]) =>
      flatten(child, path ? `${path}.${key}` : String(key)),
    )
  }
  return [path]
}

const sets = {}
for (const lang of LANGS) {
  const raw = readFileSync(`${LOCALES}/${lang}/${NS}.json`, 'utf8')
  sets[lang] = new Set(flatten(JSON.parse(raw)))
}

const [ref, ...rest] = LANGS
let failed = false
for (const lang of rest) {
  const missing = [...sets[ref]].filter((k) => !sets[lang].has(k))
  const extra = [...sets[lang]].filter((k) => !sets[ref].has(k))
  if (missing.length || extra.length) {
    failed = true
    console.error(`✗ ${lang} vs ${ref}`)
    if (missing.length)
      console.error(`  missing (${missing.length}): ${missing.join(', ')}`)
    if (extra.length)
      console.error(`  extra (${extra.length}): ${extra.join(', ')}`)
  }
}

if (failed) {
  console.error('\ni18n parity check FAILED')
  process.exit(1)
}
console.log(`✓ i18n parity OK — ${sets[ref].size} keys × ${LANGS.join('/')}`)
