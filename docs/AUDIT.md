# Audit ft_transcendence — Atlaas

> Audit du projet **Atlaas** (galerie d'art / réseau social visuel) face au sujet **ft_transcendence**.
> Méthode : re-audit du code réel via **6 sondes parallèles** en lecture seule (backend/API/sécurité · frontend/features · i18n/a11y/RTL · devops/infra · data/GDPR/légal · scoring/prérequis) + 2 revues adversariales de code cette session.
> Date : **2026-07-26** — *remplace la version du 2026-07-25*.
>
> **Légende** : ✅ acquis démontrable · ⚠️ partiel / à sécuriser · ❌ absent · **N/A** (pas de jeu).

Stack : React 19 + Vite + Tailwind 4 + TanStack Query + Zustand (front) · NestJS + Prisma + PostgreSQL (back) · Docker Compose + nginx TLS · Prometheus/Grafana.

**Atlaas n'est pas un jeu** → toute la catégorie *Gaming* (Pong, IA adverse, stats de jeu, tournoi, spectateur) = **N/A**. Voir §6, risque n°1.

---

## 1. Position globale

> **Côté modules, le projet dépasse confortablement le seuil de 100 %** : ~**7 majeurs solides et démontrables** (= 14 pts, le barème des 7 majeurs) **+ ~10 mineurs** en coussin, soit **≈ 24 points** (≈ 12 équivalents-majeurs). Même en écartant les 2 majeurs partiels (API publique, WCAG), les 7 majeurs *done* atteignent déjà 100 %.
>
> **Le vrai risque n'est pas le score modules — ce sont les portes obligatoires / livrable d'équipe** : **Pong absent** (cœur obligatoire réinterprété en galerie), **README incomplet/périmé**, **déploiement depuis clone propre** fragile, et quelques **dettes de sécurité**. Voir §6.

**Δ depuis le 2026-07-25** : le chat, le dashboard analytics + charts, l'export CSV, le throttler+helmet et le upload (progress + delete owner) — que l'audit précédent notait ❌/⚠️ — sont désormais **faits** (§5).

---

## 2. Prérequis obligatoires (rejet si manquant)

| Exigence | État | Preuve / réserve |
|---|:--:|---|
| Web app front+back+db | ✅ | React 19 / NestJS / PostgreSQL 16 |
| Déploiement conteneurisé, 1 commande | ⚠️ | `make start` → `docker compose up -d --build`. **Risque clone propre** : `env_file` pointe `./backend/.env` + `./frontend/.env` (gitignorés) ; top-level lit `${POSTGRES_*}` → un clone neuf peut ne pas booter sans ces fichiers. |
| HTTPS navigateur→backend | ✅ | nginx `:8443 ssl` ; `:8080 → 301 https` (`nginx/nginx.conf`) |
| Privacy Policy + Terms, contenu réel, footer | ✅ | `/privacy` (~2760c, 7 sect.) + `/terms` (~3030c, 10 sect.), en/fr/ar, liens footer partout |
| Multi-utilisateurs + temps réel | ✅ | JWT + présence socket + **chat temps réel** |
| Auth email+password hashée/salée | ✅ | bcrypt coût 10 (`auth.service.ts:28`), password strip partout |
| Validation front + back | ✅ | `ValidationPipe` global (`whitelist/transform/forbidNonWhitelisted`) + class-validator ; validation frontend. ⚠️ quelques `@Param('id')` bruts sans `ParseUUIDPipe`. |
| Schéma DB clair + relations | ✅ | Prisma : User, Artwork, Like, Comment, Follow, friendship, Tag **+ Conversation / ConversationParticipant / Message** (migration `20260726180652_add_chat`) |
| Pas d'erreurs/warnings console | ⚠️ | **à vérifier en live** (non auditable depuis le code) |

---

## 3. Modules — check par catégorie

### IV.1 Web
| Module | Pts | État | Détail |
|---|--:|:--:|---|
| Framework front+back (Major) | 2 | ✅ | React + NestJS |
| Temps réel WebSockets (Major) | 2 | ✅ | Gateway JWT au handshake, présence multi-socket, `friendStatusChange`, `emitToUser`, **relais `chat:typing`** (expéditeur pris du socket, non du payload). Porte désormais présence **et** messagerie. |
| **User interaction — chat+profil+amis (Major)** | 2 | ✅ **▲** | **Chat 1-à-1 complet** : `chat.controller` (conversations, messages paginés, read), gating **mutual-follow** (`areMutuals`), fan-out `message:new`, throttle sur l'envoi. UI : panneau flottant, inbox, fil, composer optimiste, typing, cartes d'œuvre partagées par lien. + profil + amis. |
| API publique (Major) | 2 | ⚠️ | ~56 endpoints REST (34 GET/10 POST/4 PATCH/8 DELETE, **0 PUT**), Swagger servi `/swagger`. Mais **0 décorateur `@Api*`** (schémas vides), **pas de clé API**, **throttler non global**. Non revendicable en l'état. |
| ORM (Minor) | 1 | ✅ | Prisma (24 migrations) |
| Design system ≥10 composants (Minor) | 1 | ✅ | ≥12 composants ui + typo Inter/Hedvig + lucide. ⚠️ palette Tailwind par défaut (pas de tokens de marque). |
| Recherche avancée (Minor) | 1 | ✅/⚠️ | Backend : `q` insensible, skip/take, tri recent/oldest, 400 sur mauvais tri/page. ⚠️ **UI n'expose pas les contrôles** (params codés en dur). |
| File upload & management (Minor) | 1 | ✅ **▲** | Types multiples + `ParseFilePipe` (10 Mo, image/vidéo), preview, drag-drop, **barre de progression** (`onUploadProgress`) + **suppression owner** désormais branchées. Stockage Cloudinary. |
| Notifications CRUD / SSR / PWA (Minors) | – | ❌ | toasts éphémères seulement ; SPA (pas de SSR) ; pas de manifest/SW. *(⚠️ le README revendique à tort les notifications — §6.)* |

### IV.2 Accessibilité & i18n
| Module | Pts | État | Détail |
|---|--:|:--:|---|
| WCAG 2.1 AA complet (Major) | 2 | ⚠️ | a11y très soignée (focus-trap, live regions, combobox, roving tabindex, `motion-reduce`). Manque pour « AA complet » : **skip-link**, **contraste vérifié**, **audit auto (axe/Lighthouse)**. Risqué en Major. |
| 3 langues + switcher (Minor) | 1 | ✅ | en/fr/ar, **361 clés à parité** (`check-i18n`, typed-i18n) |
| RTL (Minor) | 1 | ✅ | Vrai miroir : `dir`, propriétés logiques (ps/pe/ms/me/start/end), inversion flèches/icônes ; chat + analytics inclus (axes de charts épinglés LTR). |
| Navigateurs additionnels (Minor) | 1 | ⚠️ | **à tester + documenter** (Firefox/Safari) |

### IV.3 User Management
| Module | Pts | État | Détail |
|---|--:|:--:|---|
| Gestion standard (Major) | 2 | ✅ | register/login/me, JwtStrategy recharge l'user, profil + avatar upload/défaut, amis (follow mutuel) + statut en ligne. |
| Permissions avancées / rôles (Major) | 2 | ✅ | Guard rôles + `@Roles` USER/ADMIN, admin CRUD users, protection dernier-admin + auto-rétrogradation. ⚠️ `RolesGuard` par-route (pas global), enum omet `GUEST`. |
| OAuth 2.0 Google (Minor) | 1 | ✅ | passport-google-oauth20, callback token en fragment, liaison par googleId puis email. ⚠️ config console Google requise pour la démo. |
| 2FA / game-stats / orga (Minors) | – | ❌ / N/A | pas de 2FA (aucune dép otplib/speakeasy) ; pas de jeu. |

### IV.4 AI · IV.5 Cybersécurité (WAF/Vault/2FA-adv) · IV.6 Gaming · IV.9 Blockchain
❌ / **N/A** partout. (Related-par-tags ≠ reco ML ; canvas 2D DOM ≠ 3D ; pas de WAF/Vault.)

### IV.7 Devops
| Module | Pts | État | Détail |
|---|--:|:--:|---|
| Prometheus + Grafana (Major) | 2 | ✅ | Prometheus scrape `backend/metrics` + node/postgres exporters ; Grafana provisionné ; **alertmanager + règles**. Dépasse le module. ⚠️ creds Grafana (env) + alertmanager → `webhook.site` de test à nettoyer. |
| Health + status + backups + DR (Minor) | 1 | ⚠️ | `/health`, page `/status`, backups cron `pg_dump` (dumps réels), scripts restore/DR + cibles Makefile. ⚠️ **doc DR encore vide** ; `backup` monte `/var/run/docker.sock`. |
| ELK / Microservices (Majors) | – | ❌ | monolithe Nest |

### IV.8 Data & Analytics
| Module | Pts | État | Détail |
|---|--:|:--:|---|
| **Dashboard analytics + charts (Major)** | 2 | ✅ **▲** | Onglet **Overview** admin : **charts SVG maison sans dépendance** (aires croissance users/contenu, donut rôles, barres top-créateurs/tags) + cartes métriques (œuvres/likes/commentaires). Calcul **côté client** depuis `/users` + `/search/artworks` (états loading/erreur/skeleton propres). Défendable en Major avec justification README (pas d'endpoint analytics dédié). |
| Export/import multi-format (Minor) | 1 | ⚠️ **▲** | Export **JSON + CSV** (util RFC 4180 partagé, BOM Excel, anti-injection de formule, sections titrées). ✅ pour l'export ; **import/bulk absent** → mineur partiellement couvert. |
| GDPR (Minor) | 1 | ✅ **▲** | Export lisible sans password (JSON **+ CSV**), suppression compte (dialog confirmation + cascade + Cloudinary). ⚠️ **emails de confirmation absents** (aucun module mail) → 3/4 bullets. |

### IV.10 Modules of choice
| Module | Pts | État | Détail |
|---|--:|:--:|---|
| Canvas de découverte (custom) | 1–2 | ⚠️ | Carte toroïdale infinie pannable + univers niche/créateur + welcome reveal brandé + easter eggs. Substantiel/original → justifiable **avec README**. |

---

## 4. Total

| | Points |
|---|--:|
| **✅ Majeurs solides** (Framework 2 · WebSockets 2 · User-interaction/chat 2 · Standard-user 2 · Rôles 2 · Prometheus/Grafana 2 · Analytics 2) | **14** (= 7 majeurs, seuil 100 %) |
| **✅ Mineurs solides** (ORM · Design · Search-back · Upload · OAuth · Health/DR · Export · GDPR · 3-langues · RTL) | **+10** |
| ⚠️ Majeurs partiels récupérables (API publique, WCAG) | +2 à +4 |
| **Total démontrable** | **≈ 24 pts** (~12 équivalents-majeurs) |

→ **Objectif largement atteint côté modules.** Le score n'est pas le sujet d'inquiétude — les portes du §6 le sont.

---

## 5. Ce qui a changé depuis l'audit du 2026-07-25

| Élément | Avant | Maintenant |
|---|:--:|:--:|
| User interaction — **chat** (Major) | ❌ | ✅ backend `src/chat` + WS deltas + typing + UI complète |
| **Dashboard analytics + charts** (Major) | ❌ | ✅ Overview + charts SVG maison |
| Export multi-format (Minor) | ❌ | ⚠️→✅ export JSON **+ CSV** (import restant) |
| Rate limiting + **helmet** | ❌ | ⚠️ helmet câblé (`main.ts`) + throttler présent (**pas encore global**) |
| File upload (Minor) | ⚠️ | ✅ progress + delete owner |
| WebSockets (Major) | ✅ (mince) | ✅ renforcé (porte la messagerie) |
| Équipe (risque mono-contributeur) | ⚠️ | ✅ **4 membres** contribuent réellement (git : Rabemanantsoa ~90, Rindranirina ~40, Rakotomalala 34, Ramaroson ~20) |

---

## 6. Risques hors modules (priorité décroissante)

1. **⛔ PONG ABSENT — cœur obligatoire.** Le sujet ft_transcendence impose un **jeu Pong multijoueur temps réel** ; le projet n'embarque **aucun jeu** (plateforme réinterprétée en galerie). Si l'évaluation s'en tient au sujet littéral, **le socle obligatoire échoue quel que soit le nombre de modules.** À cadrer explicitement avec l'équipe/l'évaluateur — risque n°1, très au-dessus de tout le reste.
2. **README incomplet / périmé.** `README.md` (73 l.) a la **structure** des sections obligatoires (Team, Project Management, Stack, DB Schema, Features, Modules, Contributions individuelles) mais du **contenu vide/brouillon** et une **checklist de modules périmée** — dont **notifications revendiquées alors qu'absentes** (intégrité du livrable).
3. **Déploiement clone propre.** `env_file: ./backend/.env` + `./frontend/.env` (gitignorés) → boot potentiellement cassé sur machine neuve. Fournir des `*.env.example` complets **et** un fallback documenté.
4. **Sécurité** :
   - **Rate limiting non global** : `ThrottlerModule` importé mais `ThrottlerGuard` **pas en `APP_GUARD`** ; `login`/`register` **non throttlés** → brute-force ouvert. *(Quick win fort.)*
   - **Clé TLS privée committée** (`nginx/ssl/nginx.key`) → gitignore + génération par script.
   - Secrets réels dans l'arbre (`backend/.env` : Cloudinary/Google) → isoler.
   - Postgres **`5432` publié à l'hôte** inutilement ; gateway WS **CORS `*`**.
   - `.env.example` incomplet (Grafana) ; alertmanager → webhook public de test.
5. **Serveurs dev en « prod ».** Vite `dev` + Nest `start:dev` derrière nginx → envisager builds prod.
6. **Swagger sans décorateurs** si l'API publique est revendiquée.
7. **Console 0 warning/erreur** (prérequis) — à vérifier en live.

---

## 7. Quick wins pour sécuriser des points

1. **Throttler global** : enregistrer `ThrottlerGuard` en `APP_GUARD` → couvre auth (brute-force) et durcit l'API. *(~15 min, fort impact sécurité.)*
2. **README** : remplir les sections obligatoires + corriger la checklist modules (retirer notifications, ajouter chat/analytics/export) → **le livrable, pas le code**. *(Priorité.)*
3. **Doc DR** (`scripts/doc/disaster_recovery.md` vide) → sécurise le Minor Devops.
4. **`.env.example` complets** (racine + Grafana + frontend `VITE_API_URL` sur `:8443`) → sécurise le boot clone propre.
5. **Recherche** : exposer tri/pagination/filtre dans l'UI → sécurise le Minor.
6. **Nettoyer** : dé-committer la clé TLS, retirer le webhook alertmanager de test, fermer `5432`.
7. **Justifier le canvas** comme *Module of choice* + justifier l'analytics client-side dans le README.
8. *(Optionnel, gros)* Import multi-format (compléter le Minor export), 2FA (Minor), notifications persistantes (Minor).

---

## Annexe — Preuves clés par domaine

**Backend/API/sécurité** — Auth : bcrypt 10 (`auth.service.ts:28`), JWT global default-deny (`app.module.ts` `APP_GUARD` JwtAuthGuard) + `@Public`, Google OAuth (`google.strategy.ts`). Chat : gating `areMutuals` (`chat.service.ts:58,110`), fan-out `message:new` (:138). WS : JWT handshake + `@SubscribeMessage('chat:typing')` (`websocket.gateway.ts`). Throttler : `forRoot([{ttl:10000,limit:20}])` importé mais guard **local** au seul `POST /conversations/:id/messages`. Helmet : `main.ts`. Prisma : chat models + `@@index`. **0 `@Api*`**, **pas de clé API**, **pas de 2FA**, **pas de module mail**.

**Frontend** — Routes : `/`, auth, `/profile[/:id]`, `/create`, `/settings`, `/admin` (Overview/Users/Artworks), `/artwork/:id`, `/privacy`, `/terms`, `/status`, `*`. Chat UI complète. Analytics : `AdminAnalytics.tsx` + `components/ui/charts/*` (SVG). Upload : progress + owner delete. ❌ liste followers/following, notifications persistantes, SSR, PWA. ⚠️ contrôles de recherche non exposés.

**i18n/a11y/RTL** — 361 clés en/fr/ar à parité (`scripts/check-i18n`), typed-i18n (tsc échoue sur clé inconnue), RTL logique complet. WCAG : fort mais **pas de skip-link / contraste / audit auto**.

**Devops** — 1 commande (10 services), nginx TLS + `/socket.io`, healthchecks, `migrate deploy` à l'entrée, Prometheus+Grafana+alertmanager, backups cron + restore/DR. ⚠️ doc DR vide, `5432` exposé, clé TLS committée, dev servers.

**Data/GDPR/légal** — `GET /users/me/export` (password exclu), download **JSON + CSV** (BOM, anti-injection, sections), suppression compte cascade. Analytics client-side. Privacy/Terms réels + footer. ❌ import, emails de confirmation.

**Équipe** — 4 contributeurs réels (git shortlog), pas de secret dans l'historique repéré. README à finaliser (§6.2).
