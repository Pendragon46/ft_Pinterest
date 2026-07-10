# Atlaas Frontend — Architecture & Notes

Rationale and mechanics that used to live as long comments in the code. Source
files keep only short labels + `TODO(backend)` markers; the "why" lives here.

> Product & locked decisions: see [`../Context.MD`](../Context.MD).

## Stack & layout

React 19 + TypeScript (strict) + Vite + Tailwind v4. State: Zustand (client),
TanStack Query (server/cache). Routing: react-router-dom (declarative
`<Routes>`). i18n: react-i18next. Icons: lucide-react. Animation: lottie-web
(self-hosted, code-split). Alias `@` → `src`.

```
src/
  app/          providers.tsx, router.tsx
  pages/        one screen per route
  features/     auth/, artworks/ (+ canvas/) — domain logic + UI
  components/   ui/ (design system), dev/ (throwaway tooling)
  lib/          axios, i18n
```

Conventions (enforced): **no hardcoded user-facing strings** (all via
`useTranslation('common')` + `t()`, keys mirrored across `en`/`fr`/`ar`);
**native Tailwind palette only** (no custom color tokens); TS strict, no `any`;
WCAG a11y; RTL via logical properties + `<html dir>` sync; zero console
errors/warnings.

## The discovery canvas (`features/artworks/canvas/`)

The infinite pannable map. Highest-risk component — a naive version lags and
spams the console, a rejection criterion — so the design is deliberate.

### Core decision: refs + one rAF loop, React renders nothing during a gesture

Continuous camera values (x/y/scale, layer opacities) live in **refs** and are
written straight to the DOM inside a single `requestAnimationFrame` loop
(`useCanvasCamera.ts`). React **state** (`CanvasView`) holds only what changes
the rendered tree: the window of visible tiles (integers) + two booleans
(`showEgg`, `isAway`). Those change a few times/second at most, so React work
stays negligible while the gesture runs at the display's refresh rate. The loop
self-schedules only while something moves and stops when idle.

### Screen ↔ world math

`screen = viewport/2 + (p − cam) × scale`, hence the plane transform
`translate3d(vw/2 − cam.x·s, vh/2 − cam.y·s, 0) scale(s)`, and the inverse used
for cursor-anchored zoom: `world = cam + (screen − viewport/2) / scale`.

### Virtualization & gestures

Only tiles intersecting the viewport (+ 1-tile margin) are mounted; `setView`
fires only when the integer window (or the booleans) changes. `MAX_TILES` caps
mounted tiles (degrades to empty, never freezes) — it can't trigger at current
thresholds; it protects future tweaks. Tiles are cached by TanStack Query with
`staleTime: Infinity` (the mock world is immutable); off-screen tiles are GC'd.

Cards are `<a>` on purpose, so a pan may start on one. Pointer capture is delayed
until the press is proven a pan (`> CLICK_SLOP_PX`); the click that follows a real
drag is swallowed in the capture phase so the pan doesn't open a card. The wheel
handler is **non-passive** because it must `preventDefault` or the browser zooms
the page. The canvas is keyboard-operable (arrows pan, +/− zoom, Home/0 recenter).

### Geometry knobs — `canvas.constants.ts`

Lengths are **world pixels** (1 world px = `scale` CSS px on screen).

| Constant | Meaning |
|---|---|
| `CELL_W/H` | grid pitch (one card slot) |
| `CARD_W/H` | card size, centered on the grid node; leftover = gutters |
| `HERO_ZONE` | card-free rectangle the hero sits in |
| `MAX_SCALE` | `1` = the mockup framing (can't zoom closer) |
| `CARDS_FADE_START`/`CARDS_MIN_SCALE` | cards cross-fade → brand mosaic on zoom-out |

**Hero/grid alignment.** Cards are centered on grid **nodes**
(`x = cx*CELL_W − CARD_W/2`), so cell `(0,0)` sits exactly on the world origin —
where the hero and camera-home live. The hero therefore occupies a real grid
slot and its left/right/up/down neighbours line up in the same row/column. (The
earlier centering-*inside*-the-cell put the origin on a 4-cell corner, so the
nearest cards were diagonal and the hero looked misaligned.)

**Tuning density.** The hero is sized ≈ one cell and `HERO_ZONE` clears exactly
the centre cell `(0,0)`. Current values: `CELL 540×360`, `CARD 460×300`,
`HERO_ZONE {−270,−180,540,360}`. Smaller cells = denser cards but the hero then
spans several cells; keep the hero ≈ one cell to preserve clean alignment.

### Easter-egg mosaic (`EasterEggLayer.tsx`)

On far zoom-out the scattered cards resolve into the Atlaas compass mark. Because
the card field is a uniform grid, the mosaic aligns to the same cells, so real
cards line up into the logo as they fade (cross-fade handled in the camera rAF
loop). `GRID_X` is derived to keep the mark visually square despite non-square
cells, and forced **even** so the mosaic straddles the origin like the card grid.
Geometry is computed once at module load into a fixed rect list — no per-frame
work; opacity is driven imperatively via `layerRef`. Uses React 19 ref-as-prop
(no `forwardRef`) and is `memo`'d (props never change once mounted).

## Artworks data (`features/artworks/artwork.*`)

**Deterministic mock world** — a stand-in for a future map API: every cell is a
**pure function** of its `(cx, cy)` (same input → same card, zero storage).
Product idea encoded in data: **direction = category** (each 45° compass sector
is one of 8 categories), **distance = saturation / "niche depth"**. `sectorAt`
adds `+0.5` to rotate the seams off the axes so each cardinal direction has one
clear owner. Detail/comment generators use xor'd seeds so their extra draws don't
perturb the card's own draw order. Cells intersecting the hero clearing yield
`null`.

**ID scheme:** ids encode the cell as `w_cx_cy`, so the detail view regenerates
from the id alone (no lookup, shareable URLs). The backend keeps opaque UUIDs;
only the mock relies on this.

**Two type layers (`artwork.types.ts`), on purpose:**
- `ArtworkSummary` / `ArtworkDetail` / `ArtworkComment` mirror the backend payload.
- `CanvasArtwork` adds world placement (`x/y/width/height`) — placement is **data**
  (it arrives with the artwork); the future backend owns the map layout too.
- `color` is a **temporary stand-in for `imageUrl`**. When uploads exist, swap
  `color` → `<img src={imageUrl}>` in the two paint sites (`ArtworkCard`,
  `ArtworkDetail`). Same pattern: `AuthorSummary.color` ↔ `avatarUrl`,
  `ArtworkComment.hoursAgo` ↔ `createdAt`.
- The 8 categories are a fixed enum **and** i18n keys (`category.*`), so they are
  translated — unlike free user content (titles, tags), which is not.

**API layer (`artwork.api.ts`):** the only UI read surface. When the backend
lands only the function bodies change (axios via `lib/axios` + TanStack
`AbortSignal`); signatures and query keys stay identical. `artworkKeys` is the
single source of truth for cache keys, colocated with the fetchers so
invalidation can't drift. Artificial latency keeps loading states exercised.

## Artwork components (`features/artworks/components/`)

- **`ArtworkCard` is layout-agnostic:** same component in the canvas (absolute
  world coords) and the grid fallback (`aspectRatio`), switched by `layout`.
  `draggable={false}` so a drag pans the map (the camera swallows the trailing
  click). Its `<Link>` stashes `state.background` for the modal-route pattern.
- **`ArtworkGrid` is the Context.MD risk-note fallback:** rendered instead of the
  canvas if the canvas gets too costly. It reads a fixed block of tiles through
  the *same* `artworkKeys.tile` keys, sharing one cache with the canvas.
- **`ArtworkDetail`:** all mutating actions (like/save/follow/comment/reply) are
  gated behind `useRequireAuth` (signed-out → login modal). Toggles are local
  state; counts are static until the backend exposes mutations.

## Loading, motion & reward interactions

**Tinted skeletons (`canvas/SkeletonCell.tsx`).** While a tile is fetching, its
card slots show a neutral shimmer placeholder — never a blank gap or a central
spinner (a spinner says "blocked, wait"; a skeleton says "coming, here's the
shape"). Positions are exact: `cellSlot` / `tileSlots` (exported from the mock)
reuse the *same* placement + hero-clearing logic as the cards, so skeletons land
precisely where cards will appear. The shimmer animates **`transform` only** (GPU;
`@keyframes shimmer` in `index.css`, exposed as `animate-shimmer`) and is static
under reduced motion. Neutral for now — **tinting** toward each card's dominant
colour needs the colour served as tile metadata *before* the data arrives
(future), and image blur-up / fade-in waits on real images.

**Micro-interactions** (all `motion-reduce`-aware):
- Canvas cursor: `cursor-grab` → `active:cursor-grabbing` (CSS `:active` covers the
  whole canvas while pressed — no JS/re-render).
- Search bar: `focus-within:scale-[1.02]` + shadow — confirms you've "entered" search.
- Suggested tags: `active:scale-95` tap feedback (matters on touch, where the finger
  hides the target).
- Card hover: subtle `scale` + `shadow` + `z-10` (kept light to avoid flicker across
  a dense grid), on top of the existing title reveal.

**Like heart (`components/HeartBurst.tsx` + `ui/SilentBoundary.tsx`).** A one-shot
Lottie burst plays over the like icon when you *like* (not un-like); the icon
itself turns red. Hard-won details:
- **lottie-web directly, not `lottie-react`** — the wrapper's default export
  resolved to an *object* under this bundler (`Element type is invalid` → white
  screen). lottie-web is vanilla JS: `loadAnimation` into a ref'd node, `destroy`
  on cleanup.
- **Code-split** via `React.lazy`, so `lottie-web` (~250 kB) stays out of the main
  bundle — home-canvas visitors never download it; it loads on the first like.
- **`structuredClone(animationData)` per play** — lottie-web mutates the data and
  the JSON import is a shared module singleton; without a fresh clone, React
  StrictMode's double-mount corrupts the second (real) render → nothing shows.
- **`SilentBoundary`** wraps it: an optional animation must never take the app down.
- No-op under `prefers-reduced-motion`; the persistent red heart carries the state.

**Empty search state (`components/SearchEmptyState.tsx`).** Ready but **dormant** —
no trigger until search actually filters the map (`TODO(backend)` in
`SearchOverlay`). Keeps the tone + re-offers trending tags instead of a cold
"No results".

## Routing & page contexts

Route components render in **two contexts** selected by `location.state.background`:
- **Modal** (`background` present): the router's `Modal` supplies the frame + white
  card + `aria-labelledby`; the page renders **content only**.
- **Standalone** (direct URL / refresh / share, no `background`): the page brings
  its own chrome — `AuthCard` for Login/Register, a `max-w-6xl` card for Artwork.

`onClose` does `navigate(-1)`; login↔register toggles use `replace` so they don't
stack history, preserving the original `background`. `ArtworkPage` always renders
`id="artwork-title"` (loading `sr-only`, error, success) so the modal's
`aria-labelledby` resolves; its query uses `retry: false` (a miss is a 404).
`HomePage` floating chrome uses `pointer-events-none` so drags pass through; each
island re-enables events for itself.

## UI primitives (`components/ui/`)

- **Button:** default `type="button"` — a bare button in a `<form>` submits it, so
  secondary/Google buttons would submit the auth form; submit buttons opt in.
  `loading` keeps the label visible + sets `aria-busy`.
- **Input:** `useId` → stable `label htmlFor` (no collisions if a form renders
  twice); `aria-describedby` → error or helper; serif label (Figma signature).
- **Modal:** named panel sizes (`md`/`wide`/`xl`) keep widths to a fixed set; the
  panel is only the frame (children bring padding, so they also render full-page).
  Focus into the dialog on open, scroll lock, restore focus on close, Escape
  closes, Tab trapped.
- **Spinner / Divider:** `aria-hidden` (caller owns the accessible state).
- **GoogleIcon:** the four fills are Google's official brand palette — literal, not
  theme tokens.
- **TextLink:** wraps react-router `Link` with the serif accent + canonical ring.
- **SilentBoundary:** a class error boundary that renders nothing if a child throws
  — wraps optional, non-critical UI (e.g. the like animation) so it can't crash the app.
- **Icons:** lucide-react everywhere (`Heart`, `Bookmark`, `Search`, `ChevronDown`…),
  sized/coloured via `className`. Exceptions kept as brand SVGs: the Atlaas `Logo`
  and the multi-colour `GoogleIcon`.

## i18n + RTL (`lib/i18n/`)

Bundled `locales/{en,fr,ar}/common.json`, consumed via `useTranslation('common')`
+ `t()`; `i18next.d.ts` type-checks keys at compile time. `syncHtmlLangDir`
mirrors the active language onto `<html lang/dir>` so logical properties flip for
RTL. `escapeValue: false` (React escapes); `useSuspense: false` (resources are
synchronous). Keys must exist in all three files or i18next warns.

## Auth (`features/auth/`)

`useAuthStore` (Zustand): `user: User | null`, network-free `login(user)` /
`logout()` — the real `POST /auth/login → User` wires in later without changing
the interface. `isAuthenticated` is derived (`selectIsAuthenticated`), never
stored. `useRequireAuth` runs an action if signed in, else opens the login modal
(stashing the current page as `background`). `User` = the Prisma model minus
`password` + timestamps. Validators (`auth.validation.ts`) return **i18n keys**
(so errors switch language live); the password rule mirrors NestJS
`@IsStrongPassword()` (≥8, lower+upper+digit+symbol); email is a loose shape check
(real guarantee is server-side).

**Dev sign-in stopgap (`useDevSignIn`):** with no backend yet, the login/register
forms (and the Google buttons) sign in a *mock* user and close the modal, so
auth-gated features (like, save, follow, comment) are testable and demoable. It's
the exact seam for the real API — swap the `signIn(...)` call sites for the
mutation and delete the hook.

## Temporary dev surfaces — remove before production

- `components/dev/DevNav.tsx` (auth-state simulators; currently not mounted).
- `pages/DevUiPage.tsx` + route `/dev/ui` (component showcase; hardcoded labels are
  a deliberate exception to the i18n rule).
- `features/auth/useDevSignIn.ts` + the `signIn(...)` call sites in Login/Register
  (mock login until the real auth API lands).

## Still TODO

- Real Privacy Policy + Terms content (pages exist as placeholders; mandatory).
- `Settings` screen; real `Profile`.
- Backend wiring at every `TODO(backend)` marker (auth login/register, artwork
  detail/comments, search, trending).
- Wire `SearchEmptyState` + skeleton **tinting** once search filters the map and
  real images land (blur-up / fade-in).
