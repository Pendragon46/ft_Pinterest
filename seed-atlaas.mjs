#!/usr/bin/env node
/**
 * Seed Atlaas — crée des comptes auteurs et publie les images de `seed/`.
 *
 * Pipeline (voir la spec « Seed du canvas ») :
 *   1. credentials  → seed-credentials.json   (6 comptes, mots de passe forts)
 *   2. manifeste    → seed-manifest.json       (96 œuvres, titres uniques)
 *   3. comptes      → POST /auth/register (409 → /auth/login) + GET /auth/me
 *   4. publication  → POST /artworks/user/:id  (multipart, throttle)
 *   5. README       → READMELOGIN.md            (identifiants + répartition)
 *
 * Le dossier `seed/` est organisé par catégorie ; le nom du sous-dossier
 * devient le PREMIER tag de chaque œuvre (règle R4), ce qui rend la
 * recherche par niche (`/search/tags?q=portrait`) fonctionnelle.
 *
 * Ré-exécutable (Annexe B) : credentials et manifeste sont réutilisés s'ils
 * existent, et les œuvres déjà en base sont ignorées par comparaison des
 * titres (règle R5).
 *
 * Usage :
 *   node seed-atlaas.mjs                 # génère + publie + écrit le README
 *   node seed-atlaas.mjs --dry-run       # génère credentials + manifeste, sans réseau
 *   node seed-atlaas.mjs --limit 3       # 3 œuvres par catégorie
 *   node seed-atlaas.mjs --only portrait,uxui
 *   node seed-atlaas.mjs --authors 6
 *   node seed-atlaas.mjs --reset-credentials
 *
 * Node 18+ requis (fetch, FormData et Blob natifs).
 */

import { readdir, readFile, writeFile, access } from 'node:fs/promises'
import { join, extname, basename } from 'node:path'
import { randomBytes } from 'node:crypto'
import process from 'node:process'

// ── Configuration ───────────────────────────────────────────────────────

const API = process.env.SEED_API ?? 'https://localhost:8443/api'
const SEED_DIR = process.env.SEED_DIR ?? './seed'
const CREDENTIALS_FILE = './seed-credentials.json'
const MANIFEST_FILE = './seed-manifest.json'
const README_FILE = './READMELOGIN.md'

// Le certificat nginx est auto-signé : sans ça, fetch refuse la connexion.
// Uniquement pour ce script de développement, jamais en production.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

// Contraintes serveur (backend/src/artwork/dto) — répliquées pour échouer
// vite plutôt qu'après un upload de plusieurs Mo.
const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4'])
const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
}

// Pause entre deux uploads : Cloudinary et le backend encaissent mal une
// rafale de 96 requêtes simultanées (spec 5.3).
const THROTTLE_MS = 350

// ── Identités des comptes auteurs ───────────────────────────────────────
// Une spécialité par catégorie disponible : la bio mentionne un procédé
// concret pour rester crédible en soutenance (spec 2.2). La répartition des
// œuvres reste un tourniquet global — chaque compte publie dans plusieurs
// disciplines, la spécialité ne sert qu'à colorer le profil.

const AUTHOR_POOL = [
  { username: 'lina_marchand', fullname: 'Lina Marchand', speciality: 'portrait', bio: 'Direction artistique et portrait. Lumière naturelle, un seul réflecteur, cadrages serrés.' },
  { username: 'tomas_reyes', fullname: 'Tomás Reyes', speciality: 'editorial', bio: 'Editorial designer. Twelve-column grids, wide gutters, print-first thinking.' },
  { username: 'ayoub_belkacem', fullname: 'Ayoub Belkacem', speciality: 'uxui', bio: 'Designer produit. Interfaces à densité réduite, contrastes vérifiés en AA.' },
  { username: 'mira_okonkwo', fullname: 'Mira Okonkwo', speciality: 'illustration', bio: 'Illustrator. Character, colour and story — from flat vector to painted scenes.' },
  { username: 'jonas_wilde', fullname: 'Jonas Wilde', speciality: 'photography', bio: 'Photographer. Studio and natural light, from macro to mountain ridgelines.' },
  { username: 'sarah_ben_ali', fullname: 'Sarah Ben Ali', speciality: 'typography', bio: 'Typographie et lettrage. Tracé au crayon puis vectorisé, spécimens complets.' },
]

// ── Vocabulaire par catégorie ───────────────────────────────────────────
// Les tags reprennent NICHE_TAGS (frontend/src/features/search/search.mock.ts)
// pour correspondre à ce que connaît la recherche (spec 4.2).

const VOCAB = {
  portrait: {
    tags: ['people', 'studio', 'light', 'mood', 'editorial'],
    nouns: ['Portrait', 'Visage', 'Regard', 'Silhouette', 'Étude', 'Profil'],
    qualifiers: ['à contre-jour', 'en lumière douce', 'au flash direct', 'en studio', 'à la fenêtre', 'en clair-obscur'],
    descriptions: [
      'Séance en lumière naturelle, un seul réflecteur. Le grain vient du film.',
      'Portrait au 85 mm, ouverture pleine. Arrière-plan volontairement laissé flou.',
      'Prise en fin de journée, quand la lumière descend et devient chaude.',
      'Cadrage serré, presque frontal. Le sujet fixe l\'objectif sans sourire.',
      'Test de lumière avant une série plus longue. Celui-ci est resté.',
      'Deux sources croisées, une chaude et une froide, pour creuser le relief.',
    ],
  },
  editorial: {
    tags: ['layout', 'print', 'grid', 'type', 'people'],
    nouns: ['Mise en page', 'Double page', 'Chemin de fer', 'Composition', 'Maquette', 'Cahier'],
    qualifiers: ['sur grille douze colonnes', 'pour un trimestriel', 'en bichromie', 'format tabloïd', 'à marges larges', 'sans filet'],
    descriptions: [
      'Grille de douze colonnes, gouttières larges. La photo occupe six colonnes.',
      'Bichromie choisie pour tenir le budget d\'impression sans perdre le contraste.',
      'Hiérarchie posée d\'abord en gris, la couleur est arrivée en dernier.',
      'Le blanc tournant fait tout le travail : rien d\'autre à ajouter.',
      'Titre en corps 72, filet fin dessous. Le reste respire.',
      'Chemin de fer complet avant maquette : penser le rythme avant les pages.',
    ],
  },
  typography: {
    tags: ['type', 'lettering', 'grid', 'experimental', 'print'],
    nouns: ['Lettrage', 'Alphabet', 'Spécimen', 'Composition', 'Caractère', 'Affiche'],
    qualifiers: ['dessiné à la main', 'en grotesque étroite', 'à empattements fins', 'en capitales', 'sur module carré', 'à chasse variable'],
    descriptions: [
      'Lettrage tracé au crayon puis vectorisé. Les irrégularités sont volontaires.',
      'Spécimen complet : capitales, bas de casse, chiffres elzéviriens.',
      'Contraste poussé entre pleins et déliés, à la limite de la lisibilité.',
      'Construction sur module carré, une seule courbe réutilisée partout.',
      'Interlettrage resserré au maximum avant que les formes ne se touchent.',
      'Test d\'impression en typographie plomb, sur papier de chiffon.',
    ],
  },
  uxui: {
    tags: ['product', 'interface', 'grid', 'interaction', 'minimal'],
    nouns: ['Interface', 'Écran', 'Parcours', 'Tableau de bord', 'Système', 'Composant'],
    qualifiers: ['mobile', 'en mode sombre', 'pour application web', 'à densité réduite', 'accessible', 'responsive'],
    descriptions: [
      'Écran principal après trois itérations. La densité a beaucoup baissé.',
      'Mode sombre pensé dès le départ, pas ajouté après coup.',
      'Contrastes vérifiés en AA sur tous les états, y compris désactivé.',
      'Un seul niveau de hiérarchie visible à la fois : le reste attend.',
      'Composants issus du design system, aucune valeur codée en dur.',
      'Parcours réduit de sept à quatre étapes après tests utilisateurs.',
    ],
  },
  photography: {
    tags: ['photo', 'light', 'film', 'studio', 'mood'],
    nouns: ['Vue', 'Scène', 'Instant', 'Série', 'Fragment', 'Paysage'],
    qualifiers: ['argentique', 'au petit matin', 'en lumière rasante', 'sur pellicule 400 ISO', 'à main levée', 'en longue pose'],
    descriptions: [
      'Argentique, 400 ISO poussé à 800. Le grain fait partie de l\'image.',
      'Prise au petit matin, avant que la lumière ne devienne dure.',
      'Longue pose de trente secondes, appareil posé à même le sol.',
      'Une seule prise, pas de recadrage. Ce qui est là était là.',
      'Série de douze images, celle-ci est la seule qui tient seule.',
      'Lumière rasante de fin d\'après-midi, aucun éclairage d\'appoint.',
    ],
  },
  illustration: {
    tags: ['drawing', 'character', 'colour', 'texture', 'story'],
    nouns: ['Illustration', 'Personnage', 'Scène', 'Planche', 'Étude', 'Décor'],
    qualifiers: ['à la gouache', 'en trois couleurs', 'au trait', 'texturée', 'sur papier teinté', 'en aplats'],
    descriptions: [
      'Gouache sur papier teinté, retouches numériques minimales.',
      'Palette limitée à trois couleurs plus le blanc du papier.',
      'Le trait est resté visible sous les aplats, c\'était l\'intention.',
      'Texture scannée depuis un tirage raté, réutilisée en superposition.',
      'Étude préparatoire devenue image finale. Ça arrive.',
      'Composition en diagonale, le regard entre par le bas à gauche.',
    ],
  },
}

// Niches du canvas sans dossier source : la recherche y retombe sur le mock
// local (fetchNicheTile). Documenté dans le README.
const EMPTY_CATEGORIES = ['motion', 'branding']

// ── Utilitaires ─────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
}

/**
 * Mot de passe conforme à @IsStrongPassword : minuscule, majuscule, chiffre,
 * symbole, 14 caractères. Les jeux excluent les caractères ambigus
 * (l, I, 1, O, 0) car ces mots de passe seront relus et retapés (spec 2.3).
 */
function generatePassword() {
  const lower = 'abcdefghijkmnopqrstuvwxyz' // pas de « l »
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'  // pas de « I » ni « O »
  const digits = '23456789'                 // pas de « 0 » ni « 1 »
  const symbols = '!@#$%&*?'
  const pick = (set) => set[randomBytes(1)[0] % set.length]

  // Un caractère garanti par classe, puis remplissage jusqu'à 14.
  const chars = [pick(lower), pick(upper), pick(digits), pick(symbols)]
  const all = lower + upper + digits + symbols
  while (chars.length < 14) chars.push(pick(all))

  // Mélange Fisher-Yates : sans ça les quatre premiers caractères
  // trahiraient toujours la même structure (minuscule, majuscule, …).
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomBytes(1)[0] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

/** Entier stable dérivé d'une chaîne — même fichier, même choix. */
function hashString(s) {
  let h = 0
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/**
 * Compose titre, description et tags d'une œuvre. Déterministe.
 *
 * Le couple (nom, qualificatif) est choisi PAR L'INDEX dans la catégorie
 * (et non par hash) : avec 6 noms × 6 qualificatifs = 36 combinaisons pour
 * 16 fichiers, chaque œuvre d'une même catégorie reçoit un couple distinct,
 * donc un titre distinct. `seen` sert de filet de sécurité inter-catégories.
 */
function composeMeta(category, filename, idxInCat, globalIdx, seen) {
  const v = VOCAB[category]
  const h = hashString(filename)

  const noun = v.nouns[idxInCat % v.nouns.length]
  const qualifier = v.qualifiers[Math.floor(idxInCat / v.nouns.length) % v.qualifiers.length]
  const description = v.descriptions[h % v.descriptions.length]

  // Le slug de catégorie EN PREMIER (règle R4), puis 1 à 3 tags de la
  // discipline → 2 à 4 tags au total.
  const extras = v.tags // aucun ne vaut le slug de catégorie
  const count = 1 + (h % 3)
  const start = h % extras.length
  const chosen = []
  for (let k = 0; k < count; k += 1) chosen.push(extras[(start + k) % extras.length])
  const tags = [category, ...new Set(chosen)]

  let title = `${noun} ${qualifier}`
  // Filet inter-catégories : si deux disciplines produisent le même titre,
  // on suffixe un numéro de série global pour garantir l'unicité (gate 4).
  if (seen.has(title)) title = `${title} nº${String(globalIdx + 1).padStart(2, '0')}`
  seen.add(title)

  return { title: title.slice(0, 100), description, tags }
}

// ── Appels API ──────────────────────────────────────────────────────────

async function apiJson(path, options = {}) {
  const res = await fetch(`${API}${path}`, options)
  const text = await res.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  if (!res.ok) {
    const message = body?.message ?? body ?? res.statusText
    const err = new Error(
      Array.isArray(message) ? message.join(' | ') : String(message),
    )
    err.status = res.status
    throw err
  }
  return body
}

/** Crée le compte, ou se connecte s'il existe déjà (409). Rejouable. */
async function ensureAccount(author, password) {
  try {
    const data = await apiJson('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: author.username,
        fullname: author.fullname,
        email: author.email,
        password,
        bio: author.bio,
      }),
    })
    return { token: data.access_token, created: true }
  } catch (error) {
    if (error.status !== 409) throw error
    const data = await apiJson('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: author.email, password }),
    })
    return { token: data.access_token, created: false }
  }
}

/** id du compte : POST /artworks/user/:id l'exige dans l'URL. */
async function fetchMe(token) {
  return apiJson('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
}

/** Titres déjà publiés par un compte — pour ne pas republier (règle R5). */
async function fetchExistingTitles(userId, token) {
  try {
    // Le nouveau backend protège GET /users/:id/artworks (guard global) → token requis.
    const list = await apiJson(`/users/${userId}/artworks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!Array.isArray(list)) return new Set()
    return new Set(list.map((a) => a?.title).filter(Boolean))
  } catch {
    return new Set()
  }
}

async function publishArtwork(token, userId, filePath, meta) {
  const buffer = await readFile(filePath)
  const ext = extname(filePath).toLowerCase()

  const form = new FormData()
  form.append('title', meta.title)
  form.append('description', meta.description)
  // Un tableau se transmet en répétant la clé : tags=a&tags=b.
  for (const tag of meta.tags) form.append('tags', tag)
  form.append(
    'art',
    new Blob([buffer], { type: MIME[ext] ?? 'image/jpeg' }),
    basename(filePath),
  )

  // Pas de Content-Type manuel : fetch pose lui-même le boundary multipart.
  // Le nouveau backend dérive l'auteur du token (POST /artworks, plus /artworks/user/:id).
  return apiJson(`/artworks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
}

// ── Graphe social (suivis + messagerie) ─────────────────────────────────

const authHeader = (token) => ({ Authorization: `Bearer ${token}` })
const jsonHeader = (token) => ({ ...authHeader(token), 'Content-Type': 'application/json' })

/** Suit un utilisateur ; avale l'erreur « déjà suivi » pour rester idempotent. */
async function follow(token, targetId) {
  try {
    await apiJson(`/users/${targetId}/follow`, { method: 'POST', headers: authHeader(token) })
    return true
  } catch {
    return false
  }
}

async function fetchFirstArtworkId(userId, token) {
  try {
    const list = await apiJson(`/users/${userId}/artworks`, { headers: authHeader(token) })
    return Array.isArray(list) && list[0]?.id ? list[0].id : null
  } catch {
    return null
  }
}

/** Ouvre (ou retrouve) la conversation avec un mutuel. 403 si le lien n'est pas réciproque. */
async function openConversation(token, otherId) {
  return apiJson('/conversations', {
    method: 'POST',
    headers: jsonHeader(token),
    body: JSON.stringify({ userId: otherId }),
  })
}

async function conversationIsEmpty(token, convId) {
  try {
    const page = await apiJson(`/conversations/${convId}/messages?page=1&limit=1`, {
      headers: authHeader(token),
    })
    return Array.isArray(page?.items) ? page.items.length === 0 : true
  } catch {
    return false
  }
}

async function sendChatMessage(token, convId, payload) {
  return apiJson(`/conversations/${convId}/messages`, {
    method: 'POST',
    headers: jsonHeader(token),
    body: JSON.stringify(payload),
  })
}

// Courtes conversations scénarisées pour animer la messagerie de démonstration.
const CHAT_SCRIPTS = [
  [
    "Salut ! J'adore ta dernière série, la lumière est superbe.",
    'Merci beaucoup 🙏 Un seul réflecteur, tout en douceur.',
    'Ça se voit, très maîtrisé. On échange nos réglages un de ces jours ?',
    "Avec plaisir, je t'envoie ça ce week-end.",
  ],
  [
    'Hello ! Dispo pour un shooting collaboratif le mois prochain ?',
    'Carrément, tu imagines quelle direction ?',
    'Portrait éditorial, palette sobre. Je te partage une réf.',
  ],
  [
    "Ton travail m'inspire pas mal en ce moment 👌",
    'Trop gentil ! Le tien aussi, franchement.',
  ],
]

// Tisse un petit graphe : anneau unidirectionnel (variété du feed) + paires
// consécutives mutuelles, puis quelques conversations de démo sur ces paires.
// Idempotent : suivis « déjà faits » ignorés, messages seulement si le fil est vide.
async function seedSocialGraph(sessions) {
  const live = sessions.filter(Boolean)
  if (live.length < 2) return
  console.log(c.bold('\nGraphe social\n'))

  let follows = 0
  for (let i = 0; i < live.length; i += 1) {
    const next = live[(i + 1) % live.length]
    if (next.id !== live[i].id && (await follow(live[i].token, next.id))) follows += 1
  }
  const pairs = []
  for (let i = 0; i + 1 < live.length; i += 2) pairs.push([live[i], live[i + 1]])
  for (const [a, b] of pairs) {
    if (await follow(a.token, b.id)) follows += 1
    if (await follow(b.token, a.id)) follows += 1
  }
  console.log(`  ${c.green(`${follows} suivis`)} ${c.dim(`(${pairs.length} paires mutuelles)`)}`)

  let convos = 0
  for (let p = 0; p < Math.min(pairs.length, CHAT_SCRIPTS.length); p += 1) {
    const [a, b] = pairs[p]
    const script = CHAT_SCRIPTS[p]
    try {
      const conv = await openConversation(a.token, b.id)
      if (!conv?.id) continue
      if (!(await conversationIsEmpty(a.token, conv.id))) {
        console.log(`  ${c.dim('•')} ${a.username} ↔ ${b.username} — déjà des messages`)
        continue
      }
      for (let m = 0; m < script.length; m += 1) {
        const speaker = m % 2 === 0 ? a : b
        await sendChatMessage(speaker.token, conv.id, { content: script[m] })
        await sleep(120)
      }
      const artworkId = await fetchFirstArtworkId(b.id, b.token)
      if (artworkId) await sendChatMessage(b.token, conv.id, { artworkId })
      convos += 1
      console.log(
        `  ${c.green('✓')} ${a.username} ↔ ${b.username} ${c.dim(`(${script.length} msg${artworkId ? ' + 1 œuvre' : ''})`)}`,
      )
    } catch (error) {
      console.log(`  ${c.red('✗')} ${a.username} ↔ ${b.username} — ${error.message}`)
    }
  }
  console.log(`  ${c.green(`${convos} conversation(s) de démo`)}`)
}

// ── Artefacts persistés ─────────────────────────────────────────────────

/** Tâche 2 — credentials. Réutilise le fichier existant sauf --reset. */
async function loadCredentials(count, reset) {
  if (!reset) {
    try {
      await access(CREDENTIALS_FILE)
      const saved = JSON.parse(await readFile(CREDENTIALS_FILE, 'utf8'))
      console.log(c.dim(`Identifiants repris depuis ${CREDENTIALS_FILE}`))
      return saved.accounts
    } catch {
      // Premier lancement : on génère.
    }
  }

  const accounts = AUTHOR_POOL.slice(0, count).map((a) => ({
    username: a.username,
    fullname: a.fullname,
    email: `${a.username}@atlaas.local`,
    password: generatePassword(),
    bio: a.bio,
    speciality: a.speciality,
  }))

  await writeFile(
    CREDENTIALS_FILE,
    JSON.stringify(
      {
        note: 'Comptes de démonstration créés par seed-atlaas.mjs. Ne pas committer.',
        generatedAt: new Date().toISOString(),
        api: API,
        accounts,
      },
      null,
      2,
    ),
    'utf8',
  )
  console.log(c.green(`✓ Identifiants écrits dans ${CREDENTIALS_FILE}`))
  return accounts
}

/**
 * Tâche 4 — manifeste. Scanne `seed/`, compose les métadonnées et fige la
 * répartition des auteurs (tourniquet sur l'index GLOBAL). Réutilise le
 * fichier existant pour permettre la reprise (Annexe B).
 */
async function loadManifest(accountsCount, args) {
  if (!args.resetManifest) {
    try {
      await access(MANIFEST_FILE)
      const saved = JSON.parse(await readFile(MANIFEST_FILE, 'utf8'))
      console.log(c.dim(`Manifeste repris depuis ${MANIFEST_FILE} (${saved.length} œuvres)`))
      return saved
    } catch {
      // On génère.
    }
  }

  const entries = await readdir(SEED_DIR, { withFileTypes: true })
  const categories = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => {
      if (!VOCAB[name]) {
        console.log(c.yellow(`~ dossier ignoré (catégorie inconnue) : ${name}`))
        return false
      }
      return args.only ? args.only.includes(name) : true
    })
    .sort()

  const seen = new Set()
  const manifest = []
  let globalIdx = 0
  for (const category of categories) {
    const files = (await readdir(join(SEED_DIR, category)))
      .filter((f) => ALLOWED_EXT.has(extname(f).toLowerCase()))
      .sort()
      .slice(0, args.limit)

    files.forEach((file, idxInCat) => {
      const meta = composeMeta(category, file, idxInCat, globalIdx, seen)
      manifest.push({
        file: `${SEED_DIR.replace(/^\.\//, '')}/${category}/${file}`,
        category,
        authorIndex: globalIdx % accountsCount,
        title: meta.title,
        description: meta.description,
        tags: meta.tags,
      })
      globalIdx += 1
    })
  }

  await writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8')
  console.log(c.green(`✓ Manifeste écrit dans ${MANIFEST_FILE} (${manifest.length} œuvres)`))
  return manifest
}

/** Tâches 7 & 8 — README des identifiants + rapport honnête. */
async function writeReadme(sessions, manifest, counts, published, failures) {
  const date = new Date().toISOString()
  const byCat = {}
  for (const m of manifest) byCat[m.category] = (byCat[m.category] ?? 0) + 1

  const accountRows = sessions
    .filter(Boolean)
    .map((s) => `| ${s.fullname}<br>\`@${s.username}\` | \`${s.email}\` | \`${s.password}\` | ${counts[s.id] ?? 0} |`)
    .join('\n')

  const catRows = Object.keys(byCat)
    .sort()
    .map((cat) => `| ${cat} | ${byCat[cat]} | \`${cat}\` |`)
    .join('\n')

  const failureList = failures.length
    ? '\n' + failures.slice(0, 20).map((f) => `  - \`${basename(f.file)}\` — ${f.reason}`).join('\n')
    : ' aucun'

  const md = `# Comptes de démonstration — Atlaas

> ⚠️ **Ne pas committer ce fichier.** Il contient des mots de passe en
> clair. Il est listé dans \`.gitignore\`.

Généré le ${date} · API : \`${API}\`

---

## Connexion

| Compte | E-mail | Mot de passe | Œuvres |
|---|---|---|---|
${accountRows}

Chaque compte a été créé via \`POST /auth/register\` et publie en tourniquet
sur l'ensemble des catégories.

---

## Répartition du contenu

| Catégorie | Œuvres | Recherche |
|---|---|---|
${catRows}
| **Total** | **${manifest.length}** | |

### Catégories sans contenu

\`motion\` et \`branding\` n'ont pas d'images dans le lot source. La recherche
sur ces termes retombe sur le contenu local du canvas (comportement prévu
par \`fetchNicheTile\`).

---

## Régénérer

\`\`\`bash
# Republie les œuvres manquantes (les comptes et titres déjà en base sont ignorés)
node seed-atlaas.mjs

# Simuler sans réseau (regénère credentials + manifeste)
node seed-atlaas.mjs --dry-run
\`\`\`

## Repartir de zéro

\`\`\`bash
make clean && make start
docker exec ft_pinterest_backend npx prisma migrate deploy
node seed-atlaas.mjs   # réutilise seed-credentials.json + seed-manifest.json
\`\`\`

> Le conteneur Postgres s'appelle \`ft_pinterest_postgres\`.
>
> **Garder \`seed-manifest.json\`** : il contient les titres et descriptions
> rédigés à la main (une langue par profil). Le supprimer régénère des titres
> composés mécaniquement.

## Promotion d'un administrateur

Aucune interface ne promeut un compte en ADMIN — c'est volontaire. En base :

\`\`\`bash
docker exec ft_pinterest_postgres psql -U postgres -d ft_pinterest \\
  -c "UPDATE \\"User\\" SET role='ADMIN' WHERE username='lina_marchand';"
\`\`\`

(\`POSTGRES_USER=postgres\`, \`POSTGRES_DB=ft_pinterest\` — cf. \`.env\` racine.)

---

## Notes

- ${published} œuvres publiées sur ${manifest.length} tentées.
- Échecs :${failureList}
- Format des images : 96 fichiers JPG. Les cartes du canvas (460×300)
  recadrent au centre (\`object-cover\`) ; la modale de détail affiche
  l'image entière (\`object-contain\`). Les portraits sont donc rognés sur
  la carte mais entiers en modale — comportement attendu, pas un défaut.
- Catégories \`motion\` et \`branding\` sans contenu (repli sur le mock).
`

  await writeFile(README_FILE, md, 'utf8')
  console.log(c.green(`✓ README écrit dans ${README_FILE}`))
}

// ── Programme principal ─────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    dryRun: argv.includes('--dry-run'),
    resetCredentials: argv.includes('--reset-credentials'),
    resetManifest: argv.includes('--reset-manifest') || argv.includes('--reset-credentials'),
    social: !argv.includes('--no-social'),
    limit: Infinity,
    only: null,
    authors: 6,
  }
  const value = (flag) => {
    const i = argv.indexOf(flag)
    return i !== -1 ? argv[i + 1] : undefined
  }
  const limit = value('--limit')
  if (limit) args.limit = Number(limit)
  const only = value('--only')
  if (only) args.only = only.split(',').map((s) => s.trim())
  const authors = value('--authors')
  if (authors) args.authors = Math.min(Number(authors), AUTHOR_POOL.length)
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  console.log(c.bold('\nSeed Atlaas'))
  console.log(c.dim(`API      ${API}`))
  console.log(c.dim(`Source   ${SEED_DIR}`))
  if (args.dryRun) console.log(c.yellow('Mode simulation — aucun appel réseau\n'))
  else console.log('')

  // 1. Comptes (credentials).
  const accounts = await loadCredentials(args.authors, args.resetCredentials)
  accounts.forEach((a) => { a.email = a.email ?? `${a.username}@atlaas.local` })

  // 2. Manifeste.
  const manifest = await loadManifest(accounts.length, args)
  if (manifest.length === 0) {
    console.error(c.red('Aucune œuvre dans le manifeste. Vérifiez le dossier seed/.'))
    process.exit(1)
  }

  const dist = {}
  for (const m of manifest) dist[m.authorIndex] = (dist[m.authorIndex] ?? 0) + 1
  console.log(c.dim(`Répartition auteurs : ${JSON.stringify(dist)}`))

  if (args.dryRun) {
    console.log(c.bold('\nAperçu des cinq premières œuvres :\n'))
    for (const job of manifest.slice(0, 5)) {
      const author = accounts[job.authorIndex]
      console.log(`  ${c.green(job.title)}`)
      console.log(c.dim(`    par ${author.username} · tags: ${job.tags.join(', ')}`))
      console.log(c.dim(`    ${job.description}`))
      console.log('')
    }
    console.log(c.yellow('Simulation terminée. Retirez --dry-run pour publier.\n'))
    return
  }

  // 3. Authentification.
  console.log(c.bold('\nComptes\n'))
  const sessions = new Array(accounts.length).fill(null)
  for (let i = 0; i < accounts.length; i += 1) {
    const account = accounts[i]
    try {
      const { token, created } = await ensureAccount(account, account.password)
      const me = await fetchMe(token)
      if (!me?.id) throw new Error('/auth/me ne renvoie pas d\'id')
      sessions[i] = { ...account, token, id: me.id }
      console.log(
        `  ${created ? c.green('créé  ') : c.dim('existe')} ${account.username.padEnd(18)} ${c.dim(account.email)} ${c.dim(me.id)}`,
      )
    } catch (error) {
      console.error(`  ${c.red('échec ')} ${account.username} — ${error.message}`)
    }
  }

  if (sessions.every((s) => s === null)) {
    console.error(c.red('\nAucun compte disponible. Vérifiez que le backend répond.'))
    process.exit(1)
  }

  // 4. Titres déjà publiés par compte (règle R5).
  const existing = {}
  for (const s of sessions) {
    if (s) existing[s.id] = await fetchExistingTitles(s.id, s.token)
  }

  // 5. Publication, en tourniquet figé par le manifeste.
  console.log(c.bold('\nPublication\n'))
  let ok = 0
  let skipped = 0
  const failures = []

  for (const [i, job] of manifest.entries()) {
    const session = sessions[job.authorIndex]
    const label = `[${String(i + 1).padStart(3)}/${manifest.length}]`

    if (!session) {
      failures.push({ file: job.file, reason: `compte #${job.authorIndex} indisponible` })
      console.log(`  ${c.red('✗')} ${label} ${c.dim(basename(job.file))} — compte indisponible`)
      continue
    }

    if (existing[session.id]?.has(job.title)) {
      skipped += 1
      console.log(`  ${c.dim('•')} ${label} ${c.dim(job.title.slice(0, 44))} déjà en base`)
      continue
    }

    try {
      const buf = await readFile(job.file)
      if (buf.length > MAX_BYTES) {
        throw new Error(`fichier trop lourd (${(buf.length / 1024 / 1024).toFixed(1)} Mo)`)
      }
      await publishArtwork(session.token, session.id, job.file, job)
      ok += 1
      console.log(
        `  ${c.green('✓')} ${label} ${job.title.slice(0, 44).padEnd(46)} ${c.dim(session.username)}`,
      )
    } catch (error) {
      failures.push({ file: job.file, reason: error.message })
      console.log(`  ${c.red('✗')} ${label} ${c.dim(basename(job.file))} — ${error.message}`)
    }

    if (i < manifest.length - 1) await sleep(THROTTLE_MS)
  }

  // 5.5 Graphe social : suivis mutuels + conversations de démo (chat).
  if (args.social) {
    try {
      await seedSocialGraph(sessions)
    } catch (error) {
      console.log(c.red(`  Graphe social ignoré — ${error.message}`))
    }
  }

  // 6. Comptage final par compte (pour le README).
  const counts = {}
  for (const s of sessions) {
    if (s) counts[s.id] = (await fetchExistingTitles(s.id)).size
  }

  // 7. README.
  console.log(c.bold('\nREADME\n'))
  await writeReadme(sessions, manifest, counts, ok, failures)

  // 8. Bilan.
  console.log(c.bold('\nBilan\n'))
  console.log(`  ${c.green(`${ok} publiées`)}${skipped ? c.dim(`  ·  ${skipped} déjà en base`) : ''}`)
  if (failures.length > 0) {
    console.log(`  ${c.red(`${failures.length} échecs`)}`)
    for (const f of failures.slice(0, 10)) {
      console.log(c.dim(`    ${basename(f.file)} — ${f.reason}`))
    }
    if (failures.length > 10) console.log(c.dim(`    … et ${failures.length - 10} autres`))
  }

  console.log(c.bold('\nConnexion aux comptes\n'))
  for (const s of sessions) {
    if (s) console.log(`  ${s.email.padEnd(30)} ${c.dim(s.password)}`)
  }
  console.log(c.dim(`\n  (également dans ${README_FILE} et ${CREDENTIALS_FILE})\n`))
}

main().catch((error) => {
  console.error(c.red(`\nErreur fatale : ${error.message}`))
  process.exit(1)
})
