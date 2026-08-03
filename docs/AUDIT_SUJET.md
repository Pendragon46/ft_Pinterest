# Audit ft_transcendence — Atlaas

> Confrontation du code au sujet **ft_transcendence v21.1**, module par module.
> Méthode : 8 audits parallèles par catégorie, chacun repassé par un évaluateur
> adverse chargé de le contredire dans les deux sens (déclasser un module trop
> généreusement validé, reclasser un module implémenté mais non revendiqué),
> puis synthèse. **17 agents, 49 items jugés, 3 verdicts renversés.**

**Analyse statique uniquement** — Docker n'a pas pu démarrer sur la machine d'audit,
aucun verdict n'a été vérifié dans un navigateur. Voir « Angles morts » en fin de document.

---

## 1. Verdict global

| | Points |
|---|---:|
| **Acquis** (VALIDATED) | **10** |
| **En danger** (PARTIAL — le sujet dit : incomplet = 0) | **16** |
| Non implémenté | 17 |
| Total si tout le partiel est rattrapé | 26 |
| **Requis par le sujet** | **14** |

**10 points acquis sur les 14 requis.** Il faut convertir au moins
**4 points** parmi les 16 en danger.

### Pourquoi l'écart avec les « 23/28 » du README

1. **Double comptage des frameworks.** Le README revendique le Majeur « framework
   front *et* back » (2 pts) **et** les deux Mineurs « frontend framework » +
   « backend framework » (2 pts). C'est le même travail compté deux fois : les deux
   Mineurs sont classés NOT_APPLICABLE. **−2 points.**
2. **Modules comptés comme acquis alors qu'un bullet du sujet manque.** Le sujet est
   explicite : *« Only fully functional and properly implemented modules will be
   counted. Non-functional or incomplete modules = 0 points. »*
3. **Modules faits mais décochés** — voir §6, ce sont des points gratuits.

---

## 2. Critères de rejet (exigences générales et techniques)

Ces critères ne rapportent **aucun point**, mais le sujet précise que leur échec
fait **rejeter le projet**. Les défaillants d'abord.

**5 en défaut / 16 évalués.**

### ❌ General — NO warnings or errors in the browser console

**Statut : PARTIAL**

**Ce qui manque**

Four concrete residues remain. (1) **A stale JWT logs a 401 on every boot.** The token lives in localStorage (`frontend/src/features/auth/token.ts:2-6`); `AuthGate` fires `GET /auth/me` whenever one is present (`frontend/src/features/auth/AuthGate.tsx:27-30`) and `JwtStrategy.validate` throws `UnauthorizedException` when the user row is gone (`backend/src/auth/jwt.strategy.ts:16-18`). After any `make fclean` / reseed — i.e. exactly what happens between a rehearsal and the demo on the same browser profile — the still-validly-signed token points at a deleted uuid and Chrome prints `Failed to load resource: … 401 (Unauthorized)` in red. The JS catch at AuthGate.tsx:34 cannot suppress the browser's own log. (2) **The like endpoint still 400s.** `frontend/src/features/artworks/artwork.api.ts:164` swallows a 400 in JS, but the HTTP failure is logged by Chrome regardless; it is reachable from a second tab or after a like made elsewhere (the in-tab guard at `ArtworkDetail.tsx:271-275` only covers one tab). (3) **Two check-then-create races produce uncaught 500s** — see the multi-user row. (4) **Dev-build surface**: because `frontend/Dockerfile:15` runs `npm run dev`, React runs in development mode under `<StrictMode>` (`frontend/src/main.tsx:9-13`), so any dev-only React warning (key collisions, controlled↔uncontrolled flips, effect-cleanup complaints) prints as `console.error`, and Vite's HMR client emits `[vite] connecting…` / `[vite] connected.` at debug level. Static analysis is clean, but that is a broader console surface than a production build would present.

**Comment le lever**

Cannot be settled statically — you must open Chrome DevTools with 'Preserve log' on and drive the full journey. Before that, do three things: (a) make AuthGate tolerate a dead token without a red 401 — either give `/auth/me` the same 2xx-with-payload treatment as login (`auth.service.ts:67`), or clear the token client-side when a decode shows it is expired before calling; (b) make `POST/DELETE /artworks/:id/like` idempotent server-side (`upsert`/`deleteMany`) so the already-liked case returns 2xx instead of 400; (c) wrap the two races below. Then walk: fresh profile → home → login → publish → like → comment → chat between two browsers → admin → /privacy → /terms → EN/FR/AR → logout, with 0 errors and 0 warnings.

<details><summary>Contre-expertise</summary>

PARTIAL is correct and all four residues are real. Independently verified: `grep -rn 'console\.' frontend/src` returns only two comment lines (auth.validation.ts:18, ConversationThread.tsx:68) — zero actual calls. The stale-token 401 is confirmed end to end: AuthGate.tsx:27-30 fires fetchMe() whenever `tokenStore.get() !== null`, the `.catch()` only clears the token client-side, and backend jwt.strategy throws UnauthorizedException for a missing row — Chrome logs the 401 before any JS runs. The like 400 is confirmed at artwork.api.ts:157-168 (`catch (error) { if (isApiError(error) && error.status === 400) return input.liked }`) — the swallow is JS-side only. I also checked for guest-triggered 4xx and found none: socket.ts:22-23 returns null without a token, ArtworkDetail.tsx:121 gates isLikedQuery on `Boolean(currentUser)`, and health/metrics controllers are `@Public()`. So the failure surface is exactly the four listed, no more.

</details>

---

### ❌ General — Multi-user support: concurrent users, real-time propagation, no race conditions

**Statut : PARTIAL**

**Ce qui manque**

Two textbook check-then-create races that surface as **uncaught 500s**, not corruption. (1) `backend/src/likes/likes.service.ts:24-38`: `findFirst` for an existing like, then `create`. Two concurrent likes from the same user (two tabs, or a retried request) both pass the check; the second `create` violates `@@unique([authorId, artworkId])`, Prisma throws `P2002`, nothing catches it → 500 in the browser console. `unlike` has the mirror bug at lines 48-59 (`delete` by id after `findFirst` → `P2025`). (2) `backend/src/chat/chat.service.ts:61-68` (and the duplicate at 158-165): `findUnique({where:{pairKey}})` then `create`. If both users click "message" simultaneously — plausible when one evaluator drives two windows — the second create violates the unique `pairKey` → `P2002` → 500. Separately: **artwork creation is never broadcast.** Only `artwork:deleted` is emitted; there is no `artwork:created`/`artwork:updated`, so a work published by user A does not appear on user B's canvas until React Query's 30s `staleTime` expires and a window-focus refetch fires (`frontend/src/app/providers.tsx:22`). For a demo whose headline is a shared infinite canvas, "publish here, refresh there" is a weak answer to "real-time updates reflected across connected users". Minor: the chat send throttle is 20 requests / 10 s keyed by IP (`chat.controller.ts:47-48` + `app.module.ts:38`); with `trust proxy` on (`main.ts:13`) every browser on the demo machine shares 127.0.0.1, so the budget is shared across all simultaneous users.

**Comment le lever**

Replace both races with atomic operations: `prisma.like.upsert({where:{authorId_artworkId:{authorId,artworkId}}, create:{…}, update:{}})` and `prisma.like.deleteMany({where:{authorId,artworkId}})`; `prisma.conversation.upsert({where:{pairKey}, …})` — or wrap each `create` in a try/catch that swallows `P2002`/`P2025` and re-reads. Then add `this.gateway.broadcast('artwork:created', …)` in `artwork.service.ts` next to the existing delete broadcast and have `ArtworkSyncProvider` call `invalidateCanvas` on it. Rehearse the two-browser demo: log in as two mutuals side by side, publish in A and watch it land in B, chat both ways, watch the green dot flip on logout, and delete a work in A and watch it vanish from B.

<details><summary>Contre-expertise</summary>

PARTIAL is correct — the subject's own words are 'no data corruption or race conditions', and I read both races in full. likes.service.ts: `findFirst` on {artworkId, authorId} then `prisma.like.create` with no try/catch, against `@@unique([authorId, artworkId])` (schema.prisma:62) → P2002 → 500; `unlike` mirrors it with `findFirst` then `delete({where:{id}})` → P2025. chat.service.ts openConversation: `findUnique({where:{pairKey}})` then `create` against `pairKey String @unique` (schema.prisma:113), and createMutualFollowMarker duplicates the identical pattern — so a simultaneous mutual-follow and a 'message' click can collide too. The missing broadcast is also confirmed: `grep -n 'broadcast\|emitToUser' backend/src/artwork/artwork.service.ts` returns only lines 264 and 310, both `artwork:deleted`, and ArtworkSyncProvider.tsx subscribes to `artwork:deleted` and nothing else — a newly published work never reaches another connected client until the 30s staleTime lapses. For a project whose headline is a shared canvas, that is precisely the bullet an evaluator will test.

</details>

---

### ❌ Technical — Sign up and log in securely: email + password, hashed and salted

**Statut : PARTIAL**

**Ce qui manque**

**Registering with any uppercase letter in the email permanently locks the account out.** `backend/src/auth/dto/login.dto.ts:4` transforms the login email with `value?.trim().toLowerCase()`, but `backend/src/auth/dto/register.dto.ts:26-30` only trims — no `.toLowerCase()`. The row is created with the address exactly as typed (`auth.service.ts:33`), and the lookup is an exact match on a case-sensitive Postgres `text` column (`auth.service.ts:64`, `findUnique({where:{email: dto.email}})`). So `Alice@Example.com` registers fine, is stored verbatim, and every subsequent login attempt looks up `alice@example.com`, finds nothing, and returns `{error:'invalid_credentials'}` — forever, with no way for the user to recover. The frontend does not normalise either (`RegisterPage.tsx:81` sends the raw `email` state). `CreateUserDto` (`backend/src/users/dto/create-user.dto.ts:38-42`) has the identical gap, so an admin who types a capitalised address in AddUserDialog creates an account nobody can use. Seeded demo accounts are all lowercase (`tsiory_rakoto@atlaas.local`), so this will not show up in a scripted demo — it shows up the moment an evaluator signs up by hand with the capitalisation their phone keyboard produced. Secondary consequence: `bob@x.com` and `Bob@x.com` can both register as distinct users, defeating the `@unique` intent.

**Comment le lever**

One-line fix: change `register.dto.ts:26` and `create-user.dto.ts:38` to `@Transform(({value}) => value?.trim().toLowerCase())` so all three paths agree. Backfill any existing mixed-case rows with `UPDATE "User" SET email = lower(email);` before reseeding. Verify by hand: register `TestUser@Example.COM` with a strong password, log out, log back in with the same string and with the all-lowercase form — both must succeed. Also confirm with `docker exec ft_pinterest_postgres psql … -c 'select email, left(password,7) from "User" limit 3;'` that stored hashes start with `$2b$10$`.

<details><summary>Contre-expertise</summary>

Downgrade confirmed, and the bug is exactly as described — I read all three sides. login.dto.ts:4 is `@Transform(({ value }) => value?.trim().toLowerCase())`; register.dto.ts:26 is `@Transform(({ value }) => value?.trim())` with no `.toLowerCase()`; create-user.dto.ts:38 has the same gap. auth.service.ts register persists `email: dto.email` verbatim and login does `findUnique({ where: { email: dto.email } })` against a case-sensitive Postgres text column. The frontend does not compensate: RegisterPage.tsx:81 sends `{ username, email, password }` straight from the raw `email` state. So `Alice@Example.com` registers, is stored capitalised, and every later login normalises to `alice@example.com` and misses — a permanent, unrecoverable lockout that an evaluator will trigger the first time they sign up by hand. Hashing itself is correct (bcrypt.hash(…, 10) / bcrypt.compare, hash stripped in /auth/me and in JwtStrategy.validate), which is why this is PARTIAL and not NOT_VALIDATED — but a mandatory requirement that breaks on hand-typed input is exactly what 'only fully functional' is aimed at.

</details>

---

### ❌ Technical — ALL forms and user inputs validated in BOTH frontend AND backend

**Statut : PARTIAL**

**Ce qui manque**

Three inputs are validated on one side only. (1) **Tag count is client-only.** `TAGS_MAX = 5` is enforced at `artwork.validation.ts:33,85` and in `CreatePage.tsx:113-116`, but `CreateArtworkDto` (`backend/src/artwork/dto/create-artwork.dto.ts:38-45`) has `@IsArray @ArrayNotEmpty @IsString({each:true}) @MaxLength(30,{each:true})` and **no `@ArrayMaxSize`** — a curl/Swagger call can attach 500 tags to one artwork, each spawning a Tag row. (2) **Chat pagination is unvalidated.** `backend/src/chat/chat.controller.ts:34-42` takes raw `@Query('page')`/`@Query('limit')` strings with no DTO and passes `Number(page) || 1` / `Number(limit) || 30` straight through to `chat.service.ts:80-88`. `?limit=1000000` becomes `take: 1000001`; `?page=-1` becomes a negative `skip`, which Prisma rejects at runtime → uncaught 500. Contrast `CreateSearchDto`, which caps the same two fields properly. (3) **Search `q` has no length bound** — `create-search.dto.ts:14-17` is `@IsOptional @IsString` with no `@MaxLength`, and `SearchOverlay.tsx:204` sets no `maxLength` on the input, so an arbitrarily long string reaches a Prisma `contains`.

**Comment le lever**

Add `@ArrayMaxSize(5)` to `create-artwork.dto.ts` tags; replace the two raw `@Query` params in `chat.controller.ts` with a small DTO carrying `@Type(()=>Number) @IsInt @IsPositive @Max(100)` like `CreateSearchDto` already does; add `@MaxLength(100)` to `CreateSearchDto.q` and a matching `maxLength` on the search input. Then demonstrate both layers at defense: type an over-long title and show the inline client error, then `curl -k -X POST https://localhost:8443/api/artworks -H 'Authorization: Bearer …' -F 'title=ab'` and show the server's 400 for the same rule.

<details><summary>Contre-expertise</summary>

All three gaps reproduce, and I checked whether the backend compensates elsewhere — it does not. (1) create-artwork.dto.ts imports `Max` but never applies it and has no `@ArrayMaxSize`; the tags decorators are only `@IsArray @ArrayNotEmpty @IsString({each:true}) @MaxLength(30,{each:true})`, and artwork.service.ts's `normalizedtags` path just `connectOrCreate`s whatever arrives — so the client-only TAGS_MAX=5 is the sole cap and a curl can attach hundreds of Tag rows. (2) chat.controller.ts getMessages takes bare `@Query('page') page: string` / `@Query('limit') limit: string` and passes `Number(page) || 1` / `Number(limit) || 30` into chat.service.ts, which computes `skip: (page - 1) * limit` and `take: limit + 1` — `?page=-1` produces a negative skip that Prisma rejects at runtime (uncaught → 500), `?limit=1000000` produces `take: 1000001`. The contrast with CreateSearchDto (`@Type(()=>Number) @IsInt @IsPositive @Max(1000)`) proves the team knows the pattern and simply missed this route. (3) create-search.dto.ts `q` is `@IsOptional @Transform(trim) @IsString` with no `@MaxLength`. Every genuine <form> is double-validated, but the tag-count cap is a form field guarded on one side only, so PARTIAL stands.

</details>

---

### ❌ Chapter VI — README compliance (mandatory)

**Statut : PARTIAL**

**Ce qui manque**

Concretely, to be compliant the following must be added or fixed in README.md:
1. DELETE the dead scaffolding at :68-70 and the duplicate `## Features List:` at :210; merge the two Resources link lists (:65-67 into :73-77) and fix the three broken link syntaxes.
2. DELETE the stale parenthetical at :218 ("backend changes are local & uncommitted") — it is false; the guard, decorator, enum and DTO are all tracked.
3. Fill or remove all 8 placeholders (:50, :120, :121, :129, :130, :131, :148, :149) and un-escape the logins at :104-107. Remove the ELK and WAF lines outright — neither exists.
4. Fix :59 to `https://localhost:8443`; rewrite :37-51 to cover all three .env files with the correct variable per file; add OpenSSL to prerequisites and restate Node's real role (host-side seeding); add the Grafana URL and a pointer to `docs/CREDENTIALS.md`.
5. Write Individual Contributions for nrakotom and srabeman (currently empty at :256-257) and add a "challenges faced" paragraph for all four — the word does not appear in the file.
6. Rewrite the Modules section: per module give type, points, why chosen, how implemented (with file paths), and the responsible member; then a correct arithmetic total. Resolve the framework double-claim (:214 vs :226-227 — pick the Major or the two Minors, not both) and either check or delete the contradictory unchecked entries (:216, :219, :221, :238-240) for work that is implemented.
7. Complete the Features List: add rows (with owners) for notifications, GDPR, i18n, RTL, monitoring, health/backups/DR, design system, file upload, analytics dashboard; reconcile :195 (OAuth credited) with :239 (OAuth unchecked).
8. Complete the Database Schema: add Conversation, ConversationParticipant and Message; document the Role/Provider/MessageKind enums; fix :180 (`USER/ADMIN` → `USER/ADMIN/GUEST`) to match `backend/prisma/schema.prisma:96-100` and to stop contradicting :205.
9. Flesh out Team Information (names + real responsibilities) and Project Management (branching/PR/issue workflow, cadence).
10. Fix the markdown: `- []` → `- [ ]` at :216, :219, :221, :238-240; replace all tab indentation at :217, :220-222, :233, :238-240 with spaces; delete the tab-only lines.
11. Translate :234 "Multilingue" → "Internationalization (3 languages)".
12. Either promote README_DRAFT.md into README.md (after clearing its own 4 TODO markers at :352-355, :374-377, :379-380 and the stray :369 comment) or delete it from the repo.

**Comment le lever**

Render README.md on GitHub (or any GFM previewer) and read it top to bottom as an evaluator would, checking off Chapter VI's twelve required elements one by one; every defect above is visible in the rendered output. Then verify the run path independently: `grep -n 'listen' nginx/nginx.conf` (8443 is ssl, 8080 is plain) against README:59; `cat .env.example backend/.env.example frontend/.env.example` against README:42-51; `git ls-files backend/src | grep -i role` against the README:218 claim; `grep -nE '^model |^enum ' backend/prisma/schema.prisma` against the README:168-185 table; `grep -riE 'elasticsearch|logstash|kibana|modsecurity' --include='*.yml' --include='*.conf' .` (returns nothing) against README:148-149. Recompute the module total by hand from the checkboxes at :214-240 and compare with :242.

<details><summary>Contre-expertise</summary>

AGREE — PARTIAL is correct, and I independently re-verified every factual claim. Not one was wrong.

VERIFIED BY DIRECT INSPECTION:
- Authors: `git shortlog -sne --all` gives srabeman 153, trindran 61, nrakotom 41, cramaros 22, plus `Pendragon46 <160462125+Pendragon46@users.noreply.github.com>` 6. `.mailmap:7-8` explicitly says "Not mapped: Pendragon46 … identity unconfirmed". Exactly as reported.
- Scaffolding: `README.md:68-70` are three bare headings `## Description` / `## Instruction` / `## 📚 Resources` with no content, duplicating `# Description` (:5), `# Instruction` (:20) and `# Resources` (:63), with two competing link lists at :65-67 and :73-77. Confirmed.
- Duplicate `## Features List:` at :189 (13-row table) and :210 (empty, nothing before `## Modules:` at :212). Confirmed.
- The stale note at :218 is false: `git ls-files backend/src | grep -i role` returns `backend/src/decorators/roles.decorator.ts`, `backend/src/enums/role.enum.ts`, `backend/src/roles/roles.guard.ts`, `backend/src/users/dto/update-roles.dto.ts` — all committed. And `docs/local_backend_changes.md:6` literally reads "Contrairement aux itérations précédentes, **le backend est committé ici**", contradicting the README that cites it; the path in the README also omits `docs/`.
- Wrong scheme: `README.md:59` is the only app-URL line and says `http://localhost:8443`; `nginx/nginx.conf:7` is `listen 8080;` and `:16` is `listen 8443 ssl;`. I grepped README.md for `https://localhost` — zero hits. Confirmed, and it directly undercuts the mandatory-HTTPS requirement.
- Env instructions: `Makefile:21-22` loops over `.env backend/.env frontend/.env`; README:38 gives only `cp .env.example .env`. Root `.env.example` contains only POSTGRES_USER/PASSWORD/DB + GRAFANA_ADMIN_USER/PASSWORD — none of which README:42-51 lists — while every variable README:42-51 does list (DATABASE_URL, JWT_SECRET, CLOUDINARY_*, GOOGLE_CLIENT_ID/SECRET) lives in `backend/.env.example`, which also carries FRONTEND_URL, PORT, DEFAULT_AVATAR_PUBLIC_ID and GOOGLE_CALLBACK_URL that README never mentions. `frontend/.env.example` (VITE_API_URL=/api) is unmentioned entirely. Confirmed, worse than described.
- OpenSSL/Node: `Makefile:32` is `start: env certs build`; `certs` (`:6-11`) shells out to `openssl x509` / `openssl req`, and `:55` runs `NODE_EXTRA_CA_CERTS=… node seed-network.mjs` on the host. Prerequisites (:26-31) list neither OpenSSL nor Node's real role. Confirmed.
- ELK/WAF: `grep -riE 'elasticsearch|logstash|kibana|modsecurity'` over yml/yaml/conf/Dockerfile returns zero hits, yet README:148-149 claims both. These are false claims about a Major module, not mere placeholders. Confirmed.
- Schema: `grep -nE '^model |^enum ' backend/prisma/schema.prisma` gives 9 models (User, Artwork, Like, Comment, Follow, Tag, Conversation:107, ConversationParticipant:117, Message:134) and 3 enums; README:168-175 documents 6 tables — the whole chat data model is undocumented. `schema.prisma:96-100` is `enum Role { USER ADMIN GUEST }`, while README:180 says `role (USER/ADMIN)` and README:205 says "USER/ADMIN/Guest" — the README contradicts itself and the schema. Confirmed.
- Markdown: `cat -A` on :212-245 shows literal `^I` tab-indented items at :220, :221, :233, :238, :239, :240 and tab-only "blank" lines at :217 and :222, plus `- []` (no space, not GFM task-list syntax) at :216, :219, :221, :238-240. Confirmed exactly.
- Arithmetic: 4 checked Majors (:214, :215, :218, :220) x2 = 8, plus 12 checked Minors (:226-237) = 12, total 20 — not the 23 claimed at :242 ("Excpected", misspelled). And :214 bills the framework Major while :226-227 bill the same work as two Minors. Confirmed.
- Empty sections: `- nrakotom :` (:256) and `- srabeman :` (:257) have nothing after them before EOF at 260; srabeman is the largest contributor at 153 commits. "challenge" appears nowhere in the file. Confirmed.
- README_DRAFT.md is git-tracked, 416 lines, and still carries TODO markers — one correction to the original verdict's line numbers: they are at :342, :369 (`// total points = 2+2+…= 22`), :380, :384 (`- **srabeman** — TODO`), :385 (`- **nrakotom** — TODO`) and :416, i.e. five TODO markers plus the stray comment, not the :352-355/:374-377/:379-380 cited. Substance unchanged, the defect is real.

WHY NOT NOT_VALIDATED: every one of Chapter VI's required headings physically exists and most carry real, non-template content (AI usage :86-96, DB justification :140-144, technical-choice justification :151-158, a real single-command `make start` that the Makefile genuinely implements, a schema diagram file present at the repo root). The document is incomplete and in places factually wrong, not absent — PARTIAL is the accurate classification, and it already carries the correct practical consequence (an evaluator can legitimately reject on the empty Individual Contributions and the justification-free Modules section).

</details>

---

### ✅ Critères satisfaits

<details><summary><b>General — Web application with frontend, backend and a database</b></summary>

**Preuve** — Three real tiers, all containerised. Frontend: React 19 + Vite SPA, `E:\Work\42\atlaa\frontend\package.json:14-33` (react ^19.2.6, react-router-dom ^7.17.0, @tanstack/react-query, zustand, socket.io-client), entry `frontend/src/main.tsx:1-13`, 82 .tsx files under `frontend/src/`. Backend: NestJS 11, `backend/package.json:20-50` (@nestjs/core ^11.1.28, platform-socket.io, passport, swagger, throttler), bootstrap `backend/src/main.ts:8-42`, 18 feature modules registered in `backend/src/app.module.ts:32-51` (users, artwork, follow, likes, comment, auth, search, friends, websocket, chat, health, metrics). Database: PostgreSQL 16 service `docker-compose.yml:47-70` (`postgres:16-alpine`, named volume `postgres_data`, `pg_isready` healthcheck), accessed through Prisma 6 (`backend/prisma/schema.prisma:1-8`, `provider = "postgresql"`). 27 committed migrations under `backend/prisma/migrations/` are applied at boot by `backend/docker-entrypoint.sh:11` (`npx prisma migrate deploy`).

</details>

<details><summary><b>General — Git: commits from all team members, meaningful messages, work distribution</b></summary>

**Preuve** — 278 commits. `git log --format='%an|%ae' | sort | uniq -c` proves all four members committed, under 28 name/host pairs that collapse to 4 people: srabeman (Sedra Rabemanantsoa) 90+40+1 = 131 school commits + 16 as `Sesedra <nyainarabemanantsoa@gmail.com>` + 1 as `Sedra_Rabe` = 148; trindran (Toky Nicky Rindranirina) = 61 across 15 cluster hosts; nrakotom (Ny Hanta Yves Rakotomalala) = 41; cramaros/ckeven (Ckeven Ramaroson) = 12+11 = 23 (`cramaros@c1r3s2`, `cramaros@c1r7s15`, `ckevenjack@gmail.com`). Six more are `Pendragon46 <160462125+Pendragon46@users.noreply.github.com>` GitHub-UI merge commits. Every member is active across the whole window and up to the final days: srabeman 2026-07-05→08-01, trindran 2026-06-22→08-03, nrakotom 2026-07-02→07-31, cramaros 2026-07-23→08-03, ckevenjack 2026-06-11→08-02. Message quality is majority-good: 136 of 278 use conventional prefixes with real descriptions (e.g. `fix(security): broken access control, PII leaks and a lying delete confirmation`, `fix(infra): make a fresh clone actually start`, `feat(search): search by author + popularity-ranked tag suggestions`), 25 are merges.

**Réserve** — ~35 commits carry no information: `feature-auth` x11, `docs` x9, plus `fix`, `cleaning`, `refactor`, `merge`, `test OK`, `fix-health`, `fix-delete`, `fix-Oauth`, `fix UX`, `docs:good luck guys :D`, and `No space left for my VM and I'm just saving my current work before removing all caches...`. Distribution is lopsided — srabeman authored 148/278 (53%) versus cramaros' 23 (8%). An untracked `.mailmap` sits in the working tree (`git status --porcelain` → `?? .mailmap`); committing it would make the 28 identities resolve to 4 names in `git shortlog -sn`, which is exactly what the evaluator will run. Separately, `docs/COLD_START_TEST.md:24` flags a GitHub PAT embedded in the remote URL, and `git remote -v` confirms it is still there (`https://Pendragon46:ghp_…@github.com/...`) — revoke it before the demo.

</details>

<details><summary><b>General — Containerized deployment with a SINGLE command</b></summary>

**Preuve** — `make start` is one command and does everything. `Makefile:32` — `start: env certs build` then `docker compose up -d --build`, a readiness poll on `https://localhost:8443/api/search/artworks`, then `make seed`. `Makefile:21-29` (`env`) copies `.env`, `backend/.env` and `frontend/.env` from their `.example` files if absent, never overwriting — this is what makes a clean clone bootable, since all three are gitignored and `docker-compose.yml` interpolates `${POSTGRES_*}`/`${GRAFANA_*}` from the root one. `Makefile:6-16` (`certs`) generates a self-signed cert idempotently and asserts a subjectAltName is present (a CN-only cert would break Node's trust for `make seed`). `docker-compose.yml` declares 10 services — frontend, backend, postgres, nginx, backup, prometheus, grafana, alertmanager, postgres_exporter, node_exporter — with `depends_on: condition: service_healthy` chains and healthchecks on each. Migrations run automatically at container start (`backend/docker-entrypoint.sh:5-14`: wait on `nc -z postgres 5432`, then `npx prisma migrate deploy`). Lifecycle targets exist: `stop`, `rebuild`, `restart`, `logs`, `ps`, `clean-volumes`, `fclean`.

**Réserve** — Four risks, none of which block the single command itself. (1) README.md:59 tells the evaluator the app is at `http://localhost:8443` — that is the TLS port; plain HTTP there returns nginx's "The plain HTTP request was sent to HTTPS port" error page. It must read `https://`. (2) README.md:38-50 says to `cp .env.example .env` and then lists `DATABASE_URL/JWT_SECRET/CLOUDINARY_*/GOOGLE_*` as the root `.env` contents — but the root `.env.example` holds only `POSTGRES_*`/`GRAFANA_*`; those variables live in `backend/.env`. An evaluator following the README instead of `make start` puts the secrets in the wrong file and gets an unusable backend. Line 50 still reads `# [add any other required variables]`. (3) `make seed` (`Makefile:54-56`) requires Node 18+ *on the host*, outside Docker, and the seed uploads through `POST /artworks` → Cloudinary (`seed-network.mjs:172-177`), so a clone with the placeholder `CLOUDINARY_*` from `backend/.env.example:16-18` boots to a completely empty canvas. (4) Both app containers run development servers, not builds: `frontend/Dockerfile:15` (`npm run dev -- --host`) and `backend/docker-entrypoint.sh:14` (`npm run start:dev`, i.e. `nest start --watch`). The team's own `docs/COLD_START_TEST.md:233` ends with "reste à le prouver sur une vraie machine vierge" — the cold start has never actually been run.

</details>

<details><summary><b>General — Compatible with the latest stable Google Chrome</b></summary>

**Preuve** — Nothing in the codebase outruns current Chrome. The only modern platform features used are `structuredClone` (`frontend/src/features/artworks/components/HeartBurst.tsx:25`, Chrome 98+), the `svh`/`dvh` viewport units (`frontend/src/pages/HomePage.tsx:17`, `frontend/src/features/chat/components/MessagesButton.tsx:86`, Chrome 108+), `inert` (commit `fix: use inert instead of aria-hidden on the refocus button`, Chrome 102+), `IntersectionObserver` (`frontend/src/features/legal/LegalPage.tsx:52`) and Pointer Events (`frontend/src/features/artworks/canvas/useCanvasCamera.ts:510`). No `:has()`, `@container`, `popover`, `anchor-name`, `field-sizing`, `scrollend` or `Intl.Segmenter`. Vite 8 with `@vitejs/plugin-react` targets baseline-modern browsers by default (`frontend/vite.config.ts:7-10`, no `build.target` override). `npx tsc -b` exits 0 and `npx vite build` completes ("✓ built in 2.73s"), so nothing fails to compile for the browser.

**Réserve** — Nothing that blocks Chrome. Note the app is served by the Vite dev server in the container, so what Chrome executes at defense is the unminified dev bundle, not the artifact `vite build` produces.

</details>

<details><summary><b>General — Privacy Policy and Terms of Service, real content, easily reachable</b></summary>

**Preuve** — Both documents are real, substantial and trilingual. `frontend/src/pages/PrivacyPage.tsx:1-5` and `TermsPage.tsx` each render the shared `LegalPage` (`frontend/src/features/legal/LegalPage.tsx:28-176`), which pulls a `{heading, body}[]` array from i18n and renders numbered `<section>`s with a scroll-spied sticky table of contents. Content check via node against `frontend/src/lib/i18n/locales/en/common.json`: Privacy has **7 sections** — 1. Introduction (315 chars), 2. Information We Collect (531), 3. How We Use Your Information (349), 4. Sharing Your Information (423), 5. Your Rights and Choices (339), 6. Data Security (513), 7. Changes to This Policy (293); Terms has **10 sections** — Acceptance, Eligibility and Accounts, Your Content, Acceptable Use, Intellectual Property, Third-Party Services, Termination, Disclaimers and Limitation of Liability, Changes, Governing Law and Contact. The prose is specific to this app, not lorem: §2 names "a password, which is never stored in plain text — only as a secure hash", "basic Google profile information if you choose to sign in with Google", "who you follow"; §5 grants access/correct/delete/export/restrict plus the right to lodge a DPA complaint. Interpolated facts come from one config (`frontend/src/features/legal/legal.config.ts:6-11`: contactEmail `privacy@atlaas.app`, jurisdiction `France`, minAge 15, lastUpdated 2026-07-14), filled by `LegalPage.tsx:41-42`. All three languages carry the identical 7/10 section counts (verified by loading fr/ar JSON), and `node scripts/check-i18n.mjs` enforces that parity in CI. Reachability: footer links on the landing page — `frontend/src/pages/HomePage.tsx:39-44`, a `<nav>` pinned `absolute inset-x-0 bottom-0` with `pointer-events-auto`, `<TextLink to="/privacy">` and `<TextLink to="/terms">`; plus consent microcopy on both auth forms (`RegisterPage.tsx:179-186`, `LoginPage.tsx:143-150`), the 404 page (`NotFoundPage.tsx:71,78`) and the admin shell (`AdminPage.tsx:115-119`). Routes are wired at `frontend/src/app/router.tsx:46-47`. `docs/LEGAL_CONTENT.md` (113 lines) is the canonical source of record for the copy.

**Réserve** — Only cosmetic: `legal.config.ts:4-5` still carries a `// TODO: confirm with the team before shipping (real contact, hosting jurisdiction, minimum age)`, and `docs/ARCHITECTURE.md` still lists "Real Privacy Policy + Terms content" under "Still TODO" (LEGAL_CONTENT.md acknowledges this refers to the facts, not the prose). The footer with the two links exists only on `/` and `/admin`; Profile, Settings, Create, Artwork and Status have no footer — the subject says "easily reachable (e.g. footer links)" and the landing page satisfies that, but a global footer would remove all doubt.

</details>

<details><summary><b>Technical — Frontend clear, responsive and accessible across all devices</b></summary>

**Preuve** — Accessibility is the strongest part of this codebase and is clearly deliberate. 242 `aria-*` attributes and 49 explicit `role=` across 82 .tsx files; 226 `focus-visible:` rings so keyboard focus is visible everywhere; 83 `motion-reduce:` guards plus a `prefers-reduced-motion` media query before programmatic scrolling (`frontend/src/features/legal/LegalPage.tsx:77-78`); 18 `sr-only` live labels. Forms: `frontend/src/components/ui/Input.tsx:39-83` — every field has a real `<label htmlFor>` bound to a `useId()`, `aria-invalid` on error, `aria-describedby` pointing at the message, the error rendered with `role="alert"`, and the password reveal toggle carries `aria-label` + `aria-pressed` with the icon `aria-hidden`. Modal: `frontend/src/components/ui/Modal.tsx:115-116` is `role="dialog" aria-modal="true"`, focuses the panel on open (line 38), restores the previously-focused element on close (line 51), closes on Escape (line 60) and contains a full Tab/Shift+Tab trap that pulls focus back from `<body>` (lines 69-94). The infinite canvas — the hardest surface to make accessible — is `role="region"` with an `aria-label`, `tabIndex={0}` and an inset focus ring (`frontend/src/features/artworks/canvas/ArtworkCanvas.tsx:206-212`) and is fully arrow-key pannable (`useCanvasCamera.ts:471-489`). `<html lang>` and `<html dir>` are kept in sync with the active language for RTL (`frontend/src/lib/i18n/index.ts:36-44`). Responsive: `<meta name="viewport" content="width=device-width, initial-scale=1.0">` (`frontend/index.html:6`), 88 breakpoint utilities across 26 files, `h-svh`/`dvh` for mobile browser chrome, the chat panel is full-screen on phones and a floating 26rem card from `sm:` up (`frontend/src/features/chat/components/MessagesButton.tsx:86`), the legal pages collapse their sticky ToC below `md:` (`LegalPage.tsx:111-113`), and the canvas owns every touch gesture with pinch-zoom and `touch-none select-none overscroll-none` (`ArtworkCanvas.tsx:210-212`).

**Réserve** — One inconsistency: `frontend/src/pages/StatusPage.tsx` (251 lines) is written entirely in inline `style={{…}}` objects rather than Tailwind, and every string in it is hardcoded English ("System status", "Refresh", "Loading status…", "Checked at …") with no `useTranslation`. It is not linked from any nav, so an evaluator only reaches it by typing `/status`, but if they do it looks like a different project and breaks the i18n claim.

</details>

<details><summary><b>Technical — A CSS framework or styling solution</b></summary>

**Preuve** — Tailwind CSS v4 via the first-party Vite plugin. `frontend/package.json:16,29` (`@tailwindcss/vite ^4.3.2`, `tailwindcss ^4.3.2`), registered at `frontend/vite.config.ts:9` (`tailwindcss()`), imported at `frontend/src/index.css:1` (`@import "tailwindcss"`). The v4 CSS-first config is used properly: `index.css:6-13` declares an `@theme` block overriding `--font-sans` (Inter Variable) and `--font-serif` (Hedvig Letters Serif) plus five named animation tokens (`--animate-shimmer`, `--animate-reveal`, `--animate-settle`, `--animate-chat-view`, `--animate-typing`), with an `@layer base` mapping all `h1`-`h6` to the display serif (lines 29-44) and custom `@keyframes` below. Fonts are self-hosted through `@fontsource` (`frontend/src/main.tsx:4-5`), so no external Google Fonts request. RTL is handled with logical properties throughout (`ps-`/`pe-`/`ms-`/`me-`/`text-start`/`border-s-2`, e.g. `Input.tsx:48-49`, `LegalPage.tsx:103,127`). `npx vite build` emits a single 59.23 kB CSS bundle, confirming the pipeline works end to end.

**Réserve** — Nothing. Note README.md:129 still reads `- **Styling**: [Tailwind CSS / Bootstrap / other — fill in]` — an unfilled template placeholder in the very document the evaluator reads first.

</details>

<details><summary><b>Technical — Credentials in a local .env ignored by Git, plus .env.example</b></summary>

**Preuve** — `.gitignore:1` contains a bare `.env`, which in git matches a file of that name at any depth — so `.env`, `backend/.env` and `frontend/.env` are all ignored. `git ls-files | grep -i env` returns exactly three files and all are templates: `.env.example`, `backend/.env.example`, `frontend/.env.example`. `git log --name-only -- .env backend/.env frontend/.env` returns nothing, proving no real .env was ever tracked. `.gitignore` also excludes the seed password files (`seed-credentials.json`, `seed-network-credentials.json`, `READMELOGIN.md`) and the TLS material (`nginx/ssl/*.key`, `nginx/ssl/*.crt`). The examples are complete and usable: root (`.env.example:1-7`) carries `POSTGRES_USER/PASSWORD/DB` + `GRAFANA_ADMIN_USER/PASSWORD`; `backend/.env.example` is documented section by section with `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `PORT`, `CLOUDINARY_*`, `DEFAULT_AVATAR_PUBLIC_ID`, `GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL`; `frontend/.env.example` sets `VITE_API_URL=/api` with a comment explaining why relative beats absolute. `Makefile:21-29` turns the examples into working files on a clean clone without ever overwriting an existing one. Both Docker builds exclude `.env` from the image context (`backend/.dockerignore`, `frontend/.dockerignore`), so secrets arrive only via compose `env_file`.

**Réserve** — Two hygiene problems that are not the letter of the rule but that an evaluator can find in 30 seconds. (1) **Real secrets are in git history.** Walking `backend/.env.example` through every commit that touched it surfaces commit `e74e3ea` with `GOOGLE_CLIENT_SECRET=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` and commit `babacc3` with `CLOUDINARY_API_SECRET=maYJtOl42pYuUAUxr7xFbp8hfT4`. HEAD is clean (placeholders only), and the team knew — the log has `delete credential api on git`, `Clear Google API credentials in .env.example`, `chore(security): untrack TLS material, drop leaked webhook` — but removing a secret from HEAD does not remove it from history. (2) **The auto-copied defaults are themselves insecure.** Because `make env` seeds from the examples unattended, a clean clone runs with `JWT_SECRET=jwtsecret` (`backend/.env.example:7`) — a publicly known signing key, so anyone can forge an admin token — and Grafana admin at `change_me` (`.env.example:7`). Nothing forces either to be changed.

</details>

<details><summary><b>Technical — Database with a clear schema and well-defined relations</b></summary>

**Preuve** — `backend/prisma/schema.prisma` defines 9 models and 3 enums with real constraints. User (lines 10-33): `@id @default(uuid())`, `username`/`email`/`googleId` all `@unique`, nullable `password` (Google accounts), `provider Provider @default(LOCAL)`, `role Role @default(USER)`, `avatarUrl` with a schema-level default, `createdAt`/`updatedAt`. Relations are explicit and typed: Artwork→User `onDelete: Cascade` with `@@index([authorId])` and `@@index([createdAt])` (lines 36-53); Like carries `@@unique([authorId, artworkId])` so a double-like is impossible at the DB level (line 62); Comment cascades from both artwork and user (lines 67-75); Follow is a proper self-referential join with a composite primary key `@@id([followerId, followingId])` and two disambiguated named relations `"Follower"`/`"Following"` (lines 77-87); Tag↔Artwork is implicit many-to-many with `name @unique` and `@@index([name])` (lines 89-97). The chat subsystem is equally rigorous: Conversation has `pairKey String @unique` (line 113) so a pair can only ever have one thread, ConversationParticipant is a composite-PK join table with `lastReadAt` for unread state and `@@index([userId])` (lines 121-131), and Message uses a `MessageKind` enum to model USER vs SYSTEM rows, a nullable `senderId`, an optional `artworkId` with `onDelete: SetNull` so sharing a work that is later deleted degrades gracefully, and `@@index([conversationId, createdAt])` for paged history (lines 139-155). Enums: `Role {USER, ADMIN, GUEST}`, `Provider {LOCAL, GOOGLE}`, `MessageKind {USER, SYSTEM}`. 27 sequential migrations under `backend/prisma/migrations/` document the evolution and are replayed by `backend/docker-entrypoint.sh:11`. A rendered ERD ships at `diagram_prisma.png` and is embedded in the README.

**Réserve** — Documentation drift only: the README's "Tables and relationships" table (README.md ~168-176) lists just User, Artwork, Tag, Like, Comment, Follow — it omits Conversation, ConversationParticipant and Message entirely, i.e. a third of the schema and the whole chat feature. Also `Role.GUEST` exists in the enum but is dead: the frontend type is `'USER' | 'ADMIN'` (`frontend/src/features/auth/auth.types.ts:1`), `ALL_ROLES` offers only those two (`frontend/src/features/admin/roleBadge.ts:13`), and `docs/local_backend_changes.md` records the decision that "guest" means an anonymous visitor, not a role.

</details>

<details><summary><b>Technical — Any browser/script/external connection to the backend must use HTTPS</b></summary>

**Preuve** — Every browser-reachable path is TLS. nginx terminates TLS on 8443 with TLSv1.2/1.3 and `HIGH:!aNULL:!MD5` (`nginx/nginx.conf:14-19`), and port 8080 does nothing but `return 301 https://$host:8443$request_uri` (`nginx.conf:6-13`), so plain HTTP cannot reach the app. Security headers are set (`nginx.conf:23-26`: X-Frame-Options SAMEORIGIN, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin; `server_tokens off`). The frontend never hardcodes a host: `VITE_API_URL=/api` (`frontend/.env.example`) feeds `axios.create({baseURL})` (`frontend/src/lib/http.ts:12-15`) and the socket connects to `'/'` (`frontend/src/features/presence/socket.ts:26`), so both inherit the page's `https:`/`wss:` scheme. nginx proxies `/api/`, `/socket.io/` (with `Upgrade`/`Connection` headers for the WS handshake), `/grafana/` (including its Live websocket) and `/prometheus/` all behind the same 8443 listener (`nginx.conf:42-140`). No mixed content: a grep for `http://` across `frontend/src` and `frontend/index.html` returns only SVG xmlns namespace strings and data: URIs — zero network URLs. All Cloudinary media is stored as `secure_url` (`backend/src/artwork/artwork.service.ts:72`, `backend/src/auth/auth.service.ts:104`, `backend/src/users/users.service.ts:149`) and the schema's default avatar is `https://res.cloudinary.com/…` (`schema.prisma:20`). Fonts are bundled locally (`frontend/src/main.tsx:4-5`), so there is no third-party font request at all. Google OAuth returns over TLS (`GOOGLE_CALLBACK_URL=https://localhost:8443/api/auth/google/callback`). Even the seed script goes through HTTPS and trusts the cert properly rather than disabling verification: `SEED_API` defaults to `https://localhost:8443/api` (`seed-network.mjs:24`) and `Makefile:56` sets `NODE_EXTRA_CA_CERTS=nginx/ssl/nginx.crt` instead of `NODE_TLS_REJECT_UNAUTHORIZED=0`. Grafana, Prometheus, Alertmanager and both exporters use `expose` only — none is published to the host, so they are reachable solely through the TLS proxy.

**Réserve** — Two notes, neither breaking the rule. `docker-compose.yml:57-58` publishes Postgres on the host as `5432:5432` — not a browser path, but an unnecessary open port on the demo machine that an evaluator may ask about. And the cert is self-signed (`Makefile:6-16`), so Chrome shows its interstitial on first load; that is normal for 42, but rehearse clicking through it so it does not look like a failure.

</details>

<details><summary><b>[General/Technical requirement] Frontend clear, responsive and accessible across all devices + a CSS framework</b></summary>

**Preuve** — Responsive and styling are fine. Tailwind CSS v4 via `@tailwindcss/vite` (`frontend/package.json:20`, `frontend/vite.config.ts:9`), theme tokens declared in `frontend/src/index.css:6-14` (`--font-sans` Inter Variable, `--font-serif` Hedvig Letters Serif, four named animations), self-hosted fonts bundled by Vite with no external request (`frontend/src/main.tsx:3-5`). 88 breakpoint usages across 26 components: mobile-first patterns like `md:grid-cols-2` (`CreatePage.tsx:215`), `md:grid-cols-[13rem_1fr]` (`SettingsPage.tsx:228`), `sm:flex-row` (`ProfilePage.tsx:144`), a sidebar that collapses to top tabs (`AdminPage.tsx:71` `hidden … lg:flex` vs `:147` `lg:hidden`), and a chat panel that goes full-screen on mobile then docks on desktop (`MessagesButton.tsx:86` `fixed inset-0 … sm:absolute sm:inset-auto sm:end-0 sm:w-[26rem]`). `min-h-svh`/`h-svh` used instead of `vh` so mobile browser chrome does not clip. `break-words` applied defensively against unbroken user strings (`ProfilePage.tsx:156-166`).

**Réserve** — "Accessible across all devices" is undercut by the same items detailed in the WCAG row — most visibly the ~40 `text-neutral-400` text uses at 2.58:1 contrast, which are worst on phones outdoors, and the absence of any skip mechanism.

Separately, one page bypasses the CSS framework entirely: `frontend/src/pages/StatusPage.tsx` is built from ~30 inline `style={{…}}` objects (`:57-67`, `:72-84`, `:128-136`, `:150-158`, `:171-180`, `:187-191`, `:239-245`) with its own hardcoded hex palette (`#15803d`, `#b45309`, `#b91c1c`, `#475569`, `#64748b`, `#94a3b8`, `#e2e8f0`, `#f1f5f9`) that matches neither the Tailwind neutral ramp nor the brand `#252c55`/`#a9b5ea`. It also has no responsive rules beyond `maxWidth: 640`, no `AppHeader`, and duplicates the whole design system by hand. It is inconsistent with the "custom-made design system" minor the team claims at `README.md:232`.

</details>

---

## 3. Modules validés

**Sous-total : 10 points.**

| Module | Type | Points |
|---|:---:|:---:|
| [DevOps] Major — Monitoring with Prometheus AND Grafana | major | 2 |
| [Web] Major — Real-time features using WebSockets | major | 2 |
| [Web] Major — Use a framework for both the frontend and the backend | major | 2 |
| [Accessibility & i18n] Minor — RTL support (1+ RTL language, complete layout mirroring, RTL-specific adjustments, seamless switching) | minor | 1 |
| [User Management] Minor — OAuth 2.0 remote authentication (Google) | minor | 1 |
| [Web] Minor — Custom-made design system (min. 10 reusable components, colour palette, typography, icons) | minor | 1 |
| [Web] Minor — Use an ORM | minor | 1 |

<details><summary><b>[DevOps] Major — Monitoring with Prometheus AND Grafana</b> — 2 pt</summary>

**Preuve** — ALL FIVE BULLETS ARE MET IN CODE. The README leaving this unchecked is simply wrong — it is claimable as-is.

(1) PROMETHEUS SET UP — `monitoring/prometheus.yml:1-3` global scrape/eval interval 15s; `:5-6` `rule_files: - "alert_rules.yml"` (relative path resolves against the config dir `/etc/prometheus/`, which is exactly where `docker-compose.yml:130` mounts it — correct); `:8-11` `alerting.alertmanagers → targets: ['alertmanager:9093']`. Container at `docker-compose.yml:119-144`, with `--web.external-url=https://localhost:8443/prometheus/` + `--web.route-prefix=/` (`:133-134`) — the correct pairing for sub-path proxying, and a readiness healthcheck at `:140-144`.

(2) EXPORTERS CONFIGURED — three real scrape jobs at `monitoring/prometheus.yml:13-25`: `backend:3000/metrics`, `postgres_exporter:9187`, `node_exporter:9100`. Both exporters are real containers: `docker-compose.yml:180-197` (`prometheuscommunity/postgres-exporter`, DATA_SOURCE_NAME wired to the compose postgres, `depends_on: service_healthy`) and `:199-218` (`prom/node-exporter` with `/proc`, `/sys`, `/` bind-mounted and `--path.procfs`/`--path.sysfs` set). The backend target is genuinely scrapeable: `backend/src/metrics/metrics.controller.ts:5-6` marks the controller `@Public()` so the global `JwtAuthGuard` (`backend/src/app.module.ts:56-59`, honouring class-level `@Public` at `backend/src/auth/jwt-auth.guard.ts:13-20`) lets Prometheus through; `backend/src/metrics/metrics.service.ts:8-18` registers a `http_requests_total` counter plus `collectDefaultMetrics` on a private registry, and `metrics.interceptor.ts:15` is bound globally at `app.module.ts:60` so the counter actually moves.

(3) CUSTOM GRAFANA DASHBOARD — `monitoring/grafana/dashboards/ft_pinterest.json` is a REAL hand-built dashboard, not a stock import. Proof it is not stock: there is no `__inputs`/`__requires` block (which every grafana.com import carries), the datasource uid is hard-coded to the project's own provisioned `prometheus` uid, and two of the six panels query metrics that exist ONLY in this project's backend — `:485` `increase(http_requests_total{job="backend"}[5m])` (the counter defined in `metrics.service.ts:8-12`) and `:587` `nodejs_heap_size_used_bytes{job="backend"}`. Six panels total: System status stat with 4 targets (`:80` `up{job="backend"}`, `:91` `pg_up{job="postgres"}`, `:103` `up{job="node"}`, `:115` `up{job="postgres"}`), CPU (`:217`), RAM (`:319`), Disk (`:421`), HTTP requests (`:485`), Node heap (`:587`); title `ft_pinterest` (`:619`), uid `sujkjsr` (`:621`). Provisioned automatically: datasource `monitoring/grafana/provisioning/datasources/prometheus.yml:4-9`, dashboard provider `monitoring/grafana/provisioning/dashboards/dashboards.yml:4-12` pointing at `/var/lib/grafana/dashboards`, both mounted at `docker-compose.yml:167-169`. So it survives a `make fclean` + fresh clone.

(4) ALERTING RULES — `monitoring/alert_rules.yml:1-56` defines SIX rules with severity labels and summary/description annotations: BackendDown (`:4-11`), PostgresDown (`:13-20`), PostgresExporterDown (`:22-29`), NodeExporterDown (`:31-38`), HighCPUUsage (`:40-47`), HighMemoryUsage (`:49-56`). A real Alertmanager container is wired in (`docker-compose.yml:220-236`, config mounted read-only, `--config.file` set, `/-/ready` healthcheck) and Prometheus is pointed at it. On the placeholder receiver question (`monitoring/alertmanager.yml:11-17`, `url: http://127.0.0.1:9095/`): the subject's bullet is literally "set up alerting RULES", and the rules are authored, loaded and routed to a running Alertmanager — the bullet is met. Nothing listens on 9095 inside the container, so a notification will never be *delivered*, but delivery to a third-party endpoint is not what the bullet asks for, and shipping a live webhook URL would be worse. Demo the firing state via Prometheus's own `/prometheus/alerts` page.

(5) SECURE ACCESS TO GRAFANA — Grafana is NOT published to a host port; `docker-compose.yml:163-164` uses `expose: 3000` only, so the single reachable path is nginx TLS on 8443 (`nginx/nginx.conf:43-57`, with the WS upgrade for Grafana Live). Credentials are required: `docker-compose.yml:151-152` sets `GF_SECURITY_ADMIN_USER`/`GF_SECURITY_ADMIN_PASSWORD` from `.env` (`.env:5-6`), and there is NO `GF_AUTH_ANONYMOUS_ENABLED` anywhere and no `grafana.ini` overriding the default (`find` for `*.ini` returned nothing) — so Grafana's default anonymous=false stands and `/grafana/` unauthenticated redirects to the login form. `.env` is gitignored (`.gitignore:1`) with a committed `.env.example`.

Documentation exists and is substantial: `docs/DevOps_Documentation.md:150-380` covers the Prometheus config, the dashboard panels, the alert list, verification curls, and a per-alert firing test procedure (`docker stop ft_pinterest_backend` → BackendDown fires, etc.). Authorship is concentrated in the DevOps member: `git log --format=%an -- monitoring/ scripts/ backup/ docker-compose.yml` → 13 of 18 commits by Ckeven Ramaroson / ckeven, matching the README's role table (`README.md:105`).

**Réserve** — Nothing that fails a subject bullet. Five accuracy/hardening defects that an evaluator can find and that make the demo look sloppy, none of which change the verdict:

(a) PHANTOM ALERT IN THE DOC — `docs/DevOps_Documentation.md:209` lists "High Disk usage" among "Implemented alerts". There is no disk alert in `monitoring/alert_rules.yml` (only the 6 above; disk appears only as a dashboard panel at `ft_pinterest.json:421`). An evaluator reading the doc and grepping the rules file catches this in 10 seconds.

(b) DISK PANEL MEASURES THE WRONG FILESYSTEM — `docker-compose.yml:208` bind-mounts `/:/rootfs:ro` but the command block (`:209-211`) sets only `--path.procfs` and `--path.sysfs`, never `--path.rootfs=/rootfs`. node_exporter therefore reads the host mount table (via `/host/proc`) but stats paths in its OWN namespace, so the series labelled `mountpoint="/"` that the Disk panel filters on (`ft_pinterest.json:421`) is the container's overlayfs, not the host root.

(c) WEAK DEFAULT GRAFANA PASSWORD ON A CLEAN CLONE — `.env.example:6-7` ships `GRAFANA_ADMIN_USER=admin` / `GRAFANA_ADMIN_PASSWORD=change_me`, and `Makefile:21-27` (`make env`, run by `make start` at `:32`) copies `.env.example` → `.env` on a fresh clone. So the exact evaluation flow produces a Grafana whose admin password is published in the repo. Auth is still enforced, so the bullet holds, but this is the single most defensible attack on "secure access".

(d) ALERTMANAGER UI IS UNREACHABLE FROM A BROWSER — `docker-compose.yml:224-225` only `expose`s 9093 and `nginx/nginx.conf` has no `location /alertmanager/`. There is no way to show the Alertmanager UI at the defense without `docker exec`. Combined with the dead 127.0.0.1:9095 receiver, "show me an alert" has to be answered from `/prometheus/alerts` only.

(e) UNAUTHENTICATED MONITORING SURFACE THROUGH NGINX — `nginx/nginx.conf:59-67` proxies `/metrics` straight to the backend's Prometheus endpoint, and `:69-80` proxies the entire Prometheus UI at `/prometheus/` with no auth (Prometheus ships none by default). `docs/DevOps_Documentation.md:252,262` even documents both as open URLs. Nothing is destructive (`--web.enable-admin-api` and `--web.enable-lifecycle` are both off), but anyone reaching 8443 can read every backend and database metric. The subject only demands Grafana be secured, so this is not a bullet failure — but a security-minded evaluator will ask about it.

**À montrer en soutenance** — Claimable today — CHECK THE BOX in README.md:221. Then 15 minutes of polish so nothing is falsifiable on inspection:
1. Add the missing disk alert to `monitoring/alert_rules.yml` so `docs/DevOps_Documentation.md:209` becomes true: `- alert: HighDiskUsage / expr: 100 * (1 - node_filesystem_avail_bytes{mountpoint="/",fstype!="tmpfs"} / node_filesystem_size_bytes{mountpoint="/",fstype!="tmpfs"}) > 80 / for: 5m` (mirrors the panel query at ft_pinterest.json:421). Alternatively delete line 209 from the doc.
2. Add `- '--path.rootfs=/rootfs'` to `docker-compose.yml:209-211` so the Disk panel charts the host disk.
3. Change `.env.example:7` to a non-trivial default (or a `GRAFANA_ADMIN_PASSWORD=` blank the README tells you to fill) so a clean clone does not run on a published password.
4. Optionally add `location /alertmanager/ { proxy_pass http://alertmanager:9093/; }` to `nginx/nginx.conf` so the firing alert can be shown in the Alertmanager UI, not just Prometheus.

DEFENSE SCRIPT (all observable, no notification delivery needed): `make start` → `docker compose ps` shows prometheus/grafana/alertmanager/node_exporter/postgres_exporter all healthy → open `https://localhost:8443/prometheus/targets`, all 3 jobs UP → open `https://localhost:8443/grafana/`, get the LOGIN WALL (this is the "secure access" bullet — make them see the redirect before you type credentials), log in, show the auto-provisioned `ft_pinterest` dashboard with all 6 panels live → click around the app to make the HTTP requests panel move (proves the custom `http_requests_total` counter from metrics.interceptor.ts) → `docker stop ft_pinterest_backend`, wait 1 min, show BackendDown PENDING→FIRING at `https://localhost:8443/prometheus/alerts` → `docker start ft_pinterest_backend`, show it resolve.

</details>

<details><summary><b>[Web] Major — Real-time features using WebSockets</b> — 2 pt</summary>

**Preuve** — Gateway: `backend/src/websocket/websocket.gateway.ts:7-11` (@WebSocketGateway on the same HTTP server), JWT-authenticated handshake at `:24-31` + `:122-139` (`handleConnection` verifies `client.handshake.auth.token`, stores `client.data.userId`, registers the socket, fans an `online` delta to mutuals). Graceful disconnect: `:141-147` — `handleDisconnect` removes only that socket and emits `offline` ONLY when the user's last socket closes (`onlineStatus.service.ts:15-26` returns true on empty set), so multi-tab does not false-negative. Unauthenticated sockets are dropped silently (`:128-131`, `:133-136`) rather than logged, keeping the console clean. Broadcasting: two shapes, both used — per-user fanout `emitToUser` (`:63-70`) and global `broadcast` (`:72-78`). Six live event types actually flow across clients: `message:new` (`backend/src/chat/chat.service.ts:139-144` fans to both participants; `:197-198` for the system friendship marker), `conversation:read` receipts (`chat.service.ts:214-218`), ephemeral `chat:typing` relayed server-side with the sender taken from the socket, never the payload (`websocket.gateway.ts:83-94`), `friendStatusChange` presence (`:42-61`), `friendsChanged` on (un)mutualisation (`backend/src/follow/follow.service.ts:28-35`, called at `:67-68` and `:162-164`), and `artwork:deleted` broadcast to every window (`backend/src/artwork/artwork.service.ts:264` and `:310`). Client side: one shared idempotent socket (`frontend/src/features/presence/socket.ts:12-27`, explicitly guarded against the ChatProvider/PresenceProvider connect race), torn down on logout (`:30-33`); three consumers subscribe/unsubscribe cleanly — `PresenceProvider.tsx:27-47` (REST seed + re-seed on every `connect`, so a dropped socket never leaves stale presence), `ChatProvider.tsx:126-136` (cache patching + re-seed on reconnect), `ArtworkSyncProvider.tsx:50-53`. Transport is secure and proxied: `nginx/nginx.conf:110-118` proxies `/socket.io/` with the Upgrade/Connection headers under TLS on `:8443` (`nginx.conf:16-20`), and the client defaults to same-origin (`socket.ts:22`), so the socket is wss:// in the deployed stack.

**Réserve** — Nothing that fails a subject bullet. Two robustness warts worth 10 minutes: (a) `websocket.gateway.ts:138` and `:146` call the async `notifyFriendsAboutStatusChange(...)` with no `await` and no `.catch` — if `friendsService.getFriends` rejects (DB blip at the moment a socket opens/closes) Node 22 treats the unhandled rejection as fatal and the backend process dies; (b) `websocket.gateway.ts:97-119` `handleFriendRequestAccepted` is dead code from the deleted friend-request feature (nothing in the frontend emits it — the only client emit is `chat:typing` at `frontend/src/features/chat/components/MessageComposer.tsx:60`), it re-registers presence and calls `notifyUser` (`:33-40`) whose payload semantics are inverted. Also note there is no `artwork:created` event and no polling anywhere (`refetchInterval` has zero matches in `frontend/src`), so a brand-new post does not pop onto another user's canvas live — it appears on window refocus via TanStack's default refetch after the 30s staleTime (`frontend/src/app/providers.tsx:22`). Demo deletions and chat, not creations.

**À montrer en soutenance** — Two browsers, two accounts, mutual follow. Show: (1) message appears instantly in the other window without refresh; (2) typing indicator; (3) read receipt; (4) green dot appears on connect and disappears on the other window's logout; (5) delete an artwork in window A and show the card vanish from B's grid. Before that, wrap both `notifyFriendsAboutStatusChange` calls in `void ...catch(() => undefined)` and delete the `handleFriendRequestAccepted` block.

</details>

<details><summary><b>[Web] Major — Use a framework for both the frontend and the backend</b> — 2 pt</summary>

**Preuve** — Backend is NestJS 11: `backend/src/main.ts:9` `NestFactory.create<NestExpressApplication>(AppModule)`, `backend/src/app.module.ts:31-62` wires 14 feature modules + `APP_GUARD`/`APP_INTERCEPTOR`; deps `backend/package.json:23-33` (@nestjs/common, core, platform-express, platform-socket.io, websockets, passport, jwt, swagger, throttler, all ^11.x). Frontend is React 19 + Vite: `frontend/package.json:24-27` (react ^19.2.6, react-dom, react-i18next, react-router-dom ^7.17), `frontend/vite.config.ts:6-13` (@vitejs/plugin-react + @tailwindcss/vite, `@`→`./src` alias). Real framework usage, not a shell: provider tree at `frontend/src/app/providers.tsx:37-54` (QueryClientProvider → I18nextProvider → BrowserRouter → AuthGate → PresenceProvider → ArtworkSyncProvider → ChatProvider), route table at `frontend/src/app/router.tsx:32-47` with 15 routes plus a background-location modal stack (`router.tsx:55-84`). Both are containerised and boot together (`backend/Dockerfile`, `backend/docker-entrypoint.sh` waits for postgres → `prisma migrate deploy` → nest).

**Réserve** — Nothing for this module itself. The only exposure is arithmetic, not code: the README claims this Major AND both Web Minors ("frontend framework", "backend framework") — see the two NOT_APPLICABLE rows below.

**À montrer en soutenance** — Open `backend/src/app.module.ts` and `frontend/src/app/providers.tsx` side by side; show `docker compose ps` listing the `backend` (Nest) and `frontend` (Vite) services. Claim 2 points here and explicitly drop the two Minors when the evaluator reads the module list.

</details>

<details><summary><b>[Accessibility & i18n] Minor — RTL support (1+ RTL language, complete layout mirroring, RTL-specific adjustments, seamless switching)</b> — 1 pt</summary>

**Preuve** — This is the strongest of the four and would survive a hostile evaluator.

• Direction is driven from the document root and set BEFORE first paint: `frontend/src/lib/i18n/index.ts:37-41` (`document.documentElement.lang` + `.dir = i18n.dir(language)`), invoked at module scope `:43` and re-invoked on `languageChanged` `:44`. `frontend/src/app/providers.tsx:11` imports the i18n singleton at module scope, so `<html dir="rtl">` is set before React renders — no LTR flash.

• COMPLETE LOGICAL-PROPERTY DISCIPLINE — this is the headline. I ran a precise grep for every physical directional utility across `frontend/src`: `pl-`, `pr-`, `ml-`, `mr-`, `rounded-l-`, `rounded-r-`, `rounded-tl/tr/bl/br-`, `border-l-N`, `border-r-N`, `text-left`, `text-right`, `origin-left`, `origin-right`, `float-left`, `float-right`, `scroll-ml/mr-`, `space-x-reverse`. **ZERO MATCHES.** Against that, 82 logical-property usages (`ps-`/`pe-`/`ms-`/`me-`/`start-`/`end-`/`text-start`/`text-end`/`border-s`/`border-e`/`rounded-e-`), e.g. `Input.tsx:48-49`/`:65`, `LanguageSwitcher.tsx:30`/`:40`, `ConversationList.tsx:48`/`:57`, `NewMessagePicker.tsx:36`/`:44`, `AdminUsersTable.tsx:82`/`:92`/`:161`, `AdminArtworksPanel.tsx:97`/`:107`/`:145`/`:163`, `LegalPage.tsx:103`/`:127` (`border-s-2 ps-3 text-start`), `AuthButton.tsx:79`/`:111`, `ArtworkCard.tsx:107`/`:114`, `OnlineDot.tsx:17`, `MessagesButton.tsx:75`/`:86`, `SharedArtworkCard.tsx:30-31`/`:39`, `LinkedArtworkCard.tsx:42`, `ArtworkDetail.tsx:548`/`:565`, `ProfilePage.tsx:220`, `CreatePage.tsx:245`, `AppHeader.tsx:56`, `DonutChart.tsx:67`.
• `frontend/src/index.css` contains no physical direction rules whatsoever — the only keyframes that touch an axis are `shimmer` (cosmetic skeleton sweep, `:45-52`) and vertical-only `chat-view`/`typing` (`:82-107`), and the file even documents the choice: "Vertical, so it stays correct in RTL" (`:83`).
• The remaining `left-*` uses are all direction-neutral centering (`left-1/2 -translate-x-1/2`) or canvas world-plane anchors: `RefocusButton.tsx:23`, `Crossroads.tsx:57`/`:67`, `HeartBurst.tsx:44`, `SearchOverlay.tsx:189`, `ArtworkCanvas.tsx:218`/`:222`, `EasterEggLayer.tsx:101`. None mirrors wrongly.

• GENUINE RTL-SPECIFIC ADJUSTMENTS, not just `dir`:
  – Directional icons flipped: `rtl:rotate-180` on back chevrons at `ChatPanel.tsx:68`, `ConversationThread.tsx:113`, `LegalPage.tsx:105`.
  – Keyboard direction inverted: `ProfilePage.tsx:107-108` `const rtl = document.documentElement.dir === 'rtl'; const forward = (event.key === 'ArrowRight') !== rtl`.
  – Reading order swapped in the intro animation while the physical motion stays mirror-symmetric: `IntroReveal.tsx:301-309` + `dir="ltr"` island at `:348`.
  – Chart captions pinned LTR because the SVG plots oldest→newest left→right regardless of locale: `AreaChart.tsx:67-70`.
  – Chat bubbles deliberately avoid `ms-auto`/`me-auto` so nothing mirrors incorrectly: `MessageBubble.tsx:19`.
  – Password reveal button placed at the logical end: `Input.tsx:32`, `:65` (`inset-y-0 end-0 rounded-e-xl`).
• Seamless switching: `useLanguage.ts:13` calls `i18n.changeLanguage`, the `languageChanged` listener flips `<html dir>` live — no reload, no remount.

**Réserve** — Five real but trivial offenders — all icon/decoration, none breaks layout structure:

1. `frontend/src/features/admin/AdminUsersTable.tsx:223` — `<ChevronLeft>` on the "previous page" button, no `rtl:rotate-180`.
2. `frontend/src/features/admin/AdminUsersTable.tsx:238` — `<ChevronRight>` on "next page", same.
3. `frontend/src/features/admin/AdminArtworksPanel.tsx:193` — `<ChevronLeft>` on "previous page".
4. `frontend/src/features/admin/AdminArtworksPanel.tsx:204` — `<ChevronRight>` on "next page".
   In Arabic these four arrows point the wrong way. The buttons' `aria-label`s (`admin.pagination.previous/next`) are still correct, so this is visual only — but it is the one place a strict evaluator switching to AR and opening /admin will catch. Every other chevron in the codebase either has `rtl:rotate-180` or is vertical (`ChevronDown` in `LanguageSwitcher.tsx:38`, `RoleSelect.tsx:77`).
5. `frontend/src/pages/StatusPage.tsx:64` — inline `marginRight: 8` on the status dot (physical, not `marginInlineEnd`); that whole page is inline-styled and un-mirrored, but it is unlinked from the UI (only `router.tsx:48`).

**À montrer en soutenance** — Demo: switch to العربية and walk Home → Profile (arrow-key the tabs, they reverse) → Chat (open a thread, the back chevron flips) → Settings → Privacy (the TOC border moves to the right edge) → Admin. Then show the grep: `grep -rE '\bpl-|\bpr-|\bml-|\bmr-|text-left|text-right|rounded-l-|rounded-r-' frontend/src` returns nothing — that one command proves "complete layout mirroring" better than any screenshot. FIX FIRST (5 minutes): append ` rtl:rotate-180` to the className on the four admin pagination chevrons at AdminUsersTable.tsx:223/238 and AdminArtworksPanel.tsx:193/204.

</details>

<details><summary><b>[User Management] Minor — OAuth 2.0 remote authentication (Google)</b> — 1 pt</summary>

**Preuve** — Backend: backend/src/auth/google.strategy.ts:7-39 (PassportStrategy('google'), scope email+profile, validate() extracts email/name/photo and delegates), backend/src/auth/google-auth.guard.ts:5-8, backend/src/auth/auth.controller.ts:45-57 (@Public @Get('google') and @Get('google/callback') redirecting to `${FRONTEND_URL}/auth/callback#token=...` — token in the fragment, so it is never sent to a server). Registered as a provider at backend/src/auth/auth.module.ts:19. Account resolution at backend/src/auth/auth.service.ts:109-165 covers all three cases: returning googleId, linking Google to an existing local email, and first-time creation with a collision-free username (generateUniqueUsername :171-182); the Google photo is copied into Cloudinary rather than hot-linked (adoptGoogleAvatar :97-107). Token minted through the same signToken as local login (:20-23), so the role travels in the payload.
Frontend: frontend/src/pages/LoginPage.tsx:86-88 and :156-159, frontend/src/pages/RegisterPage.tsx:110-112 and :192-195 (`window.location.href = '/api/auth/google'` + GoogleIcon), frontend/src/pages/OAuthCallbackPage.tsx:19-40 (reads the fragment, stores the token, GET /auth/me, welcome intro, clean fallback to /login on failure with a toast — no unhandled rejection).
Plumbing: nginx/nginx.conf:96-97 `location /api/ { proxy_pass http://backend:3000/; }` strips the prefix, so GOOGLE_CALLBACK_URL=https://localhost:8443/api/auth/google/callback (backend/.env.example:27) resolves correctly. Credentials templated at backend/.env.example:25-27 and seeded on a clean clone by Makefile:21-27. Dependency present: backend/package.json:43 passport-google-oauth20. Button label translated in all three locales (frontend/src/lib/i18n/locales/{en,fr,ar}/common.json:72-73).

**Réserve** — Nothing in the code. Two operational notes: (a) it only works at the defense if real GOOGLE_CLIENT_ID/SECRET are in the local backend/.env — the .env.example placeholders will make Google answer `invalid_client`, so verify the machine used for the demo has real credentials and that https://localhost:8443/api/auth/google/callback is registered as an authorised redirect URI; (b) README.md:266 still has this module UNCHECKED (`- [] Oauth2.0 authentication with Google`), so as written the team is not claiming the point at all.

**À montrer en soutenance** — Tick the checkbox at README.md:266 and add it to the claimed total. Before the defense, confirm backend/.env holds real Google credentials and that the redirect URI is whitelisted in the Google Cloud console, then run one end-to-end sign-in with a Google account that has never used the app (exercises the create branch at auth.service.ts:152-164).

</details>

<details><summary><b>[Web] Minor — Custom-made design system (min. 10 reusable components, colour palette, typography, icons)</b> — 1 pt</summary>

**Preuve** — Component count clears the bar with margin — 16 reusable components, all with typed props and variant maps, all consumed from multiple features:
frontend/src/components/ui/Button.tsx:33 (4 variants × 2 sizes + loading state, VARIANTS/SIZES maps at :19-31), Divider.tsx:9, GoogleIcon.tsx:6, Input.tsx:15 (label/error/helperText, aria-invalid + aria-describedby wiring at :46-47, password reveal at :57-73), LanguageSwitcher.tsx:13, Logo.tsx:13, Modal.tsx:23 (focus trap :56-102, scroll lock :40-41, focus restore :51, 3 sizes at :16-20), OnlineDot.tsx:12, SafeImage.tsx:21, SilentBoundary.tsx:6, Spinner.tsx:7, TextLink.tsx:7, ToastViewport.tsx:9, plus charts/AreaChart.tsx:10, charts/BarList.tsx:9, charts/DonutChart.tsx:13 (all three consumed by frontend/src/features/admin/AdminAnalytics.tsx:226,239,253,265,278).

Typography is explicitly tokenised: frontend/src/index.css:6-14 declares --font-sans (Inter Variable) and --font-serif (Hedvig Letters Serif) in Tailwind v4's @theme, and the base layer at :29-42 forces the display serif on h1–h6 at weight 400. Fonts are self-hosted and bundled (frontend/src/main.tsx:4-5, @fontsource-variable/inter + @fontsource/hedvig-letters-serif in package.json:15-16) — no external Google Fonts request.

Icons: lucide-react (package.json:23) used consistently with aria-hidden across every surface, plus custom marks — Logo.tsx, GoogleIcon.tsx, frontend/src/components/ui/atlaasMark.ts:11-17 (ATLAAS_MARK_VIEWBOX / CENTER / PATHS) and a social sprite at frontend/public/icons.svg.

Colour: a deliberate, consistently applied monochrome-plus-accent scheme — neutral-900/800/700/500/400/300/200/100/50 as the whole UI ramp, red-600/700/800 reserved for destructive (Button.tsx:19-26 VARIANTS map is the single source), red-500 for the like heart and unread badge. Content colour is generated deterministically by frontend/src/lib/mappers.ts:72-78 colorFromId() (fixed S=58% L=62%, hue from a hash) so placeholder colours are stable and harmonious.

Motion is also systematised: index.css:9-13 declares --animate-shimmer/reveal/settle/chat-view/typing as theme tokens, with motion-reduce guards throughout.

**Réserve** — Nothing that blocks the module. One soft spot: the colour palette is applied consistently but never DECLARED — index.css:6-14 defines only font and animation tokens, and a grep for --color- across frontend/src returns nothing, so the palette lives implicitly in Tailwind's default neutral scale plus Button.tsx's VARIANTS map. There is also no living style-guide page any more (the /dev/ui route was removed), so 'show me your design system' has to be answered by opening files.

**À montrer en soutenance** — Optional 10-minute hardening: add semantic colour tokens to the @theme block in frontend/src/index.css (e.g. --color-surface, --color-ink, --color-ink-muted, --color-accent, --color-danger) mapped to the neutral/red values already in use, so the palette is a declared artifact you can point at during defense. Nothing else needed — 16 components against a minimum of 10, tokenised typography and a coherent icon set are all demonstrable as-is.

</details>

<details><summary><b>[Web] Minor — Use an ORM</b> — 1 pt</summary>

**Preuve** — Prisma 6.19 (`backend/package.json:34` @prisma/client, `:45` prisma), injected as a lifecycle-managed global provider (`backend/src/prisma/prisma.service.ts:5-14` extends PrismaClient with onModuleInit/$connect + onModuleDestroy/$disconnect; `backend/src/prisma/prisma.module.ts:4-9` is `@Global()`). Schema `backend/prisma/schema.prisma` declares 9 models and 2 enums with real relations, not a flat dump: User↔Artwork (1-n, onDelete: Cascade), Artwork↔Tag (implicit m-n), Like and Comment (n-1 to both User and Artwork), Follow as a self-relation with a composite PK `@@id([followerId, followingId])` and named relations "Follower"/"Following", Conversation ↔ ConversationParticipant (composite PK `@@id([conversationId, userId])`) ↔ Message (with a nullable senderId + `onDelete: SetNull` on the shared artwork). Performance indexes are declared, not accidental: `@@index([authorId])`, `@@index([createdAt])` on Artwork, `@@index([conversationId, createdAt])` on Message, `@@index([name])` on Tag, `@@unique([authorId, artworkId])` on Like. Every service goes through the client — no raw SQL anywhere in `backend/src`. 27 migrations under `backend/prisma/migrations/`, applied automatically at container boot (`backend/docker-entrypoint.sh`: wait for postgres → `npx prisma migrate deploy` → start), and `npx prisma generate` is baked into `backend/Dockerfile`.

**Réserve** — One cosmetic drift, no runtime impact: migration `20260720122348_add_friendship_request_and_enum/migration.sql` creates a `friendship` table + `FriendshipStatus` enum, and `20260726180652_add_chat` still alters it, but no model for it survives in `schema.prisma` and no code references it — `migrate deploy` will happily leave an orphan table in the live DB. If the evaluator opens psql or the diagram they will see a table nothing uses, and asking "what is this?" leads straight to the deleted friend-request feature.

**À montrer en soutenance** — Show `schema.prisma` next to `docker compose logs backend | grep -i migrat` (migrations applied on a clean volume). Optionally add one final migration `DROP TABLE IF EXISTS "friendship"; DROP TYPE IF EXISTS "FriendshipStatus";` so the DB matches the schema and `diagram_prisma.png`.

</details>

---

## 4. Modules partiels — points en danger

**16 points en jeu.** Le sujet : *« Non-functional or incomplete modules = 0 points. »*
Chaque entrée indique **le bullet précis du sujet qui échoue**.

| Module | Type | Pts | Effort |
|---|:---:|:---:|:---:|
| [Web] Major — Allow users to interact (basic chat AND profile system AND friends system) | major | 2 | small |
| [Modules of choice] Major — Infinite discovery canvas | major | 2 | small |
| [User Management] Major — Standard user management and authentication | major | 2 | ? |
| [User Management] Major — Advanced permissions system (user CRUD, roles, role-based views) | major | 2 | ? |
| [Web] Minor — Advanced search with filters, sorting AND pagination | minor | 1 | medium |
| [Web] Minor — Complete notification system for ALL creation, update and deletion actions | minor | 1 | small |
| [Web] Minor — File upload and management | minor | 1 | small |
| [Accessibility & i18n] Minor — Support for additional browsers (2+ browsers, test and fix all features in each, DOCUMENT browser-specific limitations, consistent UI/UX) | minor | 1 | small |
| [DevOps] Minor — Health check and status page system WITH automated backups AND disaster recovery | minor | 1 | small |
| [Data & Analytics] Minor — GDPR compliance | minor | 1 | small |
| [Accessibility & i18n] Minor — Multiple language support (3+ complete translations, i18n system, language switcher, all user-facing text translatable) | minor | 1 | trivial |
| [User Management] Minor — User activity analytics and insights dashboard | minor | 1 | ? |

### [Web] Major — Allow users to interact (basic chat AND profile system AND friends system)

`major` · **2 pt** · effort : small

**Preuve de ce qui existe**

Chat — fully implemented and the strongest of the three. Backend `backend/src/chat/controller` exposes 5 routes (`chat.controller.ts:21-60`: list conversations, open, paginated messages, send, mark-read), access is gated on mutual follow (`chat.service.ts:58-60`, `:110-113`), participation is asserted on every read (`:223-230`), DTOs validate (`dto/create-message.dto.ts:3-13` @MinLength(1)/@MaxLength(2000), `dto/create-conversation.dto.ts:4-6` @IsUUID). Frontend has a complete inbox: `ChatPanel.tsx`, `ConversationList`, `ConversationThread` (useInfiniteQuery with `getNextPageParam` at `ConversationThread.tsx:49-53`, `role="log" aria-live="polite"` at `:160-161`), optimistic send with rollback and a client-side mirror of the server throttle (`MessageComposer.tsx:17-19`, `:63-144`), unread badge (`MessagesButton.tsx:72-79`), reachable from every page (`components/AppHeader.tsx:57` and `pages/HomePage.tsx:46`).
Profile system — implemented. `backend/src/users/users.controller.ts:28-31` (/users/me), `:52-56` (public profile by id), `:58-80` (PATCH with avatar upload, 10 MB + mime whitelist via ParseFilePipe). UI at `frontend/src/pages/ProfilePage.tsx` (avatar, display name, handle, bio, works/followers/following counts `:170-189`, Works/Liked tabs with proper `role="tablist"` + arrow-key roving focus `:104-113`, RTL-aware), editing at `pages/SettingsPage.tsx`, admin preview at `features/users/UserProfileModal.tsx`.
Friends system — derived from mutual follow and functionally complete at the API layer: `backend/src/friends/friends.service.ts:17-40` `getFriends` (users I follow who follow me back, whitelisted select — no email leak), `:42-48` `getOnlineFriends`, `:52-62` `areMutuals`; exposed as `GET /friends` and `GET /friends/online` (`friends.controller.ts:18-26`). Add = follow (`follow.service.ts:37-79`, POST `/users/:id/follow`), remove = unfollow (`:126-167`, DELETE `/users/:id/unfollow`), both wired to a single optimistic button with a Following→Unfollow hover swap (`frontend/src/features/artworks/components/FollowButton.tsx:104-141`). Becoming mutual even posts a system message the app itself calls friendship: `chat.service.ts:157-199` + `en/common.json` `chat.system.mutualFollow` = "You are now friends. You can message each other." A rendered friends list DOES exist — `frontend/src/features/chat/components/NewMessagePicker.tsx:16-19` calls `fetchMutuals()` → `GET /friends` (`chat.api.ts:59-62`) and renders avatar + name + @handle + live online dot (`ChatAvatar.tsx:13-31` defaults `dot=true` → `OnlineDot`), with a search filter.

**Le bullet qui échoue**

The failing bullet is "see friends list" as a *demonstrable surface*: the word "friends" appears nowhere in the UI chrome. The only list of friends is buried two clicks inside the chat widget (Messages → New message) under the heading `chat.newMessageTitle` = "Start a conversation" (`ChatPanel.tsx:74`, `NewMessagePicker.tsx`), and its empty state reads "No conversations yet" (`chat.noMutualsTitle`). `ProfilePage.tsx:170-189` renders followers/following as bare NUMBERS with no drill-down — `GET /users/:id/followers` and `/following` exist (`follow.controller.ts:15-36`) but no component consumes them (only the `/count` variants, `user.api.ts:52-61`). Secondary risk on the same bullet: there is no explicit add-friend/remove-friend affordance — friendship is a silent side effect of a follow being reciprocated, so an evaluator who asks "add this person as a friend" is shown a Follow button and told to wait for the other account to follow back. An evaluator taking "add/remove friends, see friends list" literally can award 0 for the whole Major, taking chat and profile down with it.

**Comment le valider**

Cheapest possible fix, ~20 min, no backend change: add a `Friends` entry point that renders the existing `GET /friends` payload — either a third tab on `ProfilePage.tsx` next to Works/Liked (own profile only) or a labelled section in the chat panel. Add `friends.title`/`friends.empty` to all three locale files (`frontend/src/lib/i18n/locales/{en,fr,ar}/common.json`) so `npm run check:i18n` stays green, and reuse `ChatAvatar` so each row keeps its online dot — that single screen then satisfies "see friends list" AND the User-Management "see their online status" bullet at once. Then demo: A follows B (Follow button) → B follows A → both see the other in the Friends list with a green dot and the "You are now friends" system message → chat → A unfollows → the row and the dot disappear.

<details><summary>Contre-expertise</summary>

Agree, and I confirmed the failing bullet is exactly as stated — I actively looked for a reason to upgrade and found none. Chat is complete (`backend/src/chat/chat.controller.ts:21-60` = 5 routes; mutual-follow gate at `chat.service.ts:113` on open and `:110` on send, participant assertion, `message:new`/`conversation:read` fanout). Profile is complete (`frontend/src/pages/ProfilePage.tsx`, `/profile` and `/profile/:userId` at `router.tsx:39-40`, works/liked tabs with `role="tablist"` and arrow-key roving focus at `:104-113`). The friends bullet is what fails as a demonstrable surface: (1) `router.tsx:31-49` has NO `/friends` route — the 14 routes are home/login/register/oauth/profile×2/create/settings/admin/artwork×2/privacy/terms/status; (2) `ProfilePage.tsx:177-188` renders follower and following as bare `compact(count)` numbers, and `follow.controller.ts:14-36` does expose `GET /users/:id/followers` and `/following` but nothing in `frontend/src` consumes them — only the `/count` variants; (3) a repo-wide grep for `friend` in `frontend/src` returns only `presence.api.ts:6` (`GET /friends/online`), `chat.api.ts:60` (`GET /friends`) and socket handlers — the word never reaches the UI chrome. The only rendered friends list is `NewMessagePicker.tsx:69-90`, which does render `fetchMutuals()` with `ChatAvatar` (`ChatAvatar.tsx:13,29` — `dot = true` default, so the online dot is genuinely there) but sits behind Messages → New message under the heading `chat.newMessageTitle` (`ChatPanel.tsx:74`) with an empty state reading `chat.noMutualsTitle` = "No conversations yet". Add/remove is only follow/unfollow with no friend semantics in the UI. An evaluator asking "show me the friends system" gets a Follow button and a message picker: legitimate 0 for the whole Major. The suggested ~20 min fix (Friends tab on own profile, reusing GET /friends + ChatAvatar) is correct and would also satisfy the User-Management "see their online status" bullet.

</details>

---

### [Modules of choice] Major — Infinite discovery canvas

`major` · **2 pt** · effort : small

**Preuve de ce qui existe**

THE CODE IS GENUINELY SUBSTANTIAL — it is not a shortcut.

1. Real virtualisation. `frontend/src/features/artworks/canvas/useCanvasCamera.ts:129-153` derives an integer tile window from the camera: `minTx = Math.floor((x - halfW)/TILE_W) - TILE_MARGIN` … and `MAX_TILES` (`canvas.constants.ts:21`) is a hard safety valve at line 141-144 (`if (count > MAX_TILES) nextWindow = null`). Only tiles in that window are mounted (`ArtworkCanvas.tsx:118-128` expands the window into (tx,ty) pairs; `:133-160` issues one `useQueries` entry per tile with `staleTime: Infinity`). Off-screen tiles are unmounted and GC'd by TanStack Query.

2. A single rAF loop with refs, zero React renders during a gesture. `useCanvasCamera.ts:76-101` keeps x/y/scale/velocity/target in refs; `syncFrame` (`:104-191`) writes the transform straight to the DOM (`:110-112`) and the two layer opacities (`:117-126`) imperatively, then gates `setView` behind an explicit integer/boolean diff (`:157-190`) — including a deliberate reference-reuse of `window` when only `cells` moved (`:180-186`) so the tile `useMemo`/`useQueries` do not re-subscribe on a plain pan. The loop self-schedules only while `active` (`:238`) and stops when idle.

3. Correct screen↔world transform maths. Forward: `translate3d(w/2 − x·s, h/2 − y·s, 0) scale(s)` (`:110-112`) with `transformOrigin: '0 0'` (`ArtworkCanvas.tsx:219`). Inverse for cursor-anchored zoom in `zoomAtLocal` (`useCanvasCamera.ts:319-331`): `worldX = c.x + (px − w/2)/c.scale`, then re-solve `c.x = worldX − (px − w/2)/nextScale` so the point under the cursor stays pinned. Documented in `docs/ARCHITECTURE.md:47-51`.

4. Non-trivial gesture engineering. Delayed pointer capture until a press is proven a pan (`:395-398`, `CLICK_SLOP_PX` at `:59`); one-shot capture-phase click suppression so a drag ending on a card doesn't open it (`:409-441`); frame-rate-independent inertia with a low-pass velocity filter (`:203-216`, `:402-404`); two-finger pinch with a clamped per-frame factor to survive noisy samples (`:371-379`), rect cached at pinch start to avoid layout thrash (`:353`), and pinch→pan re-anchoring on finger-count change (`:420-430`); non-passive wheel with `deltaMode` unit normalisation (0/1/2 → px/16/viewport-h) at `:445-468`; full keyboard operation (arrows/±/Home/0) at `:471-508`; `prefers-reduced-motion` honoured in `flyTo` (`:259-271`) and inertia (`:418`); exponential frame-rate-independent fly-home (`:219-235`).

5. Deterministic placement. `frontend/src/features/search/tile.layout.ts:24-45` — a seeded mulberry32 PRNG plus `tileSeed(tx,ty) = ((tx & 0xffff) << 16) ^ (ty & 0xffff) ^ 0x9e3779b9` gives `pageForTile()`, so a given tile always requests the same backend page and the map does not reshuffle when the camera returns. `cellSlot` (`:51-60`) centres cards on grid nodes and rectangle-tests against `HERO_ZONE` to keep cell (0,0) card-free; `layoutTile` (`:66-106`) advances the item index only for filled cells and wraps modulo `items.length`. Rationale in `docs/ARCHITECTURE.md:79-89`.

6. Extra depth: scale-driven cross-fade into a brand mosaic (`canvas.constants.ts:27-31`, `EasterEggLayer.tsx`, `ARCHITECTURE.md:91-100`); centre-out reveal wave staggered by world distance (`ArtworkCanvas.tsx:33-36, 114-115`); exact-position skeletons reusing the same `cellSlot` logic (`ArtworkCanvas.tsx:227-238`, `ARCHITECTURE.md:159-168`); four swappable content sources on the same surface — global / personalised feed / niche / creator (`ArtworkCanvas.tsx:133-160`, `search.api.ts:91-144`); niche-completion tracking driving a Crossroads UI (`useNicheCompletion.ts`, `ArtworkCanvas.tsx:168, 274-284`).

VERDICT ON SUBSTANCE: comfortably Major-grade. VERDICT ON THE MODULE: PARTIAL, because the subject's README bullet is a hard requirement and is 100% absent.

**Le bullet qui échoue**

THE README JUSTIFICATION REQUIRED BY THE SUBJECT DOES NOT EXIST.

The subject: "README must justify why chosen, what technical challenges it addresses, how it adds value, and why it deserves Major status." Four required bullets. Zero of them are present.

Everything README.md says about this module, verbatim and exhaustively:
- `README.md:7-8` — "The project is an infinite canvas web app where user discover and share artwork.\ It's like pinterest but with infinite canvas instead of standard scrolling."
- `README.md:12` — "- Infinite canvas — content is displayed on a 2D navigable map, clustered by topic"
- `README.md:198` — "| Infinite canvas | Navigate a 2D map of content clustered by tag | srabeman |"
- `README.md:220` — "\t- [x] Module of choice (infinite canvas)"

That is the whole of it. Four descriptive lines, no justification. Specifically:
(a) WHY CHOSEN — absent. Nothing explains why a canvas rather than a scrolling grid, or what product problem it solves.
(b) TECHNICAL CHALLENGES ADDRESSED — absent. Not one word about virtualisation, the rAF/refs split, screen↔world maths, gesture disambiguation, or deterministic placement. All of this exists only in `docs/ARCHITECTURE.md:32-100`, which README.md never links or mentions (verified: no occurrence of "ARCHITECTURE" or "docs/" anywhere in README.md).
(c) HOW IT ADDS VALUE — absent.
(d) WHY IT DESERVES MAJOR STATUS — absent. There is no argument at all, and no "not listed above" argument either: an evaluator can reasonably say "this is just your frontend home page, not an extra module" and the README offers nothing to rebut that. The subject explicitly warns "Taking shortcuts or implementing trivial features will result in rejection" — the burden of proof is on the README, and it is unmet.

Secondary risks for the live demo of this module:
- `README.md:220` uses a leading TAB and the item renders as a normal list item, while sibling items use `- []` (see the README row) — the Modules section is visually broken where the claim is made.
- Mock fallback still wired into the canvas: `frontend/src/features/search/search.api.ts:104-110` returns `nicheTile(slug, tx, ty)` from `search.mock.ts:274-296` whenever the backend returns 0 artworks for one of the 8 discipline slugs (and on any network error, line 108-109). If the seed is thin for a discipline, the canvas will display fabricated cards during the defense. `docs/ARCHITECTURE.md:102-134` still describes this as a "Deterministic mock world", which reads to an evaluator as "the canvas is fake".
- `docs/ARCHITECTURE.md:296-316` still documents a "Dev sign-in stopgap (`useDevSignIn`)", `lib/devFail.ts` and a `/dev/ui` route under a heading "Temporary dev surfaces — remove before production", and `:318-330` a "Still TODO — Backend wiring at every TODO(backend) marker". All three files are gone (`frontend/src/pages/DevUiPage.tsx`, `frontend/src/features/auth/useDevSignIn.ts`, `frontend/src/lib/devFail.ts` do not exist). The doc is stale and actively damaging if read.

**Comment le valider**

Add a dedicated `## Modules of choice — Infinite discovery canvas (Major, 2 pts)` section to README.md, ~30-40 lines, covering the four required bullets in order and citing file paths so the evaluator can follow along:
1. Why chosen: the product is spatial discovery (direction = discipline, distance = niche depth); a paginated grid cannot express that.
2. Technical challenges: (i) 60 fps under continuous input — solved by keeping camera state in refs and doing all continuous DOM writes in one rAF loop, React re-rendering only when an integer tile window changes (`useCanvasCamera.ts:104-191`); (ii) unbounded content — solved by tile virtualisation with a 1-tile warm margin and a `MAX_TILES` cap (`useCanvasCamera.ts:129-153`, `canvas.constants.ts:12-21`); (iii) stable world under a moving camera — solved by a seeded PRNG keyed on (tx,ty) so tile→page and card→cell are pure functions (`tile.layout.ts:24-45`); (iv) cards must be links AND pannable — solved by deferred pointer capture + capture-phase click suppression (`useCanvasCamera.ts:395-398, 409-441`); (v) cursor-anchored zoom needing the exact inverse transform (`useCanvasCamera.ts:319-331`).
3. Value added: one continuous surface for search, feed, niche and creator views (four sources swap in place, `ArtworkCanvas.tsx:133-160`), zero-jump back-navigation, keyboard- and reduced-motion-accessible.
4. Why Major: quantify — ~550 lines of camera engine + ~110 lines of deterministic layout + a virtualised query layer, none of it from a library (no react-zoom-pan-pinch, no framer-motion; confirm with `frontend/package.json`), and it is the app's primary surface rather than an add-on.
Also: link `docs/ARCHITECTURE.md#the-discovery-canvas` from README.md, and delete/rewrite the stale `docs/ARCHITECTURE.md:102-134` "mock world", `:296-316` "Temporary dev surfaces" and `:318-330` "Still TODO" sections. Finally, remove or gate the `nicheTile` mock fallback in `search.api.ts:104-110`, or verify by seed inspection that all 8 discipline slugs return backend rows so the fallback can never fire during the demo.

<details><summary>Contre-expertise</summary>

AGREE — PARTIAL stands, and I found the substance case is even stronger than stated while the fatal gap is exactly as described.

SUBSTANCE, INDEPENDENTLY RE-VERIFIED (every cited line is accurate):
- Tile virtualisation: `frontend/src/features/artworks/canvas/useCanvasCamera.ts:134-144` derives the integer window (`minTx = Math.floor((x - halfW) / TILE_W) - TILE_MARGIN`) and hard-caps it (`if (count > MAX_TILES) nextWindow = null`); `canvas.constants.ts:18,21` are `TILE_MARGIN = 1` / `MAX_TILES = 80` with the comment "degrades to empty, never freezes". `ArtworkCanvas.tsx:118-128` expands to (tx,ty) pairs, `:133-160` issues one `useQueries` entry per tile with `staleTime: Infinity`.
- One rAF loop, refs only: `useCanvasCamera.ts:104-191` writes `world.style.transform` (`:110-112`) and both layer opacities (`:117-126`) imperatively, then gates `setView` on an int/bool diff (`:157-190`), including the deliberate window-reference reuse at `:182-187` so the tile memo does not re-subscribe on a plain pan. Loop self-schedules only while `active` (`:238`).
- Inverse transform for cursor-anchored zoom confirmed verbatim at `:325-329`, paired with `transformOrigin: '0 0'` at `ArtworkCanvas.tsx:219`.
- Gesture work confirmed: deferred pointer capture `:395-398` (`CLICK_SLOP_PX = 6` at `:59`), one-shot capture-phase click suppression `:409-441`, clamped pinch factor `:375`, rect cached at pinch start `:353`, pinch→pan re-anchor `:420-430`, `deltaMode` 0/1/2 normalisation `:448-454`, keyboard `:471-508`, reduced motion `:262-267` and `:418`.
- Deterministic placement confirmed: `frontend/src/features/search/tile.layout.ts:24-32` mulberry32, `:36-38` `tileSeed`, `:42-45` `pageForTile`, `:51-60` `cellSlot` with the HERO_ZONE rectangle test, `:66-106` `layoutTile` advancing `n` only on filled cells and wrapping `n % items.length`.
- NEW EVIDENCE THE ORIGINAL VERDICT ONLY PROPOSED AS A CHECK: I read `frontend/package.json` dependencies — react, react-dom, react-router-dom, @tanstack/react-query, zustand, axios, socket.io-client, i18next family, tailwind, lucide-react, lottie-web, fontsource. There is NO react-zoom-pan-pinch, framer-motion, @use-gesture, konva, pixi, d3 or react-spring. The 547-line camera engine and 106-line layout module are entirely hand-rolled. This is comfortably Major-grade and is not a shortcut.

WHY IT IS STILL NOT VALIDATED: the subject's definition of this module contains the README bullet as part of the definition, not as decoration — "README must justify why chosen, what technical challenges it addresses, how it adds value, and why it deserves Major status." I read all 260 lines of README.md. The complete set of mentions is `README.md:7-8` ("like pinterest but with infinite canvas"), `:12` ("content is displayed on a 2D navigable map"), `:198` (features-table row), `:220` (`\t- [x] Module of choice (infinite canvas)`). Zero of the four required bullets exist. I confirmed by grep that README.md contains no occurrence of "ARCHITECTURE" and no link to `docs/`, so the real write-up at `docs/ARCHITECTURE.md:32-100` is unreachable from the README. Incomplete = 0 points, so PARTIAL is the honest call.

SECONDARY RISKS ALSO CONFIRMED: the mock fallback is live at `frontend/src/features/search/search.api.ts` — inside `fetchNicheTile`, `if (data.length === 0) return isDiscipline ? nicheTile(slug as Category, tx, ty) : []` and the same call in the `catch`, so a thin seed for any of the 8 discipline slugs shows fabricated cards. `docs/ARCHITECTURE.md:103-104` still calls this a "Deterministic mock world — a stand-in for a future map API", and `:302-316` still documents "Dev sign-in stopgap (`useDevSignIn`)" plus a "Temporary dev surfaces — remove before production" heading listing `pages/DevUiPage.tsx` / `/dev/ui`, `features/auth/useDevSignIn.ts` and `lib/devFail.ts` — I confirmed all three files are gone and grep for `dev/ui|useDevSignIn|devFail` across `frontend/src` returns nothing, so the doc is stale and actively damaging. `:318+` "Still TODO — Backend wiring at every TODO(backend) marker" is likewise stale.

</details>

---

### [User Management] Major — Standard user management and authentication

`major` · **2 pt** · effort : ?

**Preuve de ce qui existe**

Update profile: frontend/src/pages/SettingsPage.tsx:77-114 (profileMutation) + :256-364 (avatar/fullname/username/bio form) → frontend/src/features/users/user.api.ts:78-105 (updateProfile, multipart when a file is present) → backend/src/users/users.controller.ts:58-80 (@Patch(':id') + FileInterceptor + ParseFilePipe) → backend/src/users/users.service.ts:91-178 (actor-role check at :102-111, username/email conflict at :120-139, bcrypt re-hash at :128-131).
Avatar upload: backend/src/users/users.service.ts:140-171 uploads to Cloudinary, stores secure_url/public_id, deletes the previous asset unless it is the shared default (:153-163). Client mirror of the server validators: frontend/src/lib/upload.validation.ts:7 (AVATAR_TYPES) + :27-29, called at SettingsPage.tsx:161-179; server side backend/src/users/users.controller.ts:66-77 (10 MB + jpg/jpeg/png/webp).
Default avatar: backend/prisma/schema.prisma:20 `avatarUrl String @default("https://res.cloudinary.com/oopriv9v/image/upload/v1785522670/avatars/default_avatar.jpg")`; protected from deletion via DEFAULT_AVATAR_PUBLIC_ID (backend/.env.example:19, users.service.ts:155 and :252).
Friends (add/remove): friends = mutual follow — backend/src/friends/friends.service.ts:17-40 (getFriends) and :52-62 (areMutuals); add/remove via backend/src/follow/follow.controller.ts:9-12 and :39-42, UI frontend/src/features/artworks/components/FollowButton.tsx (optimistic follow/unfollow with rollback). Friends list rendered at frontend/src/features/chat/components/NewMessagePicker.tsx:55-90 fed by frontend/src/features/chat/chat.api.ts:59-62 (GET /friends).
Online status: backend/src/websocket/onlineStatus.service.ts (multi-socket Map), backend/src/websocket/websocket.gateway.ts:122-147 (JWT-verified handshake, notifyFriendsAboutStatusChange on connect and on last-socket disconnect), backend/src/friends/friends.controller.ts:23-26 (GET /friends/online). Frontend: features/presence/PresenceProvider.tsx:20-48 (REST seed + `friendStatusChange` deltas + re-seed on reconnect and on `friendsChanged`), presence.store.ts:14-30, rendered by components/ui/OnlineDot.tsx:12-21 (green dot + sr-only "Online", translated in all 3 locales, e.g. frontend/src/lib/i18n/locales/ar/common.json:11). Dot is used on ProfilePage.tsx:153, ArtworkDetail.tsx:443, ChatAvatar.tsx:29, SearchOverlay.tsx:387. Breaking mutuality kills the dot immediately (follow.service.ts:129-133).
Profile page: frontend/src/app/router.tsx:39-40 (/profile and /profile/:userId) → frontend/src/pages/ProfilePage.tsx (avatar, name, bio, works/followers/following counts, Works/Liked tabs, Follow + Message + Share).

**Le bullet qui échoue**

BLOCKING BUG on the "log in securely" half of this module: backend/src/auth/dto/login.dto.ts:4 lower-cases the email (`@Transform(({value}) => value?.trim().toLowerCase())`) while backend/src/auth/dto/register.dto.ts:26-28 and backend/src/users/dto/create-user.dto.ts:37-42 only trim it. backend/src/auth/auth.service.ts:29-37 persists `dto.email` verbatim and :63-65 looks it up with `findUnique({ where: { email: dto.email } })` on a case-sensitive Postgres column. Any account registered with a capital letter in the address (e.g. `Test@Gmail.com`) is stored with that casing, and every subsequent login request arrives lower-cased → no row found → auth.service.ts:68-70 returns `{ error: 'invalid_credentials' }`. That account can never sign in again, and there is no other lower-casing anywhere in backend/src (grep for toLowerCase returns only artwork tags and login.dto.ts). An evaluator who capitalises their email at signup — a very common habit — will fail the sign-up/login demo outright, which also breaks the mandatory general requirement "sign up and log in securely".
Secondary risk (not blocking): the friends list is never presented as a friends list. There is no /friends route in frontend/src/app/router.tsx and no "Friends" label anywhere; GET /friends is consumed only by the chat "new message" picker (NewMessagePicker.tsx). An evaluator asking "show me your friends list" gets a message-recipient picker, and the word "friend" appears nowhere in the UI.

**Comment le valider**

1) Add `.toLowerCase()` to the email `@Transform` in backend/src/auth/dto/register.dto.ts:26 and backend/src/users/dto/create-user.dto.ts:37-42 (and to the Google path in auth.service.ts:109-165 for symmetry), then normalise existing rows with `UPDATE "User" SET email = lower(email);`. Re-test: register `Test@Gmail.com`, log out, log in with the same string. 2) Optional but cheap: add a `/friends` route (or a "Friends" tab on ProfilePage) rendering GET /friends with OnlineDot, so the "add friends + see online status" bullet has an obvious surface to point at during the demo.

<details><summary>Contre-expertise</summary>

Verdict upheld, and the blocking bug is real — I reproduced the asymmetry by reading all three DTOs. backend/src/auth/dto/login.dto.ts:4 is `@Transform(({value}) => value?.trim().toLowerCase())`, while backend/src/auth/dto/register.dto.ts:26-28 and backend/src/users/dto/create-user.dto.ts:37-42 only `.trim()`. backend/src/auth/auth.service.ts:32 persists `email: dto.email` verbatim and :63-65 does `findUnique({ where: { email: dto.email } })` — Prisma findUnique is exact-match on a case-sensitive Postgres text column (schema.prisma:15 `email String @unique`, no citext), so `Test@Gmail.com` registers fine and can never log in again (auth.service.ts:68-70 returns `{error:'invalid_credentials'}`). `grep -rn toLowerCase backend/src` returns exactly three hits: artwork tags at artwork.service.ts:65 and :189, and login.dto.ts:4. The frontend does not normalise either — no toLowerCase in LoginPage/RegisterPage, and RegisterPage.tsx:147 is a plain `type="email"` input. Two extra blast radii the original verdict missed: (a) frontend/src/features/users/user.api.ts:110-119 `updateAccount` sends the new email verbatim to PATCH /users/:id, and backend/src/users/users.service.ts:127-133 does the duplicate check with another case-sensitive findUnique — so an evaluator who edits their email in Settings to a capitalised form locks themselves out identically AND can create a case-variant duplicate of an existing address; (b) auth.service.ts:139-141 resolves Google account-linking by `findUnique({where:{email}})`, so a local row stored as `Foo@Gmail.com` is invisible to Google's lowercase `foo@gmail.com` and the OAuth path silently creates a second account instead of linking. The four bullets the subject actually names are all met and I verified each: update profile (SettingsPage.tsx:77-114 → users.controller.ts:58-80 → users.service.ts:91-178), avatar upload with a schema default (schema.prisma:20) protected by DEFAULT_AVATAR_PUBLIC_ID (users.service.ts:153-157, :250-256, backend/.env.example:19) plus a real client mirror of the server pipe (lib/upload.validation.ts:22-29 vs users.controller.ts:66-77), friends-as-mutual-follow with presence (friends.service.ts:17-40, websocket.gateway.ts:122-147, PresenceProvider.tsx:20-48, OnlineDot.tsx:12-21 used at ProfilePage.tsx:153 / ArtworkDetail.tsx:443 / ChatAvatar.tsx:29 / SearchOverlay.tsx:387), and a profile page (router.tsx:39-40 → ProfilePage.tsx:124-222). So the downgrade rests entirely on the authentication half — which is the right call, because "sign up and log in securely" is a mandatory general requirement whose failure is worse than losing the module. I also confirmed the secondary friends-surface point: router.tsx:35-49 has no /friends route, and the only occurrence of the word "friend" in user-facing text is the mutual-follow toast (lib/i18n/locales/en/common.json:63 "You are now friends…"); GET /friends is consumed only by chat/components/NewMessagePicker.tsx.

</details>

---

### [User Management] Major — Advanced permissions system (user CRUD, roles, role-based views)

`major` · **2 pt** · effort : ?

**Preuve de ce qui existe**

Backend IS committed, contrary to the README. `git ls-files backend/src/roles backend/src/decorators backend/src/users` lists backend/src/roles/roles.guard.ts, backend/src/decorators/roles.decorator.ts, backend/src/enums/role.enum.ts, backend/src/users/dto/update-roles.dto.ts and backend/src/users/users.controller.ts, and `git status --porcelain backend/src/` is empty — nothing is uncommitted.
Guards: backend/src/roles/roles.guard.ts:10-23 (reads @Roles metadata, `if (!user) return false`, `requiredRoles.includes(user.role)`); global JwtAuthGuard at backend/src/app.module.ts:57-60 with @Public() opt-out; backend/src/auth/jwt.strategy.ts:16-22 reloads the user from the DB so the role is live, not whatever the token claimed.
Read: backend/src/users/users.controller.ts:39-44 `@Get() @Roles(Role.admin) @UseGuards(RolesGuard)`; UI frontend/src/features/admin/AdminUsersTable.tsx (search + role filter + sort + pagination) and frontend/src/features/users/UserProfileModal.tsx.
Create: frontend/src/features/admin/AddUserDialog.tsx + admin.api.ts:97-117 (register then PATCH role).
Update: backend/src/users/users.controller.ts:58-80 (@Patch(':id'), @Roles(user, admin)) with the actor-not-target role check at users.service.ts:102-111; roles at users.controller.ts:82-91 + users.service.ts:300-324 with self-demotion guard (:308-310) and last-admin guard (:311-318); UI frontend/src/features/admin/RoleSelect.tsx (optimistic with rollback on refusal).
Delete: users.controller.ts:93-98 + users.service.ts:224-298 (403 for non-admin deleting someone else, last-admin guard :241-249, Cloudinary + conversation + orphan-tag cleanup); UI frontend/src/features/admin/DeleteUserDialog.tsx.
DTO validation: backend/src/users/dto/update-roles.dto.ts:5-9 (@IsEnum(Role)); global ValidationPipe whitelist+forbidNonWhitelisted at backend/src/main.ts:23-29, so `role` cannot be smuggled through PATCH /users/:id (UpdateUserDto = PartialType(CreateUserDto), which has no role field).
Role-differentiated views/actions: frontend/src/features/auth/useRole.ts (canAdmin/canViewDashboard), RequireRole.tsx wrapping AdminPage.tsx:34-40, admin nav link gated at AuthButton.tsx:155, per-row actions gated at AdminUsersTable.tsx:136/180/184, admin override on artwork edit at frontend/src/pages/EditArtworkPage.tsx:183 and backend/src/artwork/artwork.service.ts:183/241/285, comments at backend/src/comment/comment.service.ts:85/108.

**Le bullet qui échoue**

1) README.md:218 still reads: `- [x] Advanced Permission System *(frontend committed; backend changes are local & uncommitted — see local_backend_changes.md)*`. This is false (see evidence) AND self-incriminating: an evaluator reading it has been told by the team that half the module is not in the repo, which is grounds for awarding 0 without even looking. The referenced path is also wrong — the file is at docs/local_backend_changes.md, and that document itself says the opposite ("le backend est committé ici").
2) Functional defect on this module's own demo path: frontend/src/features/users/UserProfileModal.tsx:84 renders `{u.email}` and :40 computes `const role = (u?.role ?? 'USER')`, but the modal is fed by fetchProfile → GET /users/:id → backend/src/users/users.service.ts:87, which destructures `role` and `email` out of the response. So clicking an ADMIN row in AdminUsersTable opens a modal that badges them "USER" and shows a blank email line — directly contradicting the correct role shown in the table one click earlier (AdminUsersTable.tsx:180 uses GET /users, which does return role/email at users.service.ts:28).
3) The admin can only edit a user's ROLE from the UI. The backend supports full admin edit (users.service.ts:102-111 lets an ADMIN patch anyone's fullname/username/email/bio/password), but no admin-side form exposes it, so "edit users" in the CRUD bullet rests entirely on the role dropdown.

**Comment le valider**

1) Delete the parenthetical at README.md:218 (or replace it with "backend RBAC committed: src/roles/roles.guard.ts, src/decorators/roles.decorator.ts, src/users/users.controller.ts") and fix the stale reference to docs/local_backend_changes.md. 2) Fix UserProfileModal: pass the already-loaded AdminUserRow (which carries role + email) down from AdminPage.tsx:273 instead of re-fetching the public GET /users/:id, or drop the role badge and email line from the modal. 3) Optional, to make the "edit" bullet unambiguous: add an EditUserDialog reusing PATCH /users/:id, which the backend already authorises for admins.

<details><summary>Contre-expertise</summary>

Upheld — I checked whether this deserved an upgrade to VALIDATED and it does not, because a defect sits on the module's own demo path. Confirmed the backend IS committed: `git ls-files` returns backend/src/roles/roles.guard.ts, backend/src/decorators/roles.decorator.ts, backend/src/enums/role.enum.ts, backend/src/users/dto/update-roles.dto.ts, backend/src/users/users.controller.ts, and `git status --porcelain backend/src/` is empty. RBAC itself is sound: roles.guard.ts:10-23, users.controller.ts:39-44 (@Get @Roles(admin)), :82-91 (roles), :93-98 (delete), users.service.ts:100-111 (actor-role check), :300-318 (self-demotion + last-admin guards), :224-249 (403 + last-admin on delete); UpdateUserDto is `PartialType(CreateUserDto)` (update-user.dto.ts:4) which has no `role` field, and main.ts:23-29 sets whitelist + forbidNonWhitelisted, so role cannot be smuggled through PATCH /users/:id. Role-differentiated views verified at useRole.ts:6-17, RequireRole.tsx:13-15, AdminPage.tsx:34-38, AdminUsersTable.tsx:136/180/184-198. Defect #2 reproduced end-to-end and it is worse than described: backend/src/users/users.service.ts:87 destructures `role` and `email` OUT of GET /users/:id, frontend/src/lib/mappers.ts:118-127 `toUser` still reads `s.role`/`s.email`, and UserProfileModal.tsx:40 falls back to `'USER'` while :84 renders `{u.email}` — so clicking an ADMIN row in AdminUsersTable (which showed the correct role one click earlier from GET /users, users.service.ts:23-30) opens a modal badging them MEMBER with a blank email line, i.e. the role-based view contradicts itself in front of the evaluator. Defect #3 confirmed by listing frontend/src/features/admin/: AddUserDialog, AdminAnalytics, AdminArtworksPanel, AdminStats, AdminUsersTable, DeleteUserDialog, RoleSelect, admin.api.ts, roleBadge.ts — there is no user-edit dialog at all, so the "edit" leg of the CRUD bullet is nothing but the role dropdown even though users.service.ts:100-111 already authorises an ADMIN to patch anyone's fullname/username/email/bio/password. Defect #1 verified verbatim at README.md:218: `- [x] Advanced Permission System *(frontend committed; backend changes are local & uncommitted — see \`local_backend_changes.md\`)*` — the file is actually at docs/local_backend_changes.md, and the claim is false. That line alone is a legitimate excuse for an evaluator to award 0 without opening the code, and deleting it is a 10-second fix.

</details>

---

### [Web] Minor — Advanced search with filters, sorting AND pagination

`minor` · **1 pt** · effort : medium

**Preuve de ce qui existe**

Search itself is real and rather good. Backend: backend/src/search/search.controller.ts:10-39 exposes five @Public() endpoints (GET /search, /search/artworks, /search/users, /search/tags, /search/suggest). backend/src/search/search.service.ts:19-64 does a multi-field OR (title, description, tag name, author username, author fullname — :31-45) with skip/take (:47-48) and orderBy createdAt (:49-51); :144-156 suggestTags ranks tags by artwork count and filters out orphans. The DTO backend/src/search/dto/create-search.dto.ts:12-38 accepts q, page (@IsInt @IsPositive, default 1), sort (@IsEnum(sort), default RECENT) and limit (@Max(1000), default 10).

Frontend: frontend/src/features/artworks/components/SearchOverlay.tsx is a 200ms-debounced, ≥2-char (:84-93) combobox with three grouped result categories (disciplines/tags/creators, :252-284), full keyboard navigation with aria-activedescendant (:154-169, :223-225), and a 'nearest region' empty state (:436-458).

All THREE required qualifiers fail at the UI level:
1. FILTERS — there is no filter control anywhere in SearchOverlay.tsx. The DTO offers no filter dimension either (no media type, no date range, no author filter, no tag facet): create-search.dto.ts:12-38 has only q/page/sort/limit. The disciplines/tags/creators headings are result GROUPING, not user-settable filters.
2. SORTING — every single frontend call site passes the string literal 'recent'. A grep for "sort:" across frontend/src returns exactly 7 hits, all hardcoded: features/search/search.api.ts:54, :102, :123, :158; features/artworks/artwork.api.ts:63, :75; features/admin/admin.api.ts:37. There is no sort selector in the UI, and the backend only supports two values anyway (search.service.ts:24-29 throws unless 'recent' or 'oldest').
3. PAGINATION — no search result fetch ever advances a page. search.api.ts:54 (page:1), :102 (page:1), :123 (page:1), :158 (page:1). The only place `page` is a variable is artwork.api.ts:75, and it comes from frontend/src/features/search/tile.layout.ts:42-45 pageForTile(), a seeded-PRNG pick of a RANDOM page per canvas tile — that is content scattering for the infinite map, not user-navigable pagination, and it applies to the global canvas, not to search results. Concretely: every tile of a tag/niche universe re-requests page 1 limit 16 (search.api.ts:102), so the same 16 works are re-laid-out forever; a creator universe requests page 1 limit 200 and filters client-side (search.api.ts:116-144).

The only real pagination in the app is frontend/src/features/admin/AdminArtworksPanel.tsx:31 (PAGE=12), :75-77 (client-side visible.slice) and the prev/next nav at :184-207 — but that is the admin moderation table, is admin-only, and slices an already-fully-fetched array (admin.api.ts:37 fetches limit:1000); it is not the search feature.

**Le bullet qui échoue**

All three qualifying bullets are absent from the user-reachable UI: no filter controls at all, no sort control (sort is a hardcoded literal at all 7 call sites), no pagination of search results (page is hardcoded to 1 for every search fetch). As it stands an evaluator asking "sort these results oldest-first" or "show me page 2" gets nothing, and awards 0.

**Comment le valider**

Cheapest credible fix is a real results surface rather than only the canvas: add a /search results route that calls GET /search/artworks with (a) a sort select bound to the existing recent|oldest enum, (b) prev/next or infinite-scroll driving the existing `page` param, and (c) at least one genuine filter. For (c) the backend needs one new optional DTO field — media type is easiest since Artwork already stores resourceType (backend/prisma/schema.prisma) so it is a one-line `where` clause in search.service.ts:30, or filter by tag (the tags relation is already queried at :36-38). Then wire the three controls into SearchOverlay or the new page. Estimated half a day; without it this minor is a 0.

<details><summary>Contre-expertise</summary>

Status is right but the evidence is materially wrong on one point and must not be repeated at defense. The claim 'the only real pagination in the app is AdminArtworksPanel' is false: frontend/src/features/admin/AdminUsersTable.tsx:28-32 holds query + roleFilter + sort ('recent'|'oldest'|'name') + page + pageSize, applies them at :42-63, and renders a role <select> (:95-108), a sort <select> (:109-121), prev/next buttons with aria-current page and a per-page <select> (:225-255) — that single surface has all three qualifiers. It still does not validate the module: it is ADMIN-only, it filters/sorts/slices an array already fetched whole (admin.api.ts:37 /search/artworks limit 1000, admin.api.ts:48 GET /users), and it is the same UI the team demos for the Advanced Permissions major. Everything the reviewer says about the user-facing search I re-confirmed: create-search.dto.ts exposes only q/page/sort/limit (no filter dimension at all), search.service.ts:24-29 accepts only 'recent'|'oldest', all 7 frontend call sites hardcode sort:'recent' (admin.api.ts:37, artwork.api.ts:63,75, search.api.ts:54,102,123,158), page is literal 1 everywhere except artwork.api.ts:75 where it comes from pageForTile()'s seeded PRNG (tile.layout.ts:41-45), SearchOverlay.tsx (459 lines) contains no filter/sort/page control, and app/router.tsx:35-49 has no /search results route. Consequence for the fix plan: this is ~1 hour, not half a day — lift the AdminUsersTable control cluster and its existing i18n keys (admin.sort.*, admin.filter.*, admin.pagination.*) onto a public results route bound to the DTO's existing page/sort params, and add one optional filter field to the DTO.

</details>

---

### [Web] Minor — Complete notification system for ALL creation, update and deletion actions

`minor` · **1 pt** · effort : small

**Preuve de ce qui existe**

A toast system exists and is well built. Store: frontend/src/lib/toast.store.ts:56-96 (queue, variants 'default'|'error', sticky actionable toasts, pause/resume timers), helper useToast at :99-101. Viewport: frontend/src/components/ui/ToastViewport.tsx:9-58, with role="alert"/aria-live="assertive" for errors and role="status"/polite otherwise (:23-24).

But only THREE mutating actions in the whole app emit a success notification:
- create artwork → frontend/src/pages/CreatePage.tsx:169 toast({message: t('create.published')})
- update artwork → frontend/src/pages/EditArtworkPage.tsx:137 toast({message: t('edit.saved')})
- delete artwork (owner path) → frontend/src/features/artworks/components/ArtworkDetail.tsx:93 toast({message: t('artwork.deleted')})

The complete inventory of mutating calls is frontend/src/lib/http.ts consumers (grep of http.post/patch/delete gives 23 call sites). Every other create/update/delete is SILENT on success:
- POST comment — ArtworkDetail.tsx:206-219 onSuccess has no toast; only an sr-only role=status string at :696-698 (screen-reader only, invisible to a sighted evaluator).
- DELETE comment — ArtworkDetail.tsx:305-309 onSuccess: no notification at all. Error toast only at :320.
- POST/DELETE like — ArtworkDetail.tsx:228-270: onMutate/onSettled only, no success toast (error toast at :243-252).
- POST /users/:id/follow and DELETE /unfollow — frontend/src/features/artworks/components/FollowButton.tsx:52-102: no success notification (error toast at :74-83).
- PATCH profile (incl. avatar) — frontend/src/pages/SettingsPage.tsx:85-94: inline "Saved ✓" button label + sr-only status (:351-362), no toast.
- PATCH account (email/password) — SettingsPage.tsx:122-132: same inline-only pattern.
- Admin create user — frontend/src/features/admin/AddUserDialog.tsx:69-86: onSuccess invalidates + closes, no toast.
- Admin change role — frontend/src/features/admin/RoleSelect.tsx:35-40: toast fires ONLY on the refusal branch; a successful role change is silent.
- Admin delete user — frontend/src/features/admin/DeleteUserDialog.tsx:31-50: no success toast.
- Admin delete artwork — frontend/src/features/admin/AdminArtworksPanel.tsx:48-63: onSuccess has no toast (error toast at :61).
- GDPR delete own account — frontend/src/features/gdpr/DeleteAccountDialog.tsx:38-58: success path logs out + redirects silently.
- GDPR data export — frontend/src/features/gdpr/DataPrivacySection.tsx:22-30: no success toast.
- Create conversation — frontend/src/features/chat/useStartConversation.ts:18-27: no success toast.
- Send message — frontend/src/features/chat/components/MessageComposer.tsx:113-125: no success toast.
- Register / login — frontend/src/pages/RegisterPage.tsx:100-101 and LoginPage.tsx:76-77: navigate only.

Also: there is no persistent or cross-user notification layer. backend/prisma/schema.prisma declares User, Artwork, Like, Comment, Follow, Tag, Conversation, ConversationParticipant, Message — no Notification model. backend/src/websocket/websocket.gateway.ts only emits friendStatusChange (:37,:56), chat:typing (:90) and a broadcast of 'artwork:deleted' (artwork.service.ts:264). Nobody is told when their work is liked, commented on, or followed. The only ambient indicator is the chat unread badge (frontend/src/features/chat/components/MessagesButton.tsx:72-79).

**Le bullet qui échoue**

Success notifications for ~15 of ~18 user-triggered create/update/delete actions (comment create/delete, like/unlike, follow/unfollow, profile save, account save, admin user create/role-change/delete, admin artwork delete, account deletion, conversation creation, message send). The subject's wording is "COMPLETE" and "ALL creation, update and deletion actions" — at roughly 17% coverage an evaluator awards 0. Secondarily, no notification of actions performed BY OTHER USERS on your content (no Notification model, no notification feed/bell), which is what most evaluators expect from the word "system".

**Comment le valider**

Add a toast to every mutation's onSuccess. Concretely: ArtworkDetail.tsx:206 (comment posted), :305 (comment deleted), :254 onSettled or a new onSuccess for like/unlike; FollowButton.tsx add onSuccess toast; SettingsPage.tsx:85 and :122 add toast alongside the inline Saved; AddUserDialog.tsx:83, RoleSelect.tsx:35 success branch, DeleteUserDialog.tsx:44, AdminArtworksPanel.tsx:50, DeleteAccountDialog.tsx:52, useStartConversation.ts:18. Each is one line plus one i18n key × 3 locales (en/fr/ar under frontend/src/lib/i18n/locales/*/common.json). ~2 hours total. If time allows, back it with a Notification table + gateway emit on like/comment/follow so the demo shows user B being notified of user A's action live.

<details><summary>Contre-expertise</summary>

Independently enumerated every toast() call site in frontend/src (26 total). Exactly three are success notifications — CreatePage.tsx:169 t('create.published'), EditArtworkPage.tsx:137 t('edit.saved'), ArtworkDetail.tsx:92 t('artwork.deleted'). Every other call passes variant:'error' (AddUserDialog.tsx:79,102; AdminArtworksPanel.tsx:61; DeleteUserDialog.tsx:33,52; RoleSelect.tsx:38,45; ArtworkDetail.tsx:190,243,320; DeleteArtworkDialog.tsx:28; FollowButton.tsx:74; MessageComposer.tsx:102,120,138; useStartConversation.ts:32; DataPrivacySection.tsx:28; DeleteAccountDialog.tsx:43,60; CreatePage.tsx:175; EditArtworkPage.tsx:145; SettingsPage.tsx:103,139). I confirmed the silent onSuccess paths myself: ArtworkDetail comment post onSuccess (invalidate + setPostStatus only), comment delete onSuccess (invalidate only), like onSettled (invalidate only), FollowButton onSettled (invalidate only), SettingsPage profileMutation/accountMutation onSuccess (login + setProfileSaved/setAccountSaved inline flag only), DeleteAccountDialog onSuccess (tokenStore.clear + navigate). A repo-wide grep for 'notification' across backend/src, backend/prisma and frontend/src returns a single hit — a French code comment in backend/src/follow/follow.service.ts:25 — so there is no Notification model, table, feed or bell. Coverage is 3 of ~18 mutating actions against a bullet that says COMPLETE and ALL; PARTIAL is right and it scores 0 as-is.

</details>

---

### [Web] Minor — File upload and management

`minor` · **1 pt** · effort : small

**Preuve de ce qui existe**

Bullet by bullet, on the two upload surfaces (artwork media, avatar):

• MULTIPLE FILE TYPES — met. Artworks: image/jpeg, image/png, image/gif, image/webp, video/mp4 (frontend/src/features/artworks/artwork.validation.ts:19-27, ACCEPT_ATTR feeds the picker's accept attribute at CreatePage.tsx:224; server mirror at backend/src/artwork/artwork.controller.ts:39-41). Avatars: jpg/jpeg/png/webp (frontend/src/lib/upload.validation.ts:7, backend/src/users/users.controller.ts:71).

• CLIENT **AND** SERVER VALIDATION (type, size, format) — met, and stronger than usual. Client: artwork.validation.ts:45-52 validateFile() checks presence, MIME whitelist and MAX_FILE_BYTES=10MB (:28); upload.validation.ts:22-30 does the same for avatars and is called before the file leaves the browser (SettingsPage.tsx:166-170). Server: artwork.controller.ts:34-44 ParseFilePipe with MaxFileSizeValidator(10MB) + FileTypeValidator regex; users.controller.ts:66-77 the same with fileIsRequired:false. Note this is genuine content validation, not just a MIME string check — @nestjs/common 11.1.28's FileTypeValidator inspects magic numbers via the file-type package by default (node_modules/@nestjs/common/pipes/file/file-type.validator.js isValid(), and file-type 21.3.4 is installed), so a renamed .exe is rejected.

• SECURE STORAGE WITH ACCESS CONTROL — met for the write path, thin for the read path. Uploads go to Cloudinary (backend/src/cloudinary/cloudinary.service.ts:15-28, folder 'uploads', resource_type auto) and credentials come from getOrThrow'd env vars (:9-11). Mutations are ownership/role gated: artwork.service.ts:183-187 (update), :241-245 (delete), :282-289 (deleteAll, authorises on the CALLER); users.service.ts:102-111 (profile update) and :112-118, which strips avatarUrl/avatarPublicId from the body so a caller cannot point their row at someone else's asset. The delivery URLs themselves are unsigned public Cloudinary URLs — defensible for a public gallery, but there is no per-asset access control.

• PREVIEW WHERE APPLICABLE — met. CreatePage.tsx:228-261 previews the picked file (real <video controls> for mp4, <img> otherwise) with Replace and Clear buttons, object-URL lifecycle handled at :63-79. SettingsPage.tsx:174-178 previews the avatar via FileReader before upload.

• PROGRESS INDICATORS — met on ONE surface only. Artwork publish has a real determinate bar: axios onUploadProgress at frontend/src/features/artworks/artwork.api.ts:207-213 feeding CreatePage.tsx:61/:160 and rendered at :293-306 with role="progressbar" + aria-valuenow/min/max. The avatar upload has NO progress indicator: frontend/src/features/users/user.api.ts:95-99 issues the multipart PATCH with no onUploadProgress callback, and SettingsPage.tsx shows only the Button's spinner (:350).

• ABILITY TO DELETE UPLOADED FILES — met for artworks, absent for avatars. Artwork delete destroys the Cloudinary asset then the row (backend/src/artwork/artwork.service.ts:246-261) and broadcasts artwork:deleted (:264); bulk delete does the same per asset (:295-311). UI: DeleteArtworkDialog.tsx (typed confirmation modal) and the admin path at AdminArtworksPanel.tsx:48-63. For avatars, users.service.ts:140-163 destroys the OLD asset when a new one replaces it, but no code path ever sets avatarUrl back to the default — SettingsPage.tsx:271-287 offers only 'Change avatar', there is no 'Remove avatar'. So an uploaded avatar can be replaced but never deleted.

**Le bullet qui échoue**

Two bullets fail on the avatar upload surface: (1) no progress indicator for the avatar upload, (2) no way to delete/remove an uploaded avatar (replace-only). The artwork path alone satisfies all six bullets, so if the evaluator only demos publishing and deleting a work this passes — but a strict reading of "progress indicators for uploads" and "ability to delete uploaded files" against the second upload surface justifies a 0.

**Comment le valider**

Two small fixes, ~30 minutes: (a) give updateProfile an onProgress callback exactly like createArtwork — add the axios onUploadProgress option at frontend/src/features/users/user.api.ts:95-99 and render the same role="progressbar" element already written at CreatePage.tsx:293-306 inside SettingsPage's profile card; (b) add a 'Remove avatar' button that sends a flag the server honours by destroying user.avatarPublicId and resetting avatarUrl to DEFAULT_AVATAR_PUBLIC_ID (users.service.ts already references that env var at :155, so the default exists). After that every bullet is demonstrable on both surfaces.

<details><summary>Contre-expertise</summary>

Both failing bullets confirmed at source. Progress: only artwork.api.ts:205-213 passes onUploadProgress; user.api.ts:96-99 sends the avatar multipart PATCH with multipartConfig alone, and SettingsPage.tsx:270-285 renders only a 'Change avatar' Button — no role="progressbar" anywhere in that file (the one at CreatePage.tsx:293-306 is the app's only upload progress element). Delete: no code path resets avatarUrl/avatarPublicId to the default, so an avatar is replace-only. Two additions that strengthen the downgrade: updateArtwork (artwork.api.ts:245-249) also posts multipart with no onUploadProgress, and EditArtworkPage.tsx:203-227 renders the media read-only with t('edit.mediaKept'), so the create flow is the single surface in the whole app that shows upload progress at all. I did verify the reviewer's strongest positive claim rather than take it on trust: @nestjs/common 11.1.28 and file-type 21.3.4 are both installed and node_modules/@nestjs/common/pipes/file/file-type.validator.js documents magic-number inspection, so 'format' validation is real, not a MIME-string check. Caveat worth passing to the team: the artwork surface alone satisfies all six bullets, so the risk here is moderate rather than certain-zero — but the two ~30-minute fixes remove it entirely.

</details>

---

### [Accessibility & i18n] Minor — Support for additional browsers (2+ browsers, test and fix all features in each, DOCUMENT browser-specific limitations, consistent UI/UX)

`minor` · **1 pt** · effort : small

**Preuve de ce qui existe**

There IS real cross-browser engineering in the code — this is not a checkbox lie:

• Firefox-driven transport fix: `frontend/src/features/presence/socket.ts:20-25` — "Prefer WebSocket: polling fires repeated XHRs that spam Firefox's 'Local Network Access' console log on localhost", implemented as `transports: ['websocket','polling']`.
• Firefox-driven backend change: `backend/src/auth/auth.service.ts:93` — the Google avatar is copied server-side into Cloudinary because the direct googleusercontent URL yields "a blank avatar (429 in Chrome, an aborted request in Firefox)".
• A commit dedicated to it: `58deecb fix: load images with CORS so firefox stops blocking google avatars`.
• Two documented limitations exist, in `README_DRAFT.md:410-413`: (a) "an error is shown in the console when user try to connect using Google Oauth in Brave browser. desactivate the shield to make it work." and (b) "Google profile-picture avatars are loaded cross-origin (CORS) to stay compatible with Firefox's Opaque Response Blocking."
• Nothing in the frontend uses a Chrome-only API; Tailwind v4 + Vite output is standards-based, and `frontend/src/index.css` uses no vendor prefixes.

**Le bullet qui échoue**

The subject's THIRD bullet — "DOCUMENT any browser-specific limitations" — fails as delivered, and that is enough for an evaluator to award 0:

1. THE DOCUMENTATION IS NOT IN THE DELIVERED README. `README.md:235` says only `- [x] Support for additional browsers` with zero supporting text. The two limitation notes live in `README_DRAFT.md`, a file whose own module table is prefixed with `> _TODO (team): confirm the final list you claim…_` (`README_DRAFT.md:344-347`) and whose contributions section is `- **srabeman** — TODO` / `- **nrakotom** — TODO` (`:395-396`). Pointing an evaluator at a file called DRAFT full of TODOs to satisfy a documentation requirement will not land.
2. NO TEST MATRIX. There is no `BROWSERS.md`, no per-feature × per-browser table, no browser versions recorded, and no statement of what was actually exercised (canvas pan/zoom, video autoplay on hover, Socket.IO chat, file upload, OAuth, RTL). `docs/` has 19 files and none covers browsers; `docs/AUDIT.md:62` itself grades this row "⚠️ **à tester + documenter** (Firefox/Safari)".
3. SAFARI IS CLAIMED BUT UNEVIDENCED. `README_DRAFT.md:333` asserts "cross-browser (Chrome, Firefox, Safari)". There is not a single Safari or WebKit reference anywhere in `frontend/src`, `backend/src`, `nginx/`, or `docs/`. If the evaluator asks "show me a Safari-specific fix or a Safari test note", there is nothing.
4. THE ONE BRAVE NOTE DOCUMENTS A CONSOLE ERROR (`README_DRAFT.md:410`), which collides with the general requirement "NO WARNINGS OR ERRORS IN THE BROWSER CONSOLE" if the evaluator happens to open Brave. Better to frame it as a shields/tracker-blocker limitation with the exact message and the workaround, than to leave it as a bare bug note.
5. `frontend/README.md` is still the untouched Vite starter template ("# React + TypeScript + Vite / This template provides a minimal setup…") — it contributes nothing and looks careless next to a browser-support claim.
6. No `browserslist` key in `frontend/package.json` and no `build.target` in `frontend/vite.config.ts`, so the supported-browser floor is undeclared (Vite default only).

**Comment le valider**

Recoverable in well under an hour and worth the point. Create `docs/BROWSER_SUPPORT.md` and LINK IT FROM `README.md` (replacing the bare checkbox) with: (a) a matrix of Chrome N / Firefox N / Brave N (or Chromium-Edge as the third) × the feature list — auth + Google OAuth, canvas pan/zoom/pinch, video-on-hover cards, Socket.IO chat + presence, upload with progress, admin CRUD, EN/FR/AR + RTL, legal pages — each cell PASS or a note; (b) a "Known browser-specific limitations" section that promotes the two real findings from README_DRAFT.md:410-413 verbatim plus the socket.ts transport rationale, each with a `file:line` pointer; (c) declare the floor with a `browserslist` field in `frontend/package.json`. Drop the Safari claim entirely unless someone actually tests on it — claiming an untested browser is what turns a PARTIAL into a rejected module. Finally, replace `frontend/README.md` with two paragraphs about this app.

<details><summary>Contre-expertise</summary>

Confirmed. The engineering is real but thin, and the documentation bullet fails in the delivered artifact. Real cross-browser work: frontend/src/features/presence/socket.ts:20-25 forces the websocket transport with an explicit Firefox rationale, and backend/src/auth/auth.service.ts:93 copies the Google avatar server-side because the direct URL yields '429 in Chrome, an aborted request in Firefox'. Those are the ONLY two browser-specific references in the entire repo — my grep for firefox|safari|webkit|brave|edge across README.md, docs/, frontend/src, backend/src and nginx/ returns nothing else except the AUDIT row. The delivered README.md:235 is a bare `- [x] Support for additional browsers` with no supporting text; the two limitation notes live only in README_DRAFT.md:410-413, a file whose own module table opens with `> _TODO (team): confirm the final list you claim…_` (:344-347) and whose contributions read `- **nrakotom** — TODO`. There is no BROWSERS.md, no per-feature × per-browser matrix, no browser versions, and docs/ (19 files) has nothing on the subject — docs/AUDIT.md:62 grades this row '⚠️ **à tester + documenter** (Firefox/Safari)' in the team's own words. README_DRAFT.md:333 claims Safari with zero Safari/WebKit evidence anywhere. I also confirmed there is no `browserslist` key in frontend/package.json and no `build.target` in vite.config.ts (the only `target` hits are the two dev-proxy targets at :19/:24), so the support floor is undeclared. frontend/README.md is still the verbatim Vite starter template. Third bullet ('DOCUMENT any browser-specific limitations') fails as delivered → an evaluator can legitimately award 0. PARTIAL is correct, and it is the cheapest point on this list to recover.

</details>

---

### [DevOps] Minor — Health check and status page system WITH automated backups AND disaster recovery

`minor` · **1 pt** · effort : small

**Preuve de ce qui existe**

All three named parts EXIST and are WIRED — this is close, and the gap is roughly 20 minutes of work.

HEALTH CHECK ✅ — `backend/src/health/health.controller.ts:5-15` exposes `@Public() GET /health`; `health.service.ts:8-26` does a real liveness probe (`SELECT 1` via Prisma inside try/catch) and returns `{status, backend, database, uptime, version, timestamp}`, degrading `status` to `error` when the DB is down. Module registered at `app.module.ts:42`. Beyond the endpoint, EVERY ONE of the 10 compose services carries a Docker healthcheck: frontend `docker-compose.yml:14-19`, backend `:40-45` (curls its own /health), postgres `:63-68`, backup `:88-93`, nginx `:112-117`, prometheus `:140-144`, grafana `:174-178`, postgres_exporter `:193-197`, node_exporter `:214-218`, alertmanager `:232-236` — and `depends_on: condition: service_healthy` gates startup ordering (`:35-37`, `:76-78`, `:105-109`, `:135-137`, `:188-190`). There is also an aggregate script `scripts/health_check.sh:1-18` (backend + frontend + `pg_isready`) exposed as `make health` (`Makefile:84-85`).

STATUS PAGE ✅ (exists, poorly surfaced) — `frontend/src/pages/StatusPage.tsx:91-226` polls `/api/health` every 30s (`:12`, `:118-125`) with a manual Refresh button (`:148-161`), colour-coded status badges (`:40-89`), formatted uptime (`:14-27`) and error state (`:170-183`). Routed at `frontend/src/app/router.tsx:48` and NOT auth-gated — `AuthGate` (`frontend/src/features/auth/AuthGate.tsx:19-58`) is only a session restorer, not a route guard, so `/status` is publicly reachable.

AUTOMATED BACKUPS ✅ — dedicated `backup` service at `docker-compose.yml:70-93` built from `backup/Dockerfile` (postgres:16-alpine so pg_dump matches the server major version; `:18` `CMD ["supercronic", "/etc/backup.cron"]`), schedule `backup/backup.cron:1` = `0 2 * * * /scripts/backup.sh`, volume `./backups:/backups` (`:84`), liveness proven by `pidof supercronic` (`:88-93`). `scripts/backup.sh:10-13` waits for `pg_isready`, `:19-24` runs the timestamped `pg_dump`, `:26-31` checks the exit code, `:33` enforces a 10-file retention policy. Manual trigger via `make backup` (`Makefile:69-70`).

DISASTER RECOVERY ✅ (exists) — `scripts/restore.sh:1-27` (arg validation, file-existence check, `set -e`) and `scripts/disaster_recovery.sh:1-23` (auto-selects the newest dump with `ls -t /backups/*.sql | head -n1`, guards the empty case, delegates to restore.sh), both surfaced as `make restore BACKUP_FILE=…` and `make recover` (`Makefile:72-82`).

**Le bullet qui échoue**

THREE defects, any one of which lets an evaluator award 0 on "fully functional":

1. ⚠️ THE SHIPPED BACKUPS ARE ALL EMPTY, AND THE DOCUMENTED TEST PROCEDURE IS THE CAUSE. All 10 committed dumps in `backups/` are 669 bytes — I read `backups/backup_2026-07-17_02-00-00.sql:1-27` in full: it is nothing but the pg_dump preamble (`SET statement_timeout`, `set_config('search_path','')`) followed immediately by `-- PostgreSQL database dump complete`. ZERO tables, ZERO rows. The reason is `docs/DevOps_Documentation.md:470-482`, which documents the backup test in exactly the wrong order: "### Test Backup — Delete all table: `DROP SCHEMA public CASCADE;` — Run a manual backup: `make backup`". Backing up AFTER dropping the schema is what produced these empty files. If an evaluator follows the written procedure at the defense, they destroy the live database and capture an empty dump, then `make restore` restores nothing — and the module demonstrably fails in front of them.

2. ⚠️ DISASTER RECOVERY REPORTS SUCCESS WHEN IT FAILS. `scripts/backup.sh:19-24` runs plain `pg_dump` with NO `--clean`/`--if-exists`, so the dump contains bare `CREATE TABLE`/`ALTER TABLE ADD CONSTRAINT`. `scripts/restore.sh:21-25` pipes it into `psql` with no `-v ON_ERROR_STOP=1` and no `--single-transaction`. In the actual recovery scenario the schema already exists (the backend entrypoint runs `npx prisma migrate deploy` on every boot — `backend/docker-entrypoint.sh`), so every DDL statement errors with "already exists" and the `_prisma_migrations` COPY errors on duplicate key. Because psql exits 0 on SQL errors without ON_ERROR_STOP, `set -e` never trips, restore.sh prints "Restore completed." (`:27`) and `disaster_recovery.sh:23` prints "Recovery completed successfully." over a wall of errors. A DR procedure that cannot distinguish success from failure is not a DR procedure.

3. ⚠️ THE DR PROCEDURE IS DOCUMENTED NOWHERE. `docs/DevOps_Documentation.md` — the project's DevOps doc — contains no occurrence of "disaster", "recover" or `make recover`; grepping `docs/*.md` for "disaster" hits only the team's own audit, `docs/AUDIT.md:79` ("⚠️ doc DR encore vide") and `:144` ("Doc DR (`scripts/doc/disaster_recovery.md` vide) → sécurise le Minor Devops"). The team already knows. The doc's recovery section stops at "Test Restore" (`:486-498`), never mentioning the automatic-latest path.

PLUS two demo-friction items (not bullet failures): (a) `/status` is linked from NOWHERE in the UI — `frontend/src/pages/HomePage.tsx:39-44` gives the footer only `/privacy` and `/terms`, and grepping the whole frontend for `"/status"` returns only the route definition at `router.tsx:48`. The evaluator has to be told to type the URL. (b) `StatusPage.tsx` is 100% inline `style={{}}` with hardcoded English strings — it uses neither the custom design system nor react-i18next, so it visually contradicts two other modules the team is claiming.

**Comment le valider**

Four fixes, ~20 minutes, then this is a solid VALIDATED:
1. FIX THE DOC ORDER — `docs/DevOps_Documentation.md:470-482`: the sequence must be `make backup` FIRST, then `DROP SCHEMA public CASCADE;` to simulate the disaster, then `make restore` / `make recover`, then `\dt` to prove the tables came back. As written it destroys the DB and captures nothing.
2. MAKE THE DUMP SELF-HEALING — `scripts/backup.sh:19-24`: add `--clean --if-exists` to the `pg_dump` invocation so a restore over an existing schema is idempotent instead of erroring on every statement.
3. MAKE FAILURE VISIBLE — `scripts/restore.sh:21-25`: add `-v ON_ERROR_STOP=1` to the `psql` call, so `set -e` (`:3`) actually aborts and "Restore completed." only ever prints on a real success. `disaster_recovery.sh` inherits the fix.
4. DELETE THE EMPTY DUMPS — `git rm backups/*.sql` (all 10 are tracked; `git ls-files backups/` confirms) and add `backups/*.sql` to `.gitignore`. Right now the only backup evidence in the repo is ten empty files, which is worse than none. Then run `make backup` once against a seeded DB and eyeball that the new file is hundreds of KB with real `COPY` blocks.
5. Two-minute polish: add `<TextLink to="/status">` next to privacy/terms in `frontend/src/pages/HomePage.tsx:39-44`, and add a `## Disaster Recovery` section to `docs/DevOps_Documentation.md` documenting `make recover` (auto-selects newest dump) vs `make restore BACKUP_FILE=…` (explicit), with the RPO implied by the 02:00 daily cron and the 10-file retention.

DEFENSE SCRIPT: show `docker compose ps` with all 10 healthy → `curl -k https://localhost:8443/api/health` → open `https://localhost:8443/status` and hit Refresh → `docker stop ft_pinterest_postgres` and reload /status to show it flip to `error`/`offline` (this is the money shot, it proves the check is real) → restart postgres → `make health` for the aggregate script → `make backup`, then `ls -lh backups/` showing a NON-empty timestamped dump → `DROP SCHEMA public CASCADE` → `make recover` → `\dt` showing the tables back.

<details><summary>Contre-expertise</summary>

Agree — PARTIAL, and the failing bullet is DISASTER RECOVERY. Everything else verified: /health is @Public() and does a real Prisma `SELECT 1` liveness probe degrading status to 'error' (backend/src/health/health.controller.ts:5-14, health.service.ts:8-26); all 10 compose services carry healthchecks and depends_on: service_healthy gates ordering (docker-compose.yml:14-19,40-45,63-68,88-93,112-117,140-144,174-178,193-197,214-218,232-236); scripts/health_check.sh:1-18 exposed as `make health` (Makefile:84-85); StatusPage polls /api/health every 30s and is routed publicly (frontend/src/pages/StatusPage.tsx:12,97-125, router.tsx:48 — no auth wrapper anywhere in that Routes block); backups are genuinely automated (backup/Dockerfile:18 CMD supercronic, backup/backup.cron:1 `0 2 * * * /scripts/backup.sh`, retention at scripts/backup.sh:33).

The DR bullet fails in the SHIPPED state, not just in theory: (i) all 10 dumps in backups/ are 669 bytes and are TRACKED (git ls-files backups/ lists all 10) — I read one end to end, it is the pg_dump preamble followed immediately by '-- PostgreSQL database dump complete', zero tables; (ii) scripts/disaster_recovery.sh:9 picks `ls -t /backups/*.sql | head -n1`, so on a fresh clone `make recover` restores one of those empty files; (iii) scripts/restore.sh:21-25 pipes into psql with no `-v ON_ERROR_STOP=1` and no --single-transaction, so psql exits 0 no matter what, `set -e` (:3) never trips, and restore.sh:27 + disaster_recovery.sh:23 print 'Restore completed.' / 'Recovery completed successfully.' unconditionally. Net effect an evaluator can reproduce in one command: `make recover` on a clean clone prints SUCCESS and restores NOTHING. That is a DR procedure that cannot distinguish success from failure — legitimately 0 on 'fully functional'. Compounding it, scripts/backup.sh:19-24 has no --clean/--if-exists while backend/docker-entrypoint.sh:11 runs `npx prisma migrate deploy` on every boot, so any restore lands on an existing schema and errors on every DDL statement — silently. And docs/DevOps_Documentation.md:468-484 documents the test in the destructive order (DROP SCHEMA public CASCADE, THEN `make backup`), which is exactly what produced the ten empty dumps; grep confirms the words 'disaster'/'recover'/'make recover' appear nowhere in that doc, so the DR entrypoint is undocumented. The two demo-friction items also check out: '/status' appears nowhere in the frontend except router.tsx:48 (grepped the whole of frontend/src), and StatusPage.tsx is 100% inline style objects with hardcoded English (:31 toLocaleString('en-US'), :40-89), using neither the design system nor i18next. Fix list in the original verdict is correct and sufficient.

</details>

---

### [Data & Analytics] Minor — GDPR compliance

`minor` · **1 pt** · effort : small

**Preuve de ce qui existe**

Three of four bullets are genuinely implemented.

(1) "Allow users to request their data" — VALIDATED. `frontend/src/features/gdpr/DataPrivacySection.tsx:20-24` mutates on `fetchMyData`; the "View my data" button is at `DataPrivacySection.tsx:66-79`, and the result renders a live per-category summary in a `role="status"` region at `DataPrivacySection.tsx:102-116`. `frontend/src/features/gdpr/gdpr.api.ts:14-17` calls `GET /users/me/export`. Backend endpoint: `backend/src/users/users.controller.ts:34-37` (`@Get('me/export')`, declared before `@Get(':id')` at :53 so it is not swallowed by the id route, and with no `@Public()` so the global JwtAuthGuard protects it — a user can only ever fetch `req.user.id`).

(3) "Export user data in a readable format" — VALIDATED, and in TWO formats. `backend/src/users/users.service.ts:327-407` selects account, artworks (+tags), comments, likes, followers, following and `_count`, explicitly omits the password, and wraps it with `exportedAt` / `format: 'atlaas-gdpr-export-v1'` / a human-readable `notice` (`users.service.ts:388-393`). Frontend writes pretty-printed JSON (`gdpr.api.ts:22-30`) and a sectioned CSV (`gdpr.api.ts:36-60`) with a UTF-8 BOM for Excel. The CSV serializer at `frontend/src/lib/csv.ts:4-12` even neutralizes spreadsheet formula injection (`/^[=+\-@\t\r]/`). Filenames are dated (`gdpr.api.ts:19-22`).

(2) "Data deletion with confirmation" — VALIDATED. `frontend/src/features/gdpr/DeleteAccountDialog.tsx:34` gates the destructive button on `typed === user.username`; the confirm input is at `DeleteAccountDialog.tsx:85-95` and the button is `disabled={!canConfirm}` at :102-104. Server-side the deletion is real and cascading: `backend/src/users/users.service.ts:224-297` — ownership/admin check at :236, last-admin guard at :245, Cloudinary avatar and every artwork asset deleted at :250-273, orphan conversations purged at :286, orphan tags at :290, `prisma.user.delete` at :282.

(4) "CONFIRMATION EMAILS for data operations" — ABSENT, TOTAL. This is not a partial implementation, it is zero code. `backend/package.json:22-52` lists no mail dependency whatsoever (no `nodemailer`, no `@nestjs-modules/mailer`, no `@sendgrid/mail`, no `resend`, no `aws-sdk`/SES). A repo-wide grep for `nodemailer|sendgrid|SMTP|smtp|mailgun|postmark|nestjs-modules/mailer|resend|sendMail|transporter` over all .ts/.tsx/.json/.yml/.md returns zero hits outside node_modules. `./.env.example`, `./backend/.env.example` and `./frontend/.env.example` contain no MAIL_/SMTP_ variables. `docker-compose.yml` has no mail/MailHog/Mailpit service. There is no `mail` module under `backend/src/` (the module list is artwork, auth, chat, cloudinary, comment, decorators, enums, follow, friends, health, likes, metrics, prisma, roles, search, users, websocket). Neither `exportUserData` (`users.service.ts:327`) nor `removeById` (`users.service.ts:224`) sends or enqueues anything. The Privacy Policy itself concedes the manual route: the "Your Rights and Choices" section (in `frontend/src/lib/i18n/locales/en/common.json`, `privacy.sections[4].body`) says "To exercise any of these rights, contact us at {{contactEmail}}" — a mailto address the user writes to, not a confirmation the system sends. The project has never sent an email of any kind (there is no signup email verification either).

i18n is complete: all 22 `gdpr.*` keys exist identically in en, fr and ar (`frontend/src/lib/i18n/locales/{en,fr,ar}/common.json`), so the section is fully translated and will not throw missing-key warnings during an RTL demo.

**Le bullet qui échoue**

Bullet 4 only: confirmation emails for data operations. The subject lists it as a required component of the module ("CONFIRMATION EMAILS for data operations"), and the project contains no mail-sending capability at all — not a stub, not a config, not a dependency. A strict evaluator reading the four bullets will award 0 for this Minor. This module does NOT survive without it as written; it survives only if the evaluator is lenient about one bullet out of four. README.md:237 claims it as `[x] GDPR compliance features`, so it WILL be demonstrated and the missing bullet WILL be probed.

**Comment le valider**

Add real mail sending and call it from both data operations. Cheapest defensible path, ~1-2h: (a) `npm i nodemailer` in backend/; (b) add a `mailpit` (or `mailhog`) service to docker-compose.yml exposing SMTP :1025 and a web UI, so the demo needs no external provider and no secrets — you can literally open the Mailpit inbox on screen during defense and show the mail arriving; (c) add `backend/src/mail/mail.service.ts` wrapping `nodemailer.createTransport({ host: process.env.SMTP_HOST, port: +process.env.SMTP_PORT })`, with MAIL_FROM/SMTP_HOST/SMTP_PORT added to .env.example; (d) call it from `users.service.ts:327 exportUserData()` ("Your Atlaas data export was generated on <date>") and from `users.service.ts:224 removeById()` — for the deletion mail, capture `user.email` BEFORE `prisma.user.delete` at :282 and send after the transaction succeeds; (e) wrap every send in try/catch so an SMTP outage never fails the export or the deletion (log and continue). Add the two new i18n-free templates as plain text. Then the four bullets are all demonstrable end-to-end.

<details><summary>Contre-expertise</summary>

Confirmed in code, verdict stands. Bullets 1-3 are real: `backend/src/users/users.controller.ts:33-37` exposes `@Get('me/export')` declared before `@Get(':id')` (line ~51-54) so it is not shadowed, and it takes `req.user.id` only — no id parameter, so no IDOR. `backend/src/users/users.service.ts` `exportUserData()` selects id/fullname/username/email/bio/avatarUrl/role/createdAt/updatedAt + artworks(+tags) + comments + likes + followers + following + `_count`, never selects `password`, and wraps the payload with `exportedAt`, `format: 'atlaas-gdpr-export-v1'` and a human-readable French `notice`. Frontend: `frontend/src/features/gdpr/gdpr.api.ts:13-16` fetches it, `:23-29` writes pretty JSON, `:36-60` writes a sectioned CSV with a UTF-8 BOM, and `frontend/src/lib/csv.ts:10` neutralises formula injection via `if (/^[=+\-@\t\r]/.test(raw)) raw = `'${raw}``. Deletion with confirmation: `DeleteAccountDialog.tsx:34 const canConfirm = typed === user.username` gating `disabled={!canConfirm}` at :109, backed by a real cascading delete in `users.service.ts removeById()` (ownership/admin check, last-admin guard returning `{ok:false, reason:'last_admin'}`, Cloudinary avatar + every artwork asset deleted, `prisma.user.delete`, orphan conversations and orphan tags purged). Bullet 4 is genuinely zero: `backend/package.json` dependencies (lines 22-52) contain no mail library at all — the list is @nestjs/*, @prisma/client, bcrypt, buffer-to-stream, class-transformer/validator, cloudinary, helmet, multer, passport*, prisma, prom-client, reflect-metadata, rxjs, socket.io — and a repo-wide grep for `nodemailer|sendgrid|smtp|mailgun|postmark|nestjs-modules/mailer|resend|sendMail|transporter|mailer` across .ts/.tsx/.json/.yml/.md/.mjs returns only three unrelated hits (`SettingsPage.tsx:196,201,205` local variable `emailError`). No mail module under `backend/src/` (artwork, auth, chat, cloudinary, comment, decorators, enums, follow, friends, health, likes, metrics, prisma, roles, search, users, websocket). The subject names 'CONFIRMATION EMAILS for data operations' as a defining component, so 3/4 = an evaluator can legitimately award 0. i18n check also confirmed: exactly 22 `gdpr.*` keys, identical key sets in en, fr and ar.

</details>

---

### [Accessibility & i18n] Minor — Multiple language support (3+ complete translations, i18n system, language switcher, all user-facing text translatable)

`minor` · **1 pt** · effort : trivial

**Preuve de ce qui existe**

I ran the repo's own guard: `cd frontend && node scripts/check-i18n.mjs` → `✓ i18n parity OK — 372 keys × en/fr/ar`. The script (`frontend/scripts/check-i18n.mjs:17-27`) flattens arrays as well as objects, so a language with a different number of legal sections or list items fails parity rather than passing on a matching top-level key — this is a stricter check than most teams write.

• Three complete locales: `frontend/src/lib/i18n/locales/{en,fr,ar}/common.json` (22 KB / 26 KB / 30 KB, 517/517/516 lines).
• Translations are REAL, not stubs. I diffed values programmatically: only 4 of 372 Arabic strings contain no Arabic script, and all 4 are correct to leave untranslated — `app.name` = "Atlaas" (brand), `chat.artworkBy` = "{{title}} · {{author}}" (pure interpolation), `form.emailPlaceholder` = "you@atlaas.app", `home.searchShortcut` = "Ctrl + K". The 19 FR strings identical to EN are genuine cognates ("Messages", "Description", "Bio", "Actions", "Portrait", "Branding", "Tags"). Sampled Arabic legal prose is fluent, human-quality MSA — e.g. `privacy.sections[0].body` and `privacy.sections[3].body`, and `ar.terms.sections.length === 10` matching EN.
• i18n system: `frontend/src/lib/i18n/index.ts:17-34` — i18next + react-i18next + browser language detector, resources bundled (no async backend, so `t()` is ready on first render, `:10`), `supportedLngs`/`fallbackLng` from `config.ts:10-12`, detection order `['localStorage','navigator']` persisting to `atlaas.lang` (`:27-31`). Type-safe: `frontend/src/lib/i18n/i18next.d.ts` means `tsc -b` fails on an unknown key.
• Language switcher: `frontend/src/components/ui/LanguageSwitcher.tsx` — a native `<select>` (keyboard/AT accessible by construction, `:12`) with an `sr-only` label (`:24`) and a tone-aware focus ring for dark headers (`:19-20`). Mounted on every top-level surface: `HomePage.tsx:30`, `AppHeader.tsx:32` (covers Profile/Settings/Create/Edit), `AuthCard.tsx:67` (login/register), `LegalPage.tsx:95`, `AdminPage.tsx:77`, `NotFoundPage.tsx:46`, `SettingsPage.tsx:432`.
• NO hardcoded user-facing text in the app JSX. I scanned every tracked `.tsx` for text nodes (multi-line, comment-stripped): the only hits are TypeScript generics and JSX-expression fragments, zero real strings. Attribute scan for `aria-label="…"`, `placeholder="…"`, `title="…"`, `alt="…"`, `label="…"` returns only the exceptions listed below.
• Locale-aware formatting rather than string concatenation: `frontend/src/lib/formatRelative.ts:3-12` (`Intl.RelativeTimeFormat` + `Intl.DateTimeFormat`), `:15-20`, `:22-38`; `frontend/src/lib/useCompact.ts:7-11` (`Intl.NumberFormat` compact — "12K" / "12 k" / "١٢ ألف"); `AdminAnalytics.tsx:42` and `AdminUsersTable.tsx:66` both pass the active language.
• Backend validation errors are mapped to i18n KEYS, not displayed raw: `frontend/src/lib/http.ts:65-85` splits Nest's English ValidationPipe sentences back into field names so the form translates by field (`SettingsPage.tsx:301` `t(profileErrors.fullname)`), with the deliberate comment at `:69-70`.

**Le bullet qui échoue**

Two blemishes, both cheap to close:

1. `frontend/src/pages/StatusPage.tsx` IS 100% HARDCODED ENGLISH. It is a real route (`frontend/src/app/router.tsx:48` → `/status`) and it is the demo surface for the claimed "health check and status page" minor. Offenders: `:145` "System status", `:159` "Refresh", `:165` "Loading status…", `:193` "Overall status", `:196` "Backend", `:199` "Database", `:202` "Version", `:207` "Uptime", `:210` "Last updated", `:220` "Checked at … · auto-refreshes every 30s", `:101` "Server responded with status {n}", `:110` "Failed to fetch system status.", plus raw backend status strings echoed through `getStatusTone(...).label = value` (`:43`,`:47`,`:50`,`:51`). Locale is hardcoded too: `toLocaleString("en-US")` at `:31` and `toLocaleTimeString("en-US")` at `:220`. It also has no `<AppHeader>`/`LanguageSwitcher`, so a user landing there cannot even switch language. Mitigating: nothing in the UI links to `/status` (grep confirms only the router mentions it), so an evaluator only sees it if the DevOps member demos it — which is exactly what will happen.

2. Three hardcoded sample placeholders in `frontend/src/features/admin/AddUserDialog.tsx:151` ("Maya Chen"), `:162` ("mayac"), `:175` ("maya@example.com"). Defensible as example data, but they render Latin text inside the Arabic admin UI.

3. PROCESS RISK ONLY (parity currently holds): `check-i18n.mjs:2-4` claims "CI / a pre-commit hook blocks a missing or stray translation", but there is no `.github/workflows`, no husky, and `.git/hooks` contains only `.sample` files. The script is manual — `npm run verify` in `frontend/package.json:10` chains it, but nothing enforces that anyone runs it.

**Comment le valider**

Demo path is solid: switch EN→FR→AR from the pill on Home, then walk Profile → Settings → Create → Admin → Privacy/Terms; everything flips including relative timestamps and compact counts, and the choice survives reload via `localStorage['atlaas.lang']`. Show `node scripts/check-i18n.mjs` output live — that single command is the strongest evidence for this module. BEFORE DEFENSE: add ~14 keys for StatusPage and wire `useTranslation` + `i18n.language` into it (15 min), or drop `/status` from the router if the DevOps demo uses the raw `/api/health` endpoint instead. Optionally move the AddUserDialog placeholders into `common.json`.

<details><summary>Contre-expertise</summary>

OVERTURNED — downgrade. Everything positive in the original verdict I independently reproduced: `node frontend/scripts/check-i18n.mjs` → `✓ i18n parity OK — 372 keys × en/fr/ar`; I re-flattened the three JSON files myself and only 4/372 Arabic values contain no Arabic script (app.name, chat.artworkBy, form.emailPlaceholder, home.searchShortcut — all correctly left as-is) and only 20 FR values equal EN (genuine cognates: Messages, Description, Bio, Actions, Portrait, Branding, Tags); lib/i18n/index.ts:17-34 is a proper bundled i18next+detector setup persisting to `atlaas.lang`; LanguageSwitcher is mounted on 8 top-level surfaces (AppHeader.tsx:32, HomePage.tsx:30, AuthCard.tsx:67, LegalPage.tsx:95, AdminPage.tsx:77, NotFoundPage.tsx:46, SettingsPage.tsx:432, plus its own file). But the subject's bullet is 'ALL user-facing text translatable', and it demonstrably fails on a real route. My own scans (bare-text-line scan across every .tsx, plus an attribute scan for hardcoded aria-label/placeholder/title/alt) return exactly two offenders: frontend/src/pages/StatusPage.tsx — which has ZERO useTranslation, hardcodes 'System status' (:145), 'Refresh' (:159), 'Loading status…' (:166), 'Overall status'/'Backend'/'Database'/'Version'/'Uptime'/'Last updated' (:193-210), 'Checked at … auto-refreshes every 30s' (:219-221), the error strings at :101/:110, echoes raw backend status words through getStatusTone().label (:43,:47,:50,:51), hardcodes `toLocaleString("en-US")` (:31) and `toLocaleTimeString("en-US")` (:220), and mounts no AppHeader/LanguageSwitcher so the user cannot even switch language there — and AddUserDialog.tsx:151/:162/:175 (three Latin sample placeholders). The original verdict called /status a 'blemish' partly because nothing links to it; that mitigation is wrong — the team's OWN docs/DevOps_Documentation.md:443 instructs the evaluator to open https://localhost:8443/status, so it WILL be on screen during the health-check/DevOps demo, in English, with no way to switch. That is one required bullet failing on a route the evaluator is told to visit, which is precisely the PARTIAL definition. This is a ~15-minute fix (add ~14 keys, wire useTranslation + i18n.language into StatusPage, or delete the route from router.tsx:48 and demo /api/health) after which I would sign VALIDATED without hesitation — but as delivered it is claimable-at-risk, not clean.

</details>

---

### [User Management] Minor — User activity analytics and insights dashboard

`minor` · **1 pt** · effort : ?

**Preuve de ce qui existe**

An admin "Overview" tab exists: frontend/src/pages/AdminPage.tsx:213-231 renders frontend/src/features/admin/AdminStats.tsx (total / admins / members cards) and frontend/src/features/admin/AdminAnalytics.tsx. The latter provides three metric cards (artworks, total likes, total comments — AdminAnalytics.tsx:194-219), a cumulative 30-day user-growth area chart (:28-51 growthSeries, :222-232), a content-growth area chart (:233-245), a role-distribution donut (:249-260), a top-creators bar list ranked by artworks (:147-155, :261-271) and a top-tags bar list (:157-168, :272-284). Charts are hand-written SVG components under frontend/src/components/ui/charts/ (AreaChart.tsx, BarList.tsx, DonutChart.tsx) with role="img" + aria-label (AreaChart.tsx:51-52, DonutChart.tsx:30). Loading skeletons and a retry path on fetch failure (:176-190) mean a failed fetch never renders as fake zeros.

**Le bullet qui échoue**

It is not a USER ACTIVITY dashboard — it is a registration-and-content dashboard. There is no activity data anywhere to analyse: backend/prisma/schema.prisma:10-31 has no lastLoginAt, no session model, no event/audit table, so nothing tracks logins, sessions, active users, retention or per-user engagement. The "user growth" curve (AdminAnalytics.tsx:132-135) plots `createdAt`, i.e. signups, not activity. There is no per-user drill-down (UserProfileModal shows works/followers/following counts, no activity timeline). The window is hardcoded (`const WINDOW_DAYS = 30` at AdminAnalytics.tsx:18) with no date-range picker and no filters, and the charts are static — grep for onMouseMove/tooltip/hover across frontend/src/components/ui/charts/*.tsx returns nothing, so there is no interaction at all. An evaluator holding the phrase "user activity analytics" against this can legitimately say the activity half is absent and award 0.

**Comment le valider**

Cheapest credible upgrade: add a `lastLoginAt DateTime?` to the User model, stamp it in AuthService.login/googleLogin, and surface (a) an "active in the last 7/30 days" metric card, (b) a date-range selector replacing the hardcoded WINDOW_DAYS, and (c) a per-user activity row (artworks/comments/likes + last seen) in UserProfileModal. Alternatively, drop the claim and let this dashboard serve only the Data & Analytics module.

<details><summary>Contre-expertise</summary>

Upheld. I checked for an upgrade and the 'activity' half is genuinely absent from the data model, not merely from the UI: `grep -niE 'lastlogin|lastseen|session|event|audit|activity' backend/prisma/schema.prisma` returns ZERO hits, and the User model (schema.prisma:10-31) carries only createdAt/updatedAt — nothing records a login, a session, a page view or an active-user count anywhere in the project. AdminAnalytics.tsx:132-135 feeds growthSeries with `users.map(u => u.createdAt)`, so the headline curve is cumulative SIGNUPS, not activity. The window is hardcoded (`const WINDOW_DAYS = 30`, AdminAnalytics.tsx:18) with no date-range control and no filters. I independently confirmed the charts are inert: `grep -rn 'onMouseMove|onMouseEnter|tooltip|Tooltip|hover' frontend/src/components/ui/charts/` over AreaChart.tsx, BarList.tsx and DonutChart.tsx returns nothing at all, so there is no interaction to demo. What does exist is real and well-built (metric cards :194-219, two area charts, a role donut, top-creators and top-tags bar lists at :147-168, skeletons and a retry path at :176-190 so a failed fetch never renders as fake zeros) — it is an insights dashboard about registrations and content, and it should be pointed at the Data & Analytics module rather than this one. An evaluator holding the literal phrase 'user activity' against it can award 0, which is exactly what PARTIAL means here.

</details>

---

## 5. Modules non implémentés

| Module | Type | Pts si ajouté |
|---|:---:|:---:|
| [Accessibility & i18n] Major — Complete WCAG 2.1 AA compliance (screen reader support, keyboard navigation, assistive technologies) | major | 2 |
| [Data & Analytics] Major — Advanced analytics dashboard | major | 2 |
| [DevOps] Major — Backend as microservices | major | 2 |
| [DevOps] Major — ELK log management | major | 2 |
| [User Management] Major — Organization system | major | 2 |
| [Web] Major — Public API with secured API key, rate limiting, documentation and 5+ endpoints | major | 2 |
| [Data & Analytics] Minor — Data export and import | minor | 1 |
| [User Management] Minor — Complete 2FA | minor | 1 |
| [Web] Minor — Progressive Web App (offline support + installability) | minor | 1 |
| [Web] Minor — Real-time collaborative features | minor | 1 |
| [Web] Minor — Server-Side Rendering (SSR) | minor | 1 |

<details><summary><b>[Accessibility & i18n] Major — Complete WCAG 2.1 AA compliance (screen reader support, keyboard navigation, assistive technologies)</b></summary>

**Constat** — The a11y engineering is genuinely well above the level of a typical ft_transcendence submission, and that must be said plainly:

• Modal focus management is real: `frontend/src/components/ui/Modal.tsx:34-53` moves focus into the panel, locks body scroll and restores focus on close; `:56-102` implements a true Tab/Shift-Tab containment loop plus Escape, including the hard case where focus has slipped to <body> (`:85-95`). `role="dialog"` + `aria-modal` + `aria-labelledby` at `:113-118`.
• APG tabs with roving tabindex AND RTL-aware arrow keys: `frontend/src/pages/ProfilePage.tsx:104-113` (`const forward = (event.key === 'ArrowRight') !== rtl`), `:232-268` (`role="tablist"/"tab"/"tabpanel"`, `aria-selected`, `tabIndex={active?0:-1}`, `aria-controls` only on the selected tab).
• The infinite canvas is keyboard-operable: `frontend/src/features/artworks/canvas/useCanvasCamera.ts:471-508` (arrows pan, +/- zoom, Home/0 recenter, `isFormTarget` guard) and it is a named focusable landmark (`frontend/src/features/artworks/canvas/ArtworkCanvas.tsx:206-212`, `role="region"` + `aria-label` + `tabIndex={0}` + `focus-visible:ring`). Global Ctrl/Cmd+K at `:171-195`.
• Combobox pattern with `aria-activedescendant` so arrow-key movement is announced: `frontend/src/features/artworks/components/SearchOverlay.tsx:217-227`.
• Live regions used deliberately, including the always-mounted pattern: `frontend/src/pages/ProfilePage.tsx:213-216` (`{/* Always-mounted live region so the announcement fires reliably */}`), `frontend/src/features/artworks/components/ArtworkDetail.tsx:696`, `role="log" aria-live="polite" aria-relevant="additions"` on the chat transcript `frontend/src/features/chat/components/ConversationThread.tsx:159-163`.
• Non-colour status: `frontend/src/components/ui/OnlineDot.tsx:17-19` pairs the green dot with `sr-only` text.
• Form labels are structural, not optional: `frontend/src/components/ui/Input.tsx:6-13` makes `label` a required prop, `:39-47` wires `htmlFor`/`id`/`aria-invalid`/`aria-describedby`, `:75-78` `role="alert"` on the error.
• Alt-text discipline is correct throughout — every `<img>`/`SafeImage` has an `alt`; decorative ones use `alt=""` where an adjacent accessible name exists (`frontend/src/features/artworks/components/ArtworkCard.tsx:90` + `aria-label` on the wrapping Link at `:154`).
• `motion-reduce:` variants on essentially every animation, plus a JS `prefers-reduced-motion` check in `frontend/src/features/artworks/components/HeroTitle.tsx:22`.
• `focus-visible:ring-2` is baked into the shared primitives (`frontend/src/components/ui/Button.tsx:17`, `frontend/src/components/ui/TextLink.tsx:10`).

But "complete WCAG 2.1 AA" is a checklist, and the following are demonstrable failures an evaluator with axe DevTools finds in under two minutes.

**Ce qu'il faudrait** — An evaluator will (a) press Tab on the home page and look for a "Skip to content" link, (b) open axe DevTools / Lighthouse and read the contrast + `aria-progressbar-name` violations, (c) check the browser tab title while navigating. To make this claimable: add a `sr-only focus:not-sr-only` skip link in `AppHeader.tsx` and `HomePage.tsx` targeting `<main id="main">`; add a tiny `useDocumentTitle(t(...))` hook called from each page; global find-replace `text-neutral-400` → `text-neutral-500` (4.74:1) for every non-`aria-hidden` text use and `placeholder:text-neutral-400` → `placeholder:text-neutral-500`, and `text-green-600` → `text-green-700`; add `aria-label={t('create.uploading')}` to `CreatePage.tsx:294`; add the three `autoComplete` attributes in `SettingsPage.tsx`; make `ToastViewport` render the `aria-live` container unconditionally and only map toasts inside it; point `aria-controls` at the `<ul role="listbox">`. Then run `npx @axe-core/cli` (or Lighthouse) against each route and COMMIT THE REPORT to `docs/` — a stored audit is what turns this from an assertion into a demonstrable module. Until that exists, leave it unclaimed.

</details>

<details><summary><b>[Data & Analytics] Major — Advanced analytics dashboard</b></summary>

**Constat** — A real admin overview dashboard exists and renders, but ZERO of the four qualifiers in the subject's definition are implemented.

WHAT EXISTS: `frontend/src/features/admin/AdminAnalytics.tsx` (289 lines), mounted on the Overview tab at `frontend/src/pages/AdminPage.tsx:226-231`, behind `RequireRole` (`AdminPage.tsx:36`). Three metric cards (artworks/likes/comments, `AdminAnalytics.tsx:194-219`), two cumulative-growth area charts (`:222-246`), a role donut (`:249-260`) and two top-N bar lists (`:261-284`). Charts are hand-rolled dependency-free SVG: `frontend/src/components/ui/charts/AreaChart.tsx`, `BarList.tsx`, `DonutChart.tsx`. Loading skeletons (`AdminAnalytics.tsx:107-114`), an error+retry state (`:178-190`), locale-aware axis labels via `Intl.DateTimeFormat` (`:42`) and LTR-pinned axis captions for RTL (`AreaChart.tsx:66-71`). Everything is computed client-side from `GET /users` and `GET /search/artworks?limit=1000` (`frontend/src/features/admin/admin.api.ts:35-40, 48-51`) — there is no analytics endpoint on the backend.

BULLET 1 "interactive charts" — FAILS. The three chart components contain no interaction whatsoever. `grep -n "onMouseOver|onMouseEnter|onClick|<title>|tooltip|Tooltip|onPointer" frontend/src/components/ui/charts/*.tsx` returns NOTHING. `AreaChart.tsx:48-65` is two static `<path>` elements; `DonutChart.tsx:33-50` is static `<circle>` arcs; `BarList.tsx:26-44` is a static `<ul>`. No hover tooltip, no value readout, no legend toggle, no drill-down, no zoom. They are pictures.

BULLET 2 "real-time updates" — FAILS. `AdminAnalytics.tsx:124-127` is a plain `useQuery` with no `refetchInterval`; `AdminPage.tsx:51-54` likewise. `grep -rn "refetchInterval|refetchOnWindowFocus" frontend/src` returns NOTHING in the entire codebase. No socket feeds the dashboard: the only socket-driven cache invalidator, `frontend/src/features/artworks/ArtworkSyncProvider.tsx:32-50`, listens solely to `artwork:deleted` and invalidates `artworkKeys` + `['users']` (`:36-47`) — it never touches `adminKeys` (`['admin','users']` / `['admin','artworks']`, `admin.api.ts:27-30`). Every `adminKeys` invalidation in the app is mutation-local (AddUserDialog.tsx:83, DeleteUserDialog.tsx:44-48, RoleSelect.tsx:48, AdminArtworksPanel.tsx:51). A user signing up or posting an artwork in another browser produces no change on the dashboard. There is not even a manual refresh button on Overview — the refresh control at `AdminPage.tsx:193-202` is gated on `tab === 'users'`. With `staleTime: 30_000` (`frontend/src/app/providers.tsx:22`) the numbers only move on remount or window refocus.

BULLET 3 "export (PDF/CSV)" — FAILS. There is no export control anywhere in `AdminAnalytics.tsx` or `AdminPage.tsx`. `grep -rn "toCsv|downloadFile" frontend/src` returns hits ONLY in `frontend/src/lib/csv.ts` and `frontend/src/features/gdpr/gdpr.api.ts` — the CSV helper the project already owns is never wired to the dashboard. No PDF capability exists at all: `frontend/package.json` dependencies contain no jsPDF, no html2canvas, no print stylesheet.

BULLET 4 "customizable date ranges and filters" — FAILS. The window is a hard-coded module constant: `AdminAnalytics.tsx:18` `const WINDOW_DAYS = 30`, consumed at `:31, :34, :39, :44`. There is no date picker, no preset range selector, no filter control of any kind — no role filter, no tag filter, no author filter. Top-N cutoffs are also hard-coded `.slice(0, 6)` at `:152` and `:166`.

SEPARATION FROM DEVOPS: the Grafana dashboards under `monitoring/grafana/dashboards/` with `monitoring/prometheus.yml` and `monitoring/alert_rules.yml` are the [DevOps] "Monitoring with Prometheus AND Grafana" Major. They are infrastructure metrics behind a separate Grafana login, not an in-app analytics dashboard, and cannot be counted a second time here. Confirmed independent: nothing in `frontend/src` references Grafana or Prometheus, and `backend/src/metrics` feeds prom-client only.

**Ce qu'il faudrait** — Every gap is small individually and the whole set is a realistic pre-defense sprint (~4-6h) because the primitives already exist:
(a) EXPORT — cheapest win, ~30 min. Import `toCsv`/`downloadFile` from `@/lib/csv` (already written and injection-safe, `frontend/src/lib/csv.ts:34-59`) and add an "Export CSV" button to `AdminAnalytics.tsx` that emits the metric cards + `userGrowth` + `artworkGrowth` + `topCreators` + `topTags` as titled sections, exactly like `gdpr.api.ts:36-60` already does. For "PDF", a `@media print` stylesheet plus a "Print / Save as PDF" button is defensible and costs another 30 min.
(b) DATE RANGE — ~45 min. Turn `AdminAnalytics.tsx:18 WINDOW_DAYS` into React state with 7/30/90-day preset buttons (or two `<input type="date">`), thread it into `growthSeries()` (`:28-51`), and filter the artworks/users arrays before the `useMemo`s at `:132-174` so the metric cards and top-N lists honour the range too — otherwise the cards will contradict the charts and the evaluator will notice.
(c) FILTERS — ~45 min. Add a role filter for the users series and a tag filter for the content series; both are pure client-side `Array.filter` over data you already hold.
(d) REAL-TIME — ~1h. Two layers: add `refetchInterval: 15_000` to the two `useQuery` calls (`AdminAnalytics.tsx:124-127`, `AdminPage.tsx:51-54`) for a guaranteed live demo, AND extend `ArtworkSyncProvider.tsx:32-50` to invalidate `adminKeys.artworks()`/`adminKeys.users()` on `artwork:deleted` plus a new `artwork:created` broadcast, so posting from a second browser visibly bumps the dashboard while the evaluator watches. Add a visible "updated Xs ago" stamp.
(e) INTERACTIVITY — ~1-2h. Minimum credible: a hover tooltip on `AreaChart` (track pointer X, map to the nearest index, render an HTML tooltip outside the stretched viewBox so it is not distorted) and clickable legend entries on `DonutChart`/`BarList` that filter the view. Also add `<title>` elements per segment for screen readers, which doubles as accessibility evidence.
Only claim this Major once (a)-(e) are all demonstrable; a half-done version still scores 0.

</details>

<details><summary><b>[DevOps] Major — Backend as microservices</b></summary>

**Constat** — CONFIRMED NOT VALIDATED — the backend is a textbook modular MONOLITH. `backend/src/app.module.ts:31-62` imports all 15 feature modules (Prisma, Users, Artwork, Cloudinary, Follow, Likes, Health, Comment, Auth, Search, Friends, OnlineStatus, Websocket, Chat, Metrics) into ONE `AppModule`, compiled into ONE process. `backend/src/main.ts` calls `NestFactory.create<NestExpressApplication>(AppModule)` and a single `app.listen(process.env.PORT ?? 3000)` — there is no `app.connectMicroservice()`, no `NestFactory.createMicroservice()`, no `Transport.*`, no `@MessagePattern`/`@EventPattern`. `grep microservices backend/package.json` returns nothing: `@nestjs/microservices` is not a dependency. No message broker exists anywhere — grep for rabbitmq/kafka/redis/nats/amqp across `backend/package.json` and `docker-compose.yml` returns NONE FOUND. At the infrastructure level `docker-compose.yml:21-45` runs exactly one `backend` container exposing one port (`:33-34`), and the whole API is behind a single nginx upstream (`nginx/nginx.conf:96-108` `/api/` → `http://backend:3000/`, `:110-119` `/socket.io/` → the same container). The team's own audit agrees: `docs/AUDIT.md:80` `| ELK / Microservices (Majors) | – | ❌ | monolithe Nest |`. Not claimed in `README.md:213-235`.

**Ce qu'il faudrait** — Do NOT attempt. Splitting a monolith with a shared Prisma client, a global JwtAuthGuard and a Socket.IO gateway into independently-deployable services with a broker is a full rewrite of the deployment topology and would jeopardize the WebSocket, presence and chat modules that currently work. Leave it unchecked and unmentioned. If an evaluator asks, state clearly that the backend is a modular monolith and that the DevOps points are claimed on Prometheus/Grafana plus health/backups/DR.

</details>

<details><summary><b>[DevOps] Major — ELK log management</b></summary>

**Constat** — CONFIRMED ABSENT. `docker-compose.yml` defines exactly 10 services (`:3 frontend, :21 backend, :47 postgres, :70 backup, :95 nginx, :119 prometheus, :146 grafana, :180 postgres_exporter, :199 node_exporter, :220 alertmanager`) — no elasticsearch, no logstash, no kibana, no filebeat. A repo-wide case-insensitive grep for elastic/logstash/kibana/ELK across everything outside node_modules and .git returns only: `README.md:148` — the literal template placeholder `- **[Add if applicable]**: ELK Stack (Elasticsearch, Logstash, Kibana) for log management` (an unfilled boilerplate line, not a claim); `docs/AUDIT.md:80` — the team's own `| ELK / Microservices (Majors) | – | ❌ | monolithe Nest |`; `docs/backend.md:188` — a row in a list of AVAILABLE modules; plus incidental byte matches inside `backend/package-lock.json`, `frontend/package-lock.json`, the `backup/supercronic` binary and some seed JPEGs. There is no log shipper, no centralized log store, no log-query UI, and no structured logging in the backend feeding one. The team does not claim it in the README module list (`README.md:213-235`) either.

**Ce qu'il faudrait** — Do NOT attempt this before the defense — it is a multi-day module (ES + Logstash pipeline + Kibana provisioning + structured logging in Nest + index lifecycle), it needs 2-4 GB of extra RAM on the eval machine, and adding three heavy containers days before defense risks breaking the `make start` single-command requirement that the whole project depends on. ACTION: delete the misleading `[Add if applicable]` placeholder at `README.md:148` so no evaluator reads it as a claim, and if asked, answer plainly that logging is handled by `docker compose logs` and that observability was invested in Prometheus/Grafana instead.

</details>

<details><summary><b>[User Management] Major — Organization system</b></summary>

**Constat** — Nothing exists. backend/prisma/schema.prisma defines only User, Artwork, Like, Comment, Follow, Tag, Conversation, ConversationParticipant, Message — no Organization, Team, Workspace, Membership or tenant model, and no organizationId on any model. A case-insensitive grep for organization|workspace|team|tenant across backend/src, frontend/src and backend/prisma returns exactly one hit, and it is an unrelated comment (frontend/src/features/legal/legal.config.ts:4). There is no organisation route in frontend/src/app/router.tsx and no organisation module in backend/src/.

**Ce qu'il faudrait** — Not worth attempting before the defense: an organization system means a new Prisma model, membership + per-org roles, org-scoped queries across artworks/search/chat, and invitation flows. Leave it unclaimed.

</details>

<details><summary><b>[Web] Major — Public API with secured API key, rate limiting, documentation and 5+ endpoints</b></summary>

**Constat** — Endpoint count is the only bullet met (well over 5 across auth/users/artworks/likes/comments/follow/friends/search/conversations, GET/POST/PATCH/DELETE — no PUT anywhere). Every other bullet fails. (1) API KEY: there is no API-key mechanism at all — a case-insensitive search for `api[-_ ]?key|apiKey|x-api-key` across the whole repo returns only Cloudinary's own credential (`backend/src/cloudinary/cloudinary.service.ts:10`, `backend/.env.example:15`), and `schema.prisma` has no ApiKey/Token model. The only auth is the user-session JWT (`backend/src/app.module.ts:56-59` global JwtAuthGuard). (2) RATE LIMITING: `ThrottlerModule.forRoot([{ ttl: 10000, limit: 20 }])` is imported at `backend/src/app.module.ts:38`, but `ThrottlerGuard` is NEVER registered as an `APP_GUARD` — the providers array at `:52-60` registers only JwtAuthGuard and MetricsInterceptor. The guard is applied to exactly ONE route in the codebase, `POST /conversations/:id/messages` (`backend/src/chat/chat.controller.ts:47-48`). Login, register, search, upload and every other endpoint are unthrottled. (3) DOCUMENTATION: Swagger is set up (`backend/src/main.ts:30-36`) but `@Api*` decorators return ZERO matches across `backend/src`, and `nest-cli.json` does not enable the `@nestjs/swagger` CLI plugin — so the generated page has no request/response schemas, no descriptions, no examples. `DocumentBuilder` also never calls `.addBearerAuth()`, so the UI has no Authorize button and not one authenticated endpoint can be exercised from it; the title is still the stale "Pinterest API" (`main.ts:31`). The hand-written `docs/api_docs.md` is worse than nothing on the friends section: it documents 9 endpoints (`docs/api_docs.md:379-424` — POST /friends/request/:userId, DELETE /friends/:userId, PATCH /friends/:userId/request/accept, DELETE /friends/:userId/request, GET /friends/:userId, GET /friends/requests, GET /friends/requests/pending …) of which only 2 exist — `friends.controller.ts:18-26` has GET / and GET /online and nothing else (the leftover `Post, Delete, Patch, ParseUUIDPipe` imports at `friends.controller.ts:1-10` are the fossil). Its base URL is also `http://localhost:3000` (`api_docs.md:3-7`), i.e. plaintext, contradicting the mandatory HTTPS requirement.

**Ce qu'il faudrait** — Do not claim it; there is no cheap path to it before defense. Two defensive cleanups instead, since an evaluator may still open these files: (a) fix or delete `docs/api_docs.md:379-424` — being asked to curl `POST /friends/request/:userId` and getting a 404 in front of the jury reads as "non-functional module" and can bleed onto the interaction Major; (b) either register `ThrottlerGuard` as a global `APP_GUARD` in `app.module.ts` (it is already configured, one line) so /auth/login is actually rate-limited, or be ready to say the throttler is deliberately scoped to chat.

</details>

<details><summary><b>[Data & Analytics] Minor — Data export and import</b></summary>

**Constat** — Only one of the three required bullets exists.

"Export in multiple formats" — MET. JSON (`frontend/src/features/gdpr/gdpr.api.ts:22-30`) and CSV (`gdpr.api.ts:36-60`), both driven by `frontend/src/lib/csv.ts:34-45 toCsv()` / `:47-59 downloadFile()`.

"IMPORT with validation" — ABSENT. There is no import path anywhere. A repo-wide grep for `bulk|Bulk|deleteMany|selectAll|checkbox|type="file"|accept=` across `frontend/src` returns exactly two `type="file"` inputs, and both are image uploads, not data import: `frontend/src/pages/CreatePage.tsx:223-224` (artwork media) and `frontend/src/pages/SettingsPage.tsx:273-274` (`accept="image/jpeg,image/png,image/webp"` avatar). No JSON/CSV file picker, no parser, no server route that ingests an export document. Backend controllers expose no import endpoint: `backend/src/users/users.controller.ts` has only `me`, `me/export`, `/`, `username/:username`, `:id`, `:id/artworks`, `:id/artworks/liked`, PATCH `:id`, PATCH `:id/roles`, DELETE `:id`. Correspondingly there is no import DTO under `backend/src/users/dto/`. `seed-atlaas.mjs` is a developer CLI that POSTs to /auth/register and /artworks (see its header comment, lines 1-30) — it is not a user-facing import, has no validation of an uploaded document, and cannot be demonstrated in the browser as this module.

"Bulk operations" — ABSENT. No multi-select in any admin table: `frontend/src/features/admin/AdminUsersTable.tsx` and `AdminArtworksPanel.tsx` contain no checkbox, no selection state, no batch action. The only `deleteMany` calls in the whole backend are internal cleanup (`backend/src/users/users.service.ts:286` orphan conversations, `:290` orphan tags, `backend/src/artwork/artwork.service.ts:33` orphan tags) — not user-invoked bulk operations.

The team does not claim this module in README.md (it is absent from the Minor list at README.md:225-241), which is the correct call.

**Ce qu'il faudrait** — Do not claim this module for the defense; the gap is a full feature, not a polish item. If you do want the point (~4-6h): (1) backend `POST /users/me/import` accepting a multipart JSON file, parsed against a class-validator DTO that mirrors the `atlaas-gdpr-export-v1` shape produced at `backend/src/users/users.service.ts:388-393` (validate `format`, reject unknown versions, cap array lengths, whitelist fields so no role/id can be smuggled in), restoring only safe entities (bio, artwork titles/descriptions/tags) and reporting a per-row accepted/rejected summary; (2) a file picker + dry-run preview + error table in `frontend/src/features/gdpr/DataPrivacySection.tsx`; (3) bulk ops: add row checkboxes and a batch-delete action to `AdminUsersTable.tsx`/`AdminArtworksPanel.tsx` backed by a new `POST /admin/users/bulk-delete` that reuses the guards already in `users.service.ts:236` and `:245`. Given the timeline, spending this effort on the GDPR confirmation-email gap instead is a far better points-per-hour trade.

</details>

<details><summary><b>[User Management] Minor — Complete 2FA</b></summary>

**Constat** — Nothing exists. A case-insensitive grep for 2fa|two.?factor|totp|otplib|speakeasy|authenticator across backend/src, frontend/src, backend/prisma, README.md and all three package.json files returns no hits. backend/package.json:22-51 lists no TOTP/OTP library (only bcrypt, passport-jwt and passport-google-oauth20). backend/prisma/schema.prisma:10-31 has no twoFactorSecret/twoFactorEnabled/recoveryCodes fields, and backend/src/auth/auth.service.ts:62-78 logs the user in with a single bcrypt.compare and immediately mints the token — there is no second-factor step in the flow.

**Ce qu'il faudrait** — Would require otplib + a secret/recovery-code schema migration + an enrolment UI (QR) + a challenge step between password verification and signToken. Too large to add safely before an imminent defense; leave unclaimed.

</details>

<details><summary><b>[Web] Minor — Progressive Web App (offline support + installability)</b></summary>

**Constat** — No manifest and no service worker. frontend/public contains exactly two files — favicon.svg and icons.svg (a social-logo sprite); there is no manifest.webmanifest / manifest.json and no sw.js. frontend/index.html:1-13 links only rel="icon"; there is no <link rel="manifest">, no theme-color meta. frontend/package.json:14-31 has no vite-plugin-pwa or workbox dependency, and frontend/vite.config.ts registers no PWA plugin. A search for serviceWorker/navigator.serviceWorker across frontend/src returns nothing.

**Ce qu'il faudrait** — If you want a cheap extra minor before defense this is the most achievable of the three unclaimed ones: add vite-plugin-pwa, a manifest (name, short_name, 192/512 icons, start_url, display: standalone, theme_color) and a Workbox runtime-caching config that precaches the app shell and serves a cached offline page. But the subject demands genuine offline SUPPORT, not just an installable shell — you would need the canvas to render cached tiles offline, which means caching the /search/artworks responses and the Cloudinary media. Half a day minimum, and it must be demoed with the network throttled to Offline in Chrome DevTools.

</details>

<details><summary><b>[Web] Minor — Real-time collaborative features</b></summary>

**Constat** — There is real-time infrastructure, but nothing collaborative. backend/src/websocket/websocket.gateway.ts exposes exactly three outbound event types: friendStatusChange (:37, :56 — presence), chat:typing (:83-94 — an ephemeral 1-1 typing relay), and a global broadcast() (:76-78) used by exactly one caller, artwork.service.ts:264/:310 emitting 'artwork:deleted'. The frontend listens to precisely five events — frontend/src/features/artworks/ArtworkSyncProvider.tsx:50 ('artwork:deleted'), frontend/src/features/chat/ChatProvider.tsx:126-129 ('message:new', 'conversation:read', 'chat:typing', 'connect') and frontend/src/features/presence/PresenceProvider.tsx:39-41 ('friendStatusChange', 'friendsChanged', 'connect').

No shared document, no shared canvas state, no live cursors/selections, no operational transform or CRDT, no conflict resolution, no presence-within-a-resource. The infinite canvas camera is purely local (frontend/src/features/artworks/canvas/useCanvasCamera.ts) and artwork editing is single-owner and metadata-only (EditArtworkPage.tsx:203-228 renders the media read-only with an 'edit.mediaKept' note; backend artwork.service.ts:170-220 update() never touches the file). Worth noting for the separate real-time major too: artwork CREATE and UPDATE are not broadcast at all — only DELETE is — so live cross-client sync is one-directional.

**Ce qu'il faudrait** — Do not claim it. If you wanted the cheapest honest version it would be collaborative comment presence (broadcast 'X is commenting on this artwork' into an artwork room, render live avatars on the detail modal) plus live comment/like insertion pushed over the socket instead of refetched — but that is at best a stretch of the definition, and the real work (shared editing with conflict resolution) is days. Better use of the remaining time: close the notification-coverage gap and add the search sort/pagination controls, which are two nearly-free points.

</details>

<details><summary><b>[Web] Minor — Server-Side Rendering (SSR)</b></summary>

**Constat** — Pure client-rendered Vite SPA. frontend/index.html:1-13 is a static shell whose body is just <div id="root"></div> plus a module script; frontend/src/main.tsx:9-13 does createRoot(...).render(<App/>) in the browser. frontend/vite.config.ts has plugins react() + tailwindcss() only — no ssr build target, no entry-server.tsx, no server-side render call anywhere (a search for renderToString/renderToPipeableStream/hydrateRoot in frontend/src returns nothing). The Dockerfile serves static assets behind nginx; there is no Node render server.

**Ce qu'il faudrait** — Not worth attempting before defense. Doing it properly means a Vite SSR build (entry-client/entry-server), a Node render server in front of nginx, hydration-safe rewrites of the zustand/localStorage token bootstrap (frontend/src/features/auth/token.ts) and of every window/document access in the canvas code. Days of work, high regression risk. Leave unclaimed.

</details>

### Non applicables

- **[Web] Minor — Use a frontend framework** — React 19 is genuinely used (`frontend/package.json:24`, `frontend/vite.config.ts:7`), but this Minor is the fallback for a project that frameworks ONLY the frontend. The project frameworks both sides and already claims the Major above (`README.md:214` `[x] Use a framework for the frontend and backend(React, NestJS)`), while `README.md:226` also claims `[x] Use a frontend framework (React)`.
- **[Web] Minor — Use a backend framework** — NestJS 11 is genuinely used (`backend/src/main.ts:9`, `backend/package.json:23-33`), but same structural problem: `README.md:227` claims `[x] Use a backend framework (NestJS)` on top of the Major at `README.md:214`.
- **[User Management] Minor — Game statistics (user and game stats dashboards)** — There is no game in the project and therefore nothing to keep statistics about. A case-insensitive grep for game|pong|tournament|score across backend/src, frontend/src and backend/prisma returns only false positives on unrelated words (`passwordMatch` in backend/src/auth/auth.service.ts:72, `window.matchMedia` in frontend/src/components/IntroReveal.tsx:57, regex `.exec()` matches in frontend/src/f

---

## 6. Modules faits mais non revendiqués — points gratuits

Le README laisse ces cases **décochées** alors que le code les implémente. Rien à
développer : il suffit de corriger le README.

| Module | Pts | État réel |
|---|:---:|---|
| Monitoring Prometheus + Grafana | 2 | VALIDATED — décoché dans README.md |
| OAuth 2.0 Google | 1 | VALIDATED — décoché dans README.md |
| Interaction utilisateurs (chat/profil/amis) | 2 | PARTIAL — décoché alors que chat et profil sont faits |
| User Management standard | 2 | PARTIAL — décoché alors que l'essentiel est fait |

**3 points immédiatement récupérables** (les deux VALIDATED), et 4 de plus une fois
les deux partiels complétés.

---

## 7. Plan d'action priorisé

### Étape 1 — Éliminer le risque de rejet (~1 h, 0 point mais évite le zéro global)

| # | Action | Fichier |
|:--:|---|---|
| 1 | `.toLowerCase()` sur l'email à l'inscription — sans quoi tout compte créé avec une majuscule est verrouillé à vie | `backend/src/auth/dto/register.dto.ts:26`, `backend/src/users/dto/create-user.dto.ts:38` |
| 2 | Rendre like/unlike idempotents (`upsert` / `deleteMany`) — supprime le 400 et la course `P2002` | `backend/src/likes/likes.service.ts:24-59` |
| 3 | `upsert` sur la conversation — supprime la course `P2002` | `backend/src/chat/chat.service.ts:61-68` et `:158-165` |
| 4 | `@ArrayMaxSize(5)` sur les tags | `backend/src/artwork/dto/create-artwork.dto.ts:38` |
| 5 | DTO de pagination pour le chat (`@IsInt @IsPositive @Max`) | `backend/src/chat/chat.controller.ts:34-42` |
| 6 | `@MaxLength(100)` sur `q` + `maxLength` sur l'input de recherche | `backend/src/search/dto/create-search.dto.ts:14` |
| 7 | **Corriger l'ordre de la procédure de backup** — telle qu'écrite elle détruit la base et capture un dump vide | `docs/DevOps_Documentation.md:470-482` |
| 8 | `--clean --if-exists` au `pg_dump`, `-v ON_ERROR_STOP=1` au `psql` | `scripts/backup.sh:19`, `scripts/restore.sh:21` |
| 9 | Supprimer les 10 dumps vides du dépôt et les gitignorer | `backups/*.sql` |
| 10 | Neutraliser le 401 rouge d'un JWT périmé au démarrage | `frontend/src/features/auth/AuthGate.tsx:27` |
| 11 | Diffuser `artwork:created` comme `artwork:deleted` — sinon le temps réel entre utilisateurs repose sur un refetch de 30 s | `backend/src/artwork/artwork.service.ts` |

### Étape 2 — Sécuriser 8 points pour ~1 h 15

| # | Action | Gain |
|:--:|---|:---:|
| 12 | Supprimer la parenthèse « backend local & uncommitted » du README (fausse, et elle invite à mettre 0) | **+2** |
| 13 | Écrire la justification du module de choix exigée par le sujet : pourquoi, quels défis techniques, quelle valeur, pourquoi Majeur | **+2** |
| 14 | Ajouter une surface « Amis » (onglet profil ou section chat) consommant `GET /friends` + `OnlineDot` | **+2** |
| 15 | Le `.toLowerCase()` de l'étape 1 débloque aussi le Majeur User Management | **+2** |

Ces quatre actions font passer de 10 à **18 points**, au-dessus des 14 requis.

### Étape 3 — Consolider (marge de sécurité)

| # | Action | Gain | Effort |
|:--:|---|:---:|:---:|
| 16 | Traduire `StatusPage.tsx` (~14 clés × 3 locales) | +1 | 15 min |
| 17 | Corriger backups/DR (étape 1 #7-9) + lier `/status` depuis le pied de page | +1 | 20 min |
| 18 | Barre de progression + suppression pour l'avatar | +1 | 30 min |
| 19 | `docs/BROWSER_SUPPORT.md` : matrice navigateurs × fonctionnalités + limitations connues | +1 | 45 min |
| 20 | Toast de succès sur les ~15 mutations qui n'en ont pas | +1 | 2 h |
| 21 | Emails de confirmation RGPD (nodemailer + service Mailpit dans compose) | +1 | 1–2 h |
| 22 | Filtres + tri + pagination atteignables pour la recherche | +1 | ½ j |

### Étape 4 — README (chapitre VI du sujet)

Le README est lui-même une exigence obligatoire. Les 12 points relevés :

1. Supprimer l'échafaudage mort (`:68-70`) et le `## Features List:` dupliqué (`:210`)
2. Supprimer la parenthèse fausse sur les permissions (`:218`)
3. Remplir ou retirer les 8 placeholders (`:50`, `:120-121`, `:129-131`, `:148-149`) ; retirer les lignes ELK et WAF (inexistants)
4. `:59` → `https://localhost:8443` (aujourd'hui `http://`, qui renvoie une erreur nginx) ; réécrire `:37-51` pour couvrir les **trois** `.env` avec les bonnes variables dans chacun
5. Écrire les contributions individuelles de nrakotom et srabeman (vides, `:256-257`) et ajouter un paragraphe « difficultés rencontrées » pour les quatre
6. Réécrire la section Modules : type, points, pourquoi, comment, responsable — et résoudre le double comptage des frameworks (`:214` vs `:226-227`)
7. Compléter la liste des fonctionnalités (notifications, RGPD, i18n, RTL, monitoring, backups, design system, upload, analytics) avec leur propriétaire
8. Compléter le schéma de base : `Conversation`, `ConversationParticipant`, `Message`, et les enums ; corriger `:180` (`USER/ADMIN` → `USER/ADMIN/GUEST`)
9. Étoffer Team Information et Project Management (branches, PR, issues, cadence)
10. Corriger le markdown : `- []` → `- [ ]`, remplacer les tabulations par des espaces
11. `:234` « Multilingue » → anglais (le sujet impose un README en anglais)
12. Promouvoir `README_DRAFT.md` ou le supprimer — il contient ses propres TODO

---

## 8. Angles morts de cet audit

**Analyse statique.** Docker Desktop n'a pas pu démarrer sur la machine d'audit (le
service exige des droits administrateur), donc **aucun verdict n'a été vérifié dans un
navigateur**. En particulier :

- Le critère « zéro erreur console » ne peut se trancher que DevTools ouvert, avec
  *Preserve log*, sur le parcours complet : profil neuf → accueil → connexion →
  publication → like → commentaire → chat entre deux navigateurs → admin →
  `/privacy` → `/terms` → EN/FR/AR → déconnexion.
- Le multi-utilisateur (propagation temps réel, absence de course) demande deux
  navigateurs côte à côte.
- Les critères « responsive » et « accessible » demandent un vrai redimensionnement et
  un lecteur d'écran.

**Fiabilité des verdicts.** Chaque constat a été produit par un agent puis contredit
par un second, chargé de le déclasser *ou* de le reclasser. 3 verdicts sur 49 ont été
renversés — dont un sur le `.mailmap`, dont l'auditeur ignorait qu'il venait d'être
commité. Les 46 autres reposent sur la lecture croisée de deux agents, pas sur une
inspection manuelle de chacun.

**Prérequis pour la soutenance**

- Docker 24+ / Compose 2.0+, Node 18+ **sur l'hôte** (le seed tourne hors conteneur)
- OpenSSL (utilisé par `make certs`, non listé dans les prérequis du README)
- Des identifiants Cloudinary réels dans `backend/.env` — avec les placeholders, la
  toile démarre **vide**
- Identifiants Google OAuth si la démo passe par la connexion Google
- `docs/CREDENTIALS.md` pour les comptes de démonstration
- Deux navigateurs pour la démo multi-utilisateur
- Révoquer le token GitHub en clair dans `.git/config` avant toute démo publique

---

_Audit généré par confrontation du code au sujet ft_transcendence v21.1._
_49 items jugés · 17 agents · 3 verdicts renversés par la contre-expertise._
