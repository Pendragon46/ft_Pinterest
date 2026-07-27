# Profile & Settings — As Built

How the Profile (`src/pages/ProfilePage.tsx`) and Settings
(`src/pages/SettingsPage.tsx`) screens actually work today, and why. Both read and
write through one users "API" (`src/features/users/user.api.ts`) that resolves from
a deterministic mock now and swaps to NestJS/Prisma later with no UI change.

## Shared foundations

Both pages sit behind `AppHeader`, render standalone (not modal routes), and take
identity from a single input: `authUser?.id ?? 'dev-user'`. Everything keys off
that one id, so the current single-account version and a future `/profile/:username`
differ by an argument, not a rewrite. `user.api.ts` owns `userKeys` — the single
source of truth for the users cache keys — colocated with the fetchers so
invalidation can't drift. The mock adds 200 ms latency to every call so loading
states stay exercised; it always succeeds unless `?failMutations` is set
(`lib/devFail.ts` → `maybeFailMutation()`), which forces the write path to reject so
the error/rollback UX is testable now.

The `loggedUser` field on every mutation body is the **temporary auth seam** — the
current user's id, sent for the server to authorise against. The backend's global
`ValidationPipe` runs `forbidNonWhitelisted`, so bodies carry only DTO fields plus
`loggedUser`; the API layer strips anything unchanged before sending.

---

## Profile

### Header — fullname vs handle

The header shows avatar, name, handle, and optional bio. The `<h1>` is
`profile.fullname ?? \`@${profile.username}\`` — a display name when set, otherwise
the handle stands in as the title — and a separate muted `@username` line always
renders below it. Bio renders only when present. The avatar is `profile.avatarUrl`
(the mock seeds `DEFAULT_AVATAR`, a brand-gradient data-URI from `lib/avatar.ts`
that needs no network); its `alt` falls back fullname→username so it is never empty.

While the profile query is pending a bespoke `ProfileHeaderSkeleton` mirrors the
avatar + three text lines (never a spinner). The query runs `retry: false`, so a
miss is a hard 404: on error the header is replaced by `profile.loadError` + a Retry
button that refetches.

### Stats

Three inline stats — works, followers, following — each run through the shared
`useCompact()` formatter (`lib/useCompact.ts`), an `Intl.NumberFormat` compact
formatter locale-bound to `i18n.language` (`1300 → "1.3K"` / `"1,3 k"` / Arabic
digits). Sources differ on purpose:

| Stat | Source | Note |
|---|---|---|
| works | `worksQuery.data?.length ?? 0` | count of the loaded works array |
| followers | `fetchFollowerCount(id)` | dedicated query |
| following | `fetchFollowingCount(id)` | dedicated query |

Follower/following counts are their own queries (`TODO(backend): GET
/users/:id/followers/count` and `/following/count`, each `→ number`) rather than
fields on the profile, matching a backend that would expose them as separate count
endpoints. The per-card `_count` (below) is a different thing — Prisma's
relation-count include on each artwork.

### Works / Liked tabs — the two-level reveal

The tabs are a real ARIA tablist: `role="tablist"`, each button `role="tab"` with
roving `tabIndex` (only the selected tab is `0`), Arrow-Left/Right cycling that is
**RTL-aware** (`(key === 'ArrowRight') !== rtl`) and moves focus to the newly
selected tab. One shared `role="tabpanel"` is labelled by the active tab.

**a11y fix worth calling out:** `aria-controls` is set **only on the selected tab**
(`tab === entry.id ? \`profile-panel-${entry.id}\` : undefined`). There is a single
panel, keyed to the active tab, so the inactive tab would otherwise point at a panel
id that is never rendered — it no longer references a non-existent element.

The reveal is deliberately **two independent levels**:

1. **Container cross-fade (P2a).** The panel's inner `<div>` is `key={tab}` +
   `animate-reveal`. Keying by tab remounts the whole container on Works↔Liked, so
   the *container* fades in as a unit — the switch reads as one motion, not N
   staggered cards re-animating on every tab click.
2. **Per-card reveal wave (P2b).** On first paint of a grid, each
   `ProfileArtworkCard` gets `revealDelay={Math.min(280, index * 30)}` — a
   staggered wave that is **bounded**: `index * 30ms` capped at 280 ms, so a 12-card
   grid finishes quickly instead of the last cards trickling in a full second late.

Both respect reduced motion (`motion-reduce:animate-none`). The grid is a 2→3→4
column responsive grid (`GRID` constant). Loading shows 8
`ProfileArtworkCardSkeleton`s; error shows `profile.loadError` + Retry; empty shows
a compass emoji and a tab-specific message (`worksEmptyOwn` / `worksEmptyOther` /
`likedEmpty`).

### ProfileArtworkCard

`src/features/artworks/components/ProfileArtworkCard.tsx` — a backend-shaped artwork
in a **fixed `aspect-[4/3]`** tile (uniform heights, unlike the canvas masonry). It
opens the detail via the same modal-route pattern as the canvas `ArtworkCard`
(`<Link>` with `state={{ background: location }}`, `draggable={false}`).

- **Media:** `artwork.mediaUrl` when present (`<img loading="lazy">` with a subtle
  hover scale), otherwise a neutral grey `<span>` placeholder — never a broken
  image. `mediaUrl` is nullable in Prisma; the mock deliberately gives one liked
  work no image to exercise this branch.
- **Meta line:** `profile.likes` with the compact like count, then — only if it
  exists — `· #{tags[0].name}`. The first tag is **free user text, so it is NOT
  translated** (contrast the canvas categories, a translated i18n enum). The like
  count runs through `useCompact()` too.

A `ProfileArtworkCardSkeleton` (shimmer, `motion-reduce`-safe) fills the grid while
works load.

### Share hint & the follow seam

Share copies `${origin}/profile` to the clipboard and pops a transient
`artwork.linkCopied` hint (`role="status"`). The auto-dismiss timer is **ref-tracked**
(`shareTimerRef`), cleared before re-scheduling and cleared again on unmount
(`useEffect` cleanup), so a late timer can't call `setShareHint` after the page is
gone.

`isOwnProfile` is hard-coded `true` this version: the action slot shows **Edit
profile** (→ `/settings`). The `else` branch renders a **Follow** button and is
intentionally unreachable until real auth exists — wired now so enabling other
users' profiles later is trivial. The follow mutation seam already exists
(`setFollow` → `TODO(backend): POST/DELETE /users/:id/follow`, optimistic caller,
mock echoes the requested state).

---

## Settings

Two-section layout (`account` / `appearance`) with a left nav whose active item
carries `aria-current="page"`. Forms seed from the current identity in
`useAuthStore`.

### Account — Profile form

Avatar upload + display name + username + bio. The file input is hidden and
triggered by a "Change avatar" button (`accept` limited to jpg/png/webp). On pick, a
`FileReader` produces a **data-URI preview only** — no upload happens client-side;
the real save sends multipart. The `<img>` is **keyed on `avatarPreview`** so
swapping the src remounts it and it re-plays `animate-reveal` — the new avatar
cross-fades in rather than popping.

On submit: `validateUsername` runs first (returns the i18n key
`errors.usernameRequired` if blank — validators return **keys, not strings**, so
errors switch language live), and blocks the mutation on failure. Otherwise
`profileMutation` fires with the trimmed fields (empty display name / bio normalised
to `null`, matching nullable Prisma columns).

### Account — Email & password form

Email + new password + confirm. Validation: `validateEmail` (loose shape check, real
guarantee server-side), `validatePassword` **only if a password was typed** (mirrors
NestJS `@IsStrongPassword()`: ≥8 with lower+upper+digit+symbol), and a local
`settings.passwordMismatch` when confirm ≠ password. The mutation sends `email`
**only if it changed** and `password` only if set; on success it clears both password
fields (never held in the client cache).

### Optimistic mutations & the Save button

Both mutations, on success, call `login(updated)` to push the fresh identity into the
store immediately (header avatar/name update at once) and invalidate
`userKeys.profile(userId)` so the Profile page refetches. The mock profile is a
mutable record, so those edits survive the refetch.

The Save button is a **3-state control**: idle (`settings.save`) → saving
(`loading={mutation.isPending}`, keeps the label, sets `aria-busy`) → saved (a
`Check` icon + `settings.savedShort`). A visually-hidden `<p role="status">`
announces the longer `settings.saved` to screen readers on success (the icon is
`aria-hidden`).

**Two review fixes are load-bearing here:**

- **savedShort timers are ref-tracked** (`profileSavedTimer` / `accountSavedTimer`).
  Each is cleared **before** re-scheduling (an overlapping re-save doesn't leave a
  stale timer that flips "Saved" off mid-confirmation) **and** on unmount (one
  `useEffect` cleanup clears both).
- **Both mutations have an `onError`** that fires the shared error toast
  (`toast.saveFailed`) with a **Retry** action that re-runs `mutate()`. A failed save
  is no longer silent — it surfaces exactly the way like/save/follow failures do.
  Testable today via `?failMutations`.

### Appearance

Language only. After P4 removed the immersive-transitions toggle, this section is a
single row: a `settings.language` label + the shared `LanguageSwitcher`.

---

## Backend seams

Every read/write is a one-body swap; signatures and query keys are already final. All
carry `TODO(backend)` in `user.api.ts`.

| Function | Endpoint | Shape |
|---|---|---|
| `fetchProfile` | `GET /users/:id` | `→ User` (404 if unknown) |
| `fetchUserWorks` | `GET /users/:id/artworks` | `→ Artwork[]` (each with `_count`) |
| `fetchUserLiked` | `GET /users/:id/artworks/liked` | `→ Artwork[]` |
| `fetchFollowerCount` | `GET /users/:id/followers/count` | `→ number` |
| `fetchFollowingCount` | `GET /users/:id/following/count` | `→ number` |
| `updateProfile` | `PATCH /users/:id` | multipart if avatar changed (field `avatar`, ≤10 MB, jpg/png/webp), else JSON; body = changed profile fields + `loggedUser` |
| `updateAccount` | `PATCH /users/:id` | `{ email?, password? }` + `loggedUser`; password never stored client-side |
| `setFollow` | `POST` / `DELETE /users/:id/follow` | body `{ loggedUser }` |

After a successful `PATCH` the client invalidates `userKeys.profile(id)`. `User` is
the Prisma model minus `password` + timestamps; `loggedUser` disappears once
`GET /auth/me` lands (it deletes every `loggedUser` across the app).

---

## Decisions log

- **Identity is one input (`authUser?.id ?? 'dev-user'`), `isOwnProfile` hard-coded
  `true`.** The other-user profile and Follow button are pre-wired but unreachable,
  so enabling them later is an argument change, not a refactor.
- **Works count is `data.length`; follower/following are their own queries.** Mirrors
  a backend that lists works but exposes follow relations as count endpoints — not
  three fields on one profile payload.
- **Two-level reveal, split by concern.** Container keyed by tab → the *tab switch*
  cross-fades as a unit; per-card `revealDelay` → *first paint* waves in. Bounding
  the wave at `min(280, index*30)` stops long grids trickling for a second.
- **`aria-controls` only on the selected tab** — a single panel is rendered keyed to
  the active tab, so pointing the inactive tab at an unrendered id was an a11y bug.
- **All dismiss/confirmation timers are ref-tracked** (share hint, both savedShort):
  cleared before reschedule and on unmount, so no timer mutates state after the
  component is gone or clobbers an overlapping action.
- **Avatar `<img key={avatarPreview}>`** forces a remount so the new image replays
  `animate-reveal` — a deliberate cross-fade rather than a hard swap.
- **Avatar upload is preview-only (`FileReader` data-URI).** The multipart upload is a
  documented seam; nothing is persisted client-side.
- **Failed saves are never silent.** Both mutations' `onError` reuse the shared toast
  + Retry, matching the optimistic like/save/follow pattern; `?failMutations` makes
  the path testable before the API exists.
- **Validators return i18n keys, not strings**, so field errors re-translate live on
  language switch; the password rule mirrors NestJS `@IsStrongPassword()`.
- **First tag is not translated.** Tags are free user text; only the fixed category
  enum is an i18n key elsewhere.
- **Mutation bodies send only changed fields** (empty name/bio → `null`, email/password
  omitted if unchanged) because the backend DTO uses `forbidNonWhitelisted`.
