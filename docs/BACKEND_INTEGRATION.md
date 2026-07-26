# Consolidation & Backend Readiness — Spec

> One document to (A) verify the whole frontend, (B) clean and uniformise it,
> (C) grow the `docs/` folder, (D) lock the backend-integration ground rules,
> and (E) inventory **every endpoint the frontend needs** — those the NestJS
> backend (`ft_Pinterest`) already has, and those it still lacks.
>
> Companion to [`./ARCHITECTURE.md`](./ARCHITECTURE.md). Backend source of
> truth: the Prisma schema + controllers of `ft_Pinterest`.

---

## 0. Verified snapshot (facts, measured on this revision)

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ clean |
| `eslint src` | ✅ clean |
| `vite build` | ✅ builds (4.9s) — one non-blocking Rolldown hint: *direct `eval`* (§B.3) |
| i18n parity | ✅ **174 keys × en/fr/ar, identical sets** |
| Pages | ✅ all built — Home, Artwork, Login, Register, Profile (292), Settings (326), NotFound (87), Privacy/Terms (via shared `features/legal/LegalPage`) |
| Routes | ✅ `/settings` present; modal-route duplicates intentional |
| `User` type | ✅ realigned to Prisma (`fullname`, `roles`, optional `bio`) |
| Known fixes | ✅ easter-egg samples `ATLAAS_MARK_PATHS`; ✅ search `focus-within:scale-[1.02]` restored; ✅ crossroads `refocus()` before `enterNiche`; ✅ **Ctrl+K `preventScroll` applied** (§B.1) |
| New systems | Toast (`ToastViewport` + `lib/toast.store`, used by FollowButton & ArtworkDetail); `features/users` (api + mock); `lib/devFail.ts` (failure-path testing); `lib/http.ts` (single client) |
| `TODO(backend)` | ~30 markers, all following one convention: endpoint + shape named inline |

---

## A. Verification pass (run before every milestone / the defence)

Commands (from `frontend/`): `npx tsc --noEmit` · `npx eslint src` ·
`npx vite build` · i18n parity (script below) — all four must be silent/green.
One shortcut wires all four: **`npm run verify`**.
**Console must stay empty** at runtime (rejection criterion): load every route,
switch all three languages, open/close the artwork modal, run one full niche →
crossroads → neighbour cycle.

i18n parity script (`scripts/check-i18n.mjs`, wired as `npm run check:i18n`):
compares **leaf-key sets** of `en/fr/ar` `common.json` (descending into arrays so
a mismatched legal-section count also fails) and exits non-zero on any
difference. (The manual run today: 174/174/174, identical.)

Manual sweeps, once per milestone:
- **RTL**: full app in `ar` — logical properties only (`start/end`), no `left/right` leaks; modal, canvas overlays, settings forms.
- **Reduced motion**: OS setting on — no shimmer/burst/reveal/typewriter/camera animation; end states intact.
- **Keyboard**: canvas (arrows/±/Home/Ctrl+K), modal trap + Escape, tabs (Profile), settings nav, search combobox.
- **Contexts**: every modal-capable route also loads standalone (refresh on `/artwork/:id`, `/login`, `/register`).

## B. Cleanup & uniformisation

**B.1 — Apply the last known fix (Ctrl+K).** In `ArtworkCanvas`'s Ctrl+K
handler: `searchInputRef.current?.focus({ preventScroll: true })`, wrapped in a
`requestAnimationFrame` after `refocus()`. Root cause (diagnosed): focus's
native scroll-into-view fights the camera fly-home, leaving the bar off-screen.
**Applied.**

**B.2 — Dev-surface removal plan (do NOT delete yet).** `DevNav`, `DevUiPage` +
`/dev/ui` route, `useDevSignIn`, `lib/devFail.ts` are working tools while mocks
exist. Removal is **one commit, just before submission**, after real auth lands:
delete the four files, the route, and every `useDevSignIn`/`devFail` call site
(each already carries a `TODO(backend)`). Add this as a release-checklist item —
shipping them is a defence liability; deleting them early kills your tooling.

**B.3 — Identify the `eval` build hint.** Rolldown flags a direct `eval` in the
bundle. Confirmed **dependency-only** (`lottie-web`), not app code:
`grep -rn "eval(" src/` is empty. Noted here; ignore the hint.

**B.4 — Consistency passes (grep-audits, fix on sight).**
- `TODO(backend)` convention is uniform — keep it: *marker + endpoint + shape*,
  colocated with the seam it replaces. New seams must follow it.
- One compact-number helper (`lib/useCompact.ts`, `Intl.NumberFormat`,
  `notation:'compact'`) — Profile stats, card likes, detail counts share it; no
  literal "k"/"M".
- Query-key factories (`artworkKeys`, `userKeys`, `searchKeys`) stay colocated
  with their fetchers; **no string keys inline** in components
  (`grep -rn "queryKey: \['" src/features --include=*.tsx` → only factories).
- No hardcoded user-facing strings (`grep` for suspicious literals in tsx);
  user content (tags, bios, titles) stays untranslated.
- All interactive elements: visible `focus-visible` ring + `motion-reduce`
  variants (spot-check new Profile/Settings components).

## C. Documentation additions (docs/ folder)

The already-written specs, brought into the repo so the docs tell the whole story:

| Doc | Content |
|---|---|
| `docs/ARTWORK_DETAIL_SPEC.md` | detail layout, fixed comments box, seams |
| `docs/PROFILE_SETTINGS_SPEC.md` | the two pages as built + decisions log |
| `docs/UX_MICROINTERACTIONS_SPEC.md` | P0–P4 motion roadmap |
| `docs/LEGAL_CONTENT.md` | legal source text + placeholder table |
| `docs/BACKEND_INTEGRATION.md` | **this document** |
| `docs/README.md` | 10-line index: what each doc is, reading order |

`ARCHITECTURE.md` refreshed where reality moved on: easter-egg now samples the
real mark; toast system exists; `features/users` and `features/legal` exist;
Settings page exists; `lib/http.ts` is the single client. Keep the "document the
*why*" tone — these docs are your defence.

## D. Backend integration — ground rules (the seam contract)

1. **Bodies-only swap.** Every read/mutation goes through a `*.api.ts` fetcher
   keyed by a colocated factory. Wiring the backend = replacing function bodies;
   **signatures, query keys and component code do not change.**
2. **One HTTP client.** `lib/http.ts`: a single axios instance on
   `import.meta.env.VITE_API_URL` (already provisioned), JSON by default,
   one response-error normaliser (shape: `{ status, message, fieldErrors? }`)
   so forms map 409/400 to i18n keys in one place.
3. **Identity seam.** Until auth exists, the current user comes from
   `useAuthStore` and is sent as `loggedUser` in mutation bodies. When
   `GET /auth/me` + JWT land: axios auth header via interceptor, delete every
   `loggedUser` from bodies, replace `useDevSignIn` (B.2).
4. **DTO discipline.** Backend `ValidationPipe` is `forbidNonWhitelisted`:
   send **exactly** the DTO's fields — one extra key = 400. Mock payloads
   already mirror the minimal shapes; keep them byte-identical on swap.
5. **Field mapping (already encoded in mocks — do not regress).**
   `mediaUrl` (optional; never `imageUrl`) · counts via `_count.likes/.comments`
   · **no category server-side** (cards show `tags[0].name`) · `username` *is*
   the handle · `fullname` = display name · Like/Comment FK is `authorId`.
6. **Mutations = optimistic** (UX spec P0): `onMutate` applies, `onError` rolls
   back through the toast system, `onSettled` invalidates **only** the affected
   key. Keep `lib/devFail.ts` until every rollback path has been exercised.
7. **Uploads.** Avatar (and later artwork media): `multipart/form-data`, file
   field `avatar`, ≤10 MB, jpg/jpeg/png/webp — matches the Nest `ParseFilePipe`.

## E. Endpoint inventory — everything the frontend needs

Legend: **[wired-ready]** exists & callable as-is · **[fix-first]** exists but
backend must change it before wiring · **[missing]** must be built ·
**[product-call]** front-invented; decide mock-forever vs build.

### E.1 Exists — wire now

| Endpoint | Body | Front consumer |
|---|---|---|
| `GET /users/:id` | — | Profile header, Settings prefill |
| `GET /users/:id/artworks` | — | Profile Works (+ works count via length) |
| `GET /users/:id/artworks/liked` | — | Profile Liked |
| `GET /users/:id/followers/count` | — | Profile stats |
| `GET /users/:id/following/count` | — | Profile stats |
| `POST /users/:id/follow` | `{ loggedUser }` | FollowButton |
| `DELETE /users/:id/unfollow` | `{ loggedUser }` | FollowButton |
| `PATCH /users/:id` | multipart (`avatar`) or JSON + `loggedUser` | Settings (profile / email / password) |
| `GET /artworks/:id` | — | Artwork detail (verify includes: author, tags) |
| `POST /artworks/:artworkId/comment` | `{ comment, loggedUser }` | Detail composer |
| `POST /artworks` · `PATCH /artworks/:id` · `DELETE /artworks/:id` | per DTO | future create/edit flows (not in current UI) |

### E.2 Exists — backend must fix before wiring

| Endpoint | Problem | Required fix |
|---|---|---|
| `POST /artworks/:id/like` · `DELETE .../like` | user id **hard-coded** in controller | take identity from request (JWT later; interim: `{ loggedUser }` like follow) |
| `GET /artworks/:artworkId/comments` | DTO expects a **body on a GET** — HTTP clients drop GET bodies | remove body requirement (or move param to query) |
| `POST /users` (register) | password stored **unhashed**; DTO requires bio/avatar | bcrypt-hash; `@IsOptional()` on `bio`/`avatarUrl` (RegisterPage TODO notes this) |

### E.3 Missing — must be built server-side

| Endpoint | Purpose | Notes |
|---|---|---|
| `POST /auth/register` | create account, **hash password**, return `{ user, access_token }` | supersedes raw `POST /users` for signup |
| `POST /auth/login` | email+password → `{ user, access_token }` | LoginPage seam names it |
| `GET /auth/me` | token → current user | **highest priority**: unlocks identity everywhere, deletes every `loggedUser` body |
| `POST /auth/google` | Google OAuth code → session | "Continue with Google" buttons |
| `POST /auth/refresh` / `POST /auth/logout` | session lifecycle | per team's token strategy |
| `POST /artworks/:id/save` · `DELETE .../save` | the Saved toggle | **no `Save`/Bookmark model in Prisma at all** — needs model + endpoints (mirror `Like`) |
| `GET /artworks?page=&limit=` | global paginated feed | **no all-artworks endpoint exists** (only per-user); prerequisite for any real-data canvas; include author + `_count` |
| View count | detail shows `viewCount` | no `views` field/endpoint server-side — either add (`Artwork.views` + increment on GET) or drop from UI; decide, don't fake |

### E.4 Front-invented — product decision (mock stays until decided)

These power the spatial canvas & search; the backend was never designed for
them. Keeping them mocked is the *documented intent* (deterministic world);
building them is a deliberate product extension, not a wiring task.

| Endpoint (as named in seams) | Powers |
|---|---|
| `GET /artworks/map?tx=&ty=` | home canvas tiles |
| `GET /niche/:slug/map?tx=&ty=` | niche canvas tiles |
| `GET /niche/:slug/neighbours` | crossroads trio (needs tag-proximity) |
| `GET /search/suggest?q=` · `GET /search/resolve?q=` | autocomplete, term→niche |
| `GET /search/trending` | suggested tags under the bar |

**Wiring order** (dependency-driven): E.2 fixes → `auth` (E.3, `me` first) →
E.1 user/profile reads → likes/save/comments mutations (optimistic, P0) →
global feed if/when a real-data canvas is decided (E.4 stays mocked otherwise).

---

## Definition of done

- [ ] A-pass green (tsc, lint, build, i18n script, empty console) + manual
      sweeps (RTL, reduced-motion, keyboard, standalone contexts).
- [x] B.1 Ctrl+K `preventScroll` applied; B.3 `eval` source identified; B.4
      grep-audits clean; B.2 removal item on the release checklist (not done yet).
- [ ] `docs/` contains the six documents of §C + refreshed ARCHITECTURE.
- [x] `lib/http.ts` exists; every fetcher swaps to it without touching components.
- [ ] E.2 fixes requested from the backend teammate (tracked); E.3 auth contract
      agreed (`register/login/me/google`); Save model decision made; view-count
      decision made.
- [ ] Zero regressions on the five verified fixes of §0.
