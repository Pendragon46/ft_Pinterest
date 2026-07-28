#!/usr/bin/env node
/**
 * seed-network.mjs — publie le contenu visuel-cohérent sur un réseau d'auteurs.
 *
 * Entrées (générées en amont) :
 *   - scratchpad/vision-manifest.json  → métadonnées des images (analyse visuelle)
 *   - scratchpad/video-manifest.json   → métadonnées des .mp4 (depuis les noms)
 *   - seed-credentials.json            → 6 comptes existants (email + mot de passe)
 *
 * Pipeline : register (409→login) → publish (POST /artworks, champ « art ») réparti
 * par discipline → graphe de follows (mutuels + à sens unique) → résumé + creds.
 *
 * Ré-exécutable : œuvres ignorées par titre déjà présent ; follows idempotents.
 *
 * Usage : node seed-network.mjs [--limit N] [--dry-run] [--skip-uploads]
 */

import { readFile, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import process from 'node:process'

const API = process.env.SEED_API ?? 'https://localhost:8443/api'
const SP =
  process.env.SEED_SP ??
  '/tmp/claude-101265/-goinfre-srabeman-srabeman-transcendence-ft-Pinterest/b14e0a78-723b-4e5e-abf3-0e9f86948d98/scratchpad'
const CREDS_IN = './seed-credentials.json'
const CREDS_OUT = './seed-network-credentials.json'
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.mp4': 'video/mp4',
}

const args = {
  limit: null,
  dryRun: process.argv.includes('--dry-run'),
  skipUploads: process.argv.includes('--skip-uploads'),
}
const li = process.argv.indexOf('--limit')
if (li !== -1) args.limit = Number(process.argv[li + 1])

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`, green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`, yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`, cyan: (s) => `\x1b[36m${s}\x1b[0m`,
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── Auteurs ───────────────────────────────────────────────────────────────
// Noms malgaches (scène créative de Tana) + français. `disc` route les œuvres.
const AUTHORS = [
  // — 6 comptes existants (mots de passe repris de seed-credentials.json) —
  { u: 'lina_marchand',    full: 'Lina Marchand',      disc: 'editorial',    bio: "Directrice artistique éditoriale, Paris. J'aime les grilles qui respirent." , existing: true },
  { u: 'tomas_reyes',      full: 'Tomás Reyes',        disc: 'photography',  bio: 'Photographe documentaire. Lumière naturelle, histoires vraies.',            existing: true },
  { u: 'ayoub_belkacem',   full: 'Ayoub Belkacem',     disc: 'typography',   bio: 'Type designer. Latin & arabic letterforms.',                                existing: true },
  { u: 'mira_okonkwo',     full: 'Mira Okonkwo',       disc: 'illustration', bio: 'Illustrator & storyteller. Colour is my first language.',                  existing: true },
  { u: 'jonas_wilde',      full: 'Jonas Wilde',        disc: 'uxui',         bio: 'Product designer. Interfaces calmes et lisibles.',                          existing: true },
  { u: 'sarah_ben_ali',    full: 'Sarah Ben Ali',      disc: 'branding',     bio: 'Brand designer. Identities with a backbone.',                               existing: true },
  // — Nouveaux : scène malgache (Antananarivo) —
  { u: 'tsiory_rakoto',    full: 'Tsiory Rakotoarisoa', disc: 'photography', bio: "Photographe basée à Antananarivo. Portraits de rue et lumière des hautes terres." },
  { u: 'naina_rando',      full: 'Naina Randrianarisoa', disc: 'portrait',   bio: 'Portraitiste. Je cherche le regard juste, celui qui reste.' },
  { u: 'hery_razaf',       full: 'Hery Razafindrakoto', disc: 'motion',      bio: 'Motion & 3D designer. Loops, textures, mouvement.' },
  { u: 'miora_raso',       full: 'Miora Rasoanaivo',    disc: 'illustration', bio: "Illustratrice à Tana. Aquarelle numérique et récits doux." },
  { u: 'njaka_andrianina', full: 'Njaka Andrianina',    disc: 'uxui',        bio: 'Product & UX designer. Systems that stay out of the way.' },
  { u: 'fanja_rahari',     full: 'Fanja Raharimalala',  disc: 'branding',    bio: "Directrice de création. J'habille les marques qui osent." },
  { u: 'toky_ravaka',      full: 'Toky Ravaka',         disc: 'typography',  bio: 'Type & lettering. Malagasy proverbs set in metal and pixels.' },
  { u: 'onja_ratsimba',    full: 'Onja Ratsimba',       disc: 'editorial',   bio: 'Directeur artistique éditorial. Magazines, mise en page, silence.' },
  // — Nouveaux : scène française —
  { u: 'camille_fontaine', full: 'Camille Fontaine',    disc: 'portrait',    bio: 'Portraitiste, Lyon. Peau, grain, présence.' },
  { u: 'julien_mercier',   full: 'Julien Mercier',      disc: 'photography', bio: 'Photographer. Landscapes and the quiet in between.' },
  { u: 'elodie_rousseau',  full: 'Élodie Rousseau',     disc: 'motion',      bio: 'Motion designer, Marseille. J’anime ce qui devrait bouger.' },
  { u: 'mathieu_laurent',  full: 'Mathieu Laurent',     disc: 'editorial',   bio: 'Art director. Editorial, branding, and the space between.' },
]

// ── Graphe de follows (par username) ───────────────────────────────────────
// Mutuels → les deux se suivent (deviennent « amis », messagerie ouverte).
const MUTUALS = [
  ['tsiory_rakoto', 'naina_rando'], ['tsiory_rakoto', 'hery_razaf'],
  ['naina_rando', 'miora_raso'], ['hery_razaf', 'njaka_andrianina'],
  ['fanja_rahari', 'toky_ravaka'], ['onja_ratsimba', 'fanja_rahari'],
  ['miora_raso', 'toky_ravaka'], ['camille_fontaine', 'julien_mercier'],
  ['elodie_rousseau', 'mathieu_laurent'], ['mathieu_laurent', 'lina_marchand'],
  ['julien_mercier', 'tsiory_rakoto'], ['onja_ratsimba', 'mathieu_laurent'],
  ['naina_rando', 'camille_fontaine'], ['mira_okonkwo', 'miora_raso'],
]
// À sens unique (fan → créateur) : admiration sans réciprocité.
const ONEWAY = [
  ['tsiory_rakoto', 'mira_okonkwo'], ['hery_razaf', 'mira_okonkwo'],
  ['njaka_andrianina', 'mira_okonkwo'], ['fanja_rahari', 'mira_okonkwo'],
  ['toky_ravaka', 'mira_okonkwo'], ['onja_ratsimba', 'mira_okonkwo'],
  ['camille_fontaine', 'mira_okonkwo'], ['julien_mercier', 'mira_okonkwo'],
  ['elodie_rousseau', 'mira_okonkwo'], ['jonas_wilde', 'mira_okonkwo'],
  ['naina_rando', 'tomas_reyes'], ['camille_fontaine', 'tomas_reyes'],
  ['elodie_rousseau', 'tomas_reyes'], ['miora_raso', 'tomas_reyes'],
  ['ayoub_belkacem', 'tomas_reyes'], ['hery_razaf', 'tomas_reyes'],
  ['lina_marchand', 'tomas_reyes'], ['njaka_andrianina', 'jonas_wilde'],
  ['fanja_rahari', 'sarah_ben_ali'], ['mathieu_laurent', 'sarah_ben_ali'],
  ['ayoub_belkacem', 'toky_ravaka'], ['toky_ravaka', 'lina_marchand'],
  ['onja_ratsimba', 'lina_marchand'], ['miora_raso', 'elodie_rousseau'],
]

// ── Utilitaires mots de passe ──────────────────────────────────────────────
function generatePassword() {
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const digits = '23456789'
  const symbols = '!@#$%&*?'
  const all = lower + upper + digits + symbols
  const pick = (set) => set[randomBytes(1)[0] % set.length]
  let pw = pick(lower) + pick(upper) + pick(digits) + pick(symbols)
  for (let i = 0; i < 10; i += 1) pw += pick(all)
  return pw.split('').sort(() => (randomBytes(1)[0] % 2 ? 1 : -1)).join('')
}

// ── API ────────────────────────────────────────────────────────────────────
async function apiJson(path, options = {}) {
  const res = await fetch(`${API}${path}`, options)
  const text = await res.text()
  let body
  try { body = text ? JSON.parse(text) : {} } catch { body = { raw: text } }
  if (!res.ok) {
    const err = new Error(body?.message || `HTTP ${res.status}`)
    err.status = res.status
    err.body = body
    throw err
  }
  return body
}
const authH = (t) => ({ Authorization: `Bearer ${t}` })
const jsonH = (t) => ({ ...authH(t), 'Content-Type': 'application/json' })

async function ensureAccount(a, password) {
  try {
    await apiJson('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: a.u, email: a.email, password,
        fullname: a.full, bio: a.bio,
      }),
    })
  } catch (e) {
    if (e.status !== 409) throw e // 409 = déjà inscrit → on se contente de login
  }
  const login = await apiJson('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: a.email, password }),
  })
  const token = login.access_token
  const me = await apiJson('/auth/me', { headers: authH(token) })
  return { token, id: me.id }
}

async function publishArtwork(token, meta, buffer) {
  const ext = meta.file.slice(meta.file.lastIndexOf('.')).toLowerCase()
  const form = new FormData()
  form.append('title', meta.title)
  form.append('description', meta.description)
  for (const tag of meta.tags.slice(0, 5)) form.append('tags', tag) // 5 tags max
  form.append('art', new Blob([buffer], { type: MIME[ext] ?? 'image/jpeg' }), meta.file.split('/').pop())
  return apiJson('/artworks', { method: 'POST', headers: authH(token), body: form })
}

async function existingTitles(token, userId) {
  try {
    const list = await apiJson(`/users/${userId}/artworks`, { headers: authH(token) })
    return new Set((Array.isArray(list) ? list : []).map((a) => a?.title).filter(Boolean))
  } catch { return new Set() }
}

async function follow(token, targetId) {
  try { await apiJson(`/users/${targetId}/follow`, { method: 'POST', headers: authH(token) }); return true }
  catch { return false }
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(c.bold('\nSeed réseau Atlaas\n'))

  // Manifestes : d'abord le repo (./seed-data), sinon le scratchpad.
  const loadManifest = async (name) => {
    for (const p of [join('./seed-data', name), join(SP, name)]) {
      try { return JSON.parse(await readFile(p, 'utf8')) } catch { /* essaie le suivant */ }
    }
    throw new Error(`Manifeste introuvable : ${name}`)
  }
  const vision = await loadManifest('vision-manifest.json')
  const videos = await loadManifest('video-manifest.json')
  let works = [...vision, ...videos]
  if (args.limit) {
    const byCat = {}
    works = works.filter((w) => {
      byCat[w.category] = (byCat[w.category] ?? 0) + 1
      return byCat[w.category] <= args.limit
    })
  }
  console.log(c.dim(`Œuvres : ${vision.length} images + ${videos.length} vidéos = ${works.length}`))

  // Mots de passe existants
  let existingCreds = {}
  try {
    const raw = JSON.parse(await readFile(CREDS_IN, 'utf8'))
    const list = Array.isArray(raw) ? raw : raw.accounts || raw.sessions || []
    for (const x of list) if (x.email && x.password) existingCreds[x.email] = x.password
  } catch { /* pas de creds existantes */ }

  // Complète emails + mots de passe. Déterministe pour les nouveaux comptes :
  // un re-run régénère le même mot de passe (login stable), contrairement à un
  // aléatoire qui casserait la ré-exécution.
  for (const a of AUTHORS) {
    a.email = `${a.u}@atlaas.local`
    a.password = existingCreds[a.email] ?? `Atlaas!2026-${a.u}`
  }

  if (args.dryRun) {
    console.log(c.yellow('\n--dry-run : aucun appel réseau.'))
    console.log('Auteurs :', AUTHORS.length, '| mutuals :', MUTUALS.length, '| oneway :', ONEWAY.length)
    const perDisc = {}
    for (const w of works) perDisc[w.category] = (perDisc[w.category] ?? 0) + 1
    console.log('Œuvres/discipline :', perDisc)
    return
  }

  // 1) Comptes
  console.log(c.bold('\n1. Comptes'))
  const byU = {}
  for (const a of AUTHORS) {
    try {
      const s = await ensureAccount(a, a.password)
      a.id = s.id; a.token = s.token; byU[a.u] = a
      console.log(`  ${c.green('✓')} ${a.u.padEnd(18)} ${c.dim(a.disc)}`)
    } catch (e) {
      console.log(`  ${c.red('✗')} ${a.u.padEnd(18)} ${c.dim(e.message)}`)
    }
    await sleep(120)
  }
  const live = AUTHORS.filter((a) => a.id)

  // 2) Répartition des œuvres par discipline (round-robin entre auteurs de la discipline)
  console.log(c.bold('\n2. Publication'))
  const authorsByDisc = {}
  for (const a of live) (authorsByDisc[a.disc] ??= []).push(a)
  const cursor = {}
  const assign = (cat) => {
    const pool = authorsByDisc[cat] && authorsByDisc[cat].length ? authorsByDisc[cat] : live
    const i = (cursor[cat] = (cursor[cat] ?? 0) + 1) - 1
    return pool[i % pool.length]
  }

  const titlesCache = {}
  let ok = 0, skip = 0, fail = 0
  const failures = []
  for (const w of works) {
    const author = assign(w.category)
    if (!author) { fail += 1; continue }
    titlesCache[author.id] ??= await existingTitles(author.token, author.id)
    if (titlesCache[author.id].has(w.title)) { skip += 1; continue }
    if (args.skipUploads) { continue }
    try {
      const buffer = await readFile(w.file)
      await publishArtwork(author.token, w, buffer)
      titlesCache[author.id].add(w.title)
      ok += 1
      if (ok % 20 === 0) console.log(c.dim(`  … ${ok} publiées`))
    } catch (e) {
      fail += 1
      failures.push(`${w.file} → ${e.message}`)
    }
    await sleep(180)
  }
  console.log(`  ${c.green(ok + ' publiées')}  ${c.dim(skip + ' ignorées')}  ${fail ? c.red(fail + ' échecs') : '0 échec'}`)
  if (failures.length) failures.slice(0, 8).forEach((f) => console.log(c.dim('    ' + f)))

  // 3) Follows
  console.log(c.bold('\n3. Réseau (follows)'))
  let mut = 0, one = 0
  for (const [x, y] of MUTUALS) {
    const A = byU[x], B = byU[y]
    if (!A || !B) continue
    const r1 = await follow(A.token, B.id); await sleep(80)
    const r2 = await follow(B.token, A.id); await sleep(80)
    if (r1 || r2) mut += 1
  }
  for (const [x, y] of ONEWAY) {
    const A = byU[x], B = byU[y]
    if (!A || !B) continue
    if (await follow(A.token, B.id)) one += 1
    await sleep(80)
  }
  console.log(`  ${c.green(mut + ' paires mutuelles')}  ${c.green(one + ' follows à sens unique')}`)

  // 4) Credentials des nouveaux comptes
  const newCreds = AUTHORS.filter((a) => !a.existing).map((a) => ({
    username: a.u, email: a.email, password: a.password, fullname: a.full, discipline: a.disc,
  }))
  await writeFile(CREDS_OUT, JSON.stringify(newCreds, null, 2), 'utf8')
  console.log(c.dim(`\nIdentifiants des nouveaux comptes → ${CREDS_OUT}`))
  console.log(c.bold('\nTerminé.\n'))
}

main().catch((e) => { console.error(c.red('Fatal:'), e); process.exit(1) })
