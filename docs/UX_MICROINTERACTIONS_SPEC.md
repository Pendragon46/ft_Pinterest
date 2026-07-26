# Atlaas Frontend — UX Micro-interactions & Motion Spec

The P0–P4 motion roadmap: what shipped, what was hardened in review, and the one
priority (P4) that was attempted and deliberately removed. Rationale, not a
line-by-line — the code carries short labels and `TODO(backend)` markers.

> Stack context: see [`./ARCHITECTURE.md`](./ARCHITECTURE.md). Product & locked
> decisions: [`../Context.MD`](../Context.MD).

## Ground rules (apply to every priority)

- **`prefers-reduced-motion` is a first-class degrade, not an afterthought.** Every
  animation collapses to its *instant end state* — never a jump-cut mid-motion, never
  a broken layout. The mechanism is uniform: `motion-reduce:animate-none` on the
  animated node (and `motion-reduce:transition-none` on colour/transform transitions).
  Because each keyframe's `to`/`100%` frame *is* the resting visual, removing the
  animation lands exactly where it would have finished.
- **No hardcoded strings.** Every user-facing label routes through
  `useTranslation('common')` + `t()`, mirrored across `en`/`fr`/`ar`. Toasts receive
  *already-translated* strings from the caller.
- **RTL via logical properties.** Motion that has a direction (toast corner, follow
  reveal) uses `inset-x`/`end`/`start`, so it mirrors with `<html dir>`.
- **Native Tailwind palette only**; TS strict; declarative `react-router`
  (`<BrowserRouter><Routes>`, *not* a data router) — this last point is load-bearing
  for P4.
- **No new dependencies were added for any of this.** Motion is CSS keyframes
  (`--animate-*` theme tokens in `src/index.css`) plus a handful of ref-tracked
  `setTimeout`s. The one exception — the like-burst Lottie — predates this roadmap and
  is code-split.

The motion vocabulary is three keyframes, declared once as `@theme` tokens in
`src/index.css` and reused everywhere:

| Token | Keyframe | Animates | Used by |
|---|---|---|---|
| `animate-shimmer` | `shimmer` | `transform` (GPU) | skeleton sweeps (loading) |
| `animate-reveal` | `reveal` | `opacity` + `filter: blur` | toasts, profile tab/grid, avatar swap |
| `animate-settle` | `settle` | `transform: scale` bounce | FollowButton confirm |

`reveal` animates only `opacity`/`filter` (never `transform`) on purpose: a card's
hover `scale` must not be pinned by the reveal animation's `both` fill mode.

---

## P0 — Optimistic feedback: the shared toast + rollback system

The core interaction contract: **mutating actions succeed instantly in the UI and
self-correct on failure.** The user never waits on a spinner for a like, and never
loses the ability to recover a failed write.

### The toast store (`src/lib/toast.store.ts`)

A tiny Zustand queue. Callers push `{ message, variant, action?, duration? }`; the
viewport (mounted once) renders them. Two behaviours were hardened in review because
the naive version could destroy the user's only recovery path:

**1. Actionable toasts are sticky by default.** A toast that carries an `action` (the
Retry affordance on a failed optimistic write) gets `ttl = 0` — no auto-dismiss timer.
The reasoning is explicit in the store: *the retry is the only way to recover a failed
write, so a timer must never remove it.* Non-actionable toasts (plain confirmations)
auto-dismiss after `DEFAULT_DURATION = 5000ms`. A caller can still override with an
explicit `duration`.

**2. The viewport pauses all timers on hover/focus.** A toast must never vanish
mid-read. `ToastViewport` wires `onMouseEnter`/`onFocus` → `pause()` and
`onMouseLeave`/`onBlur` → `resume()`. `pause()` clears every live timer; `resume()`
reschedules each surviving toast from its *full* lifetime. Restarting from full (rather
than tracking elapsed time) is a deliberate, safe over-generosity — the goal is simply
to not lose a toast while it's being read, not to be precise about the remaining
milliseconds. Timer bookkeeping (`lifetimes` + `timers` maps) lives *outside* React
state so pausing doesn't churn renders.

### The viewport (`src/components/ui/ToastViewport.tsx`)

- Fixed at the logical bottom-**end** corner (`inset-x-0 bottom-0`, `sm:items-end`), so
  it mirrors correctly in RTL.
- The container is `pointer-events-none` (drags pass through to the canvas beneath);
  only the pills re-enable pointer events.
- **A11y by variant:** error toasts are `role="alert"` + `aria-live="assertive"`
  (interrupt); everything else is `role="status"` + `aria-live="polite"` (wait for a
  gap). Each pill offers the optional Retry action plus an always-present dismiss `X`
  (`aria-label={t('actions.dismiss')}`).
- Pills enter with `animate-reveal` (fade, **no slide**) and are static under reduced
  motion (`motion-reduce:animate-none`).
- Mounted exactly once, inside `AppProviders` (`src/app/providers.tsx`), a sibling of
  the router — so any screen can fire a toast and there's a single stacking context.

### Optimistic mutations (like / save / follow / comment)

All four are TanStack `useMutation`s that share one concurrency-safe shape, visible in
`src/features/artworks/components/ArtworkDetail.tsx` and `FollowButton.tsx`:

1. **`onMutate` flips the UI immediately** and returns the **prior value as context**
   (`{ previous }`) — a snapshot, taken before the flip.
2. **`onError` rolls back to that exact snapshot** (`context?.previous ?? !next`) — not
   by inverting *this* call's `next`. This is what makes it concurrency-safe: if two
   opposite toggles interleave, each restores the true prior state instead of blindly
   negating, so there's no phantom burst and no stuck state. For like specifically, the
   snapshot also guarantees the celebratory heart burst never replays on an un-like
   rollback.
3. The error path raises a **sticky Retry toast** (`t('toast.saveFailed')` /
   `t('artwork.commentFailed')`, action `t('artwork.retry')`) whose `onClick` re-fires
   the same mutation.

**Comment posting** is the richest case: it writes optimistically straight into the
comments query cache (the single source of truth the list *and* the count chip both
read, so they can never disagree), rolls the temp row back on failure while handing the
draft back *only if the composer is still empty* (never clobbering a newer draft), and
`invalidateQueries` on success to reconcile the temp row with the server's canonical
id/timestamp.

**Counts are local-optimistic by design.** The like/save counts increment in the
component (`artwork.likeCount + (liked ? 1 : 0)`) and reconcile on the next detail
fetch — there's no server field to trust yet.

> `TODO(backend)`: wire the four mutation seams — like (`PUT /artworks/:id/like`),
> save (`PUT /artworks/:id/save`), follow (`PUT /users/:id/follow`), each
> `{ next: boolean }` → updated counts, and comment
> (`POST /artworks/:id/comments`, `{ content }` → `ArtworkComment`). Signatures and
> query keys stay identical; only the function bodies in the `*.api.ts` layer change.
> See [`./BACKEND_INTEGRATION.md`](./BACKEND_INTEGRATION.md) for the seam contract.

### Exercising rollback today: `?failMutations` (`src/lib/devFail.ts`)

The mock backend **always succeeds**. To prove the rollback + toast path works before a
real server can fail, `maybeFailMutation()` throws after the mock's artificial latency
whenever `?failMutations` is in the URL. Dev-only; every call site carries a
`TODO(backend)`; deleted in one pre-submission commit with the rest of the dev
scaffolding.

---

## P1 — FollowButton (`src/features/artworks/components/FollowButton.tsx`)

**The state swap *is* the signal.** Follow is a filled, inviting pill (`bg-neutral-900`
white text); Following is a quiet outline (white, bordered). Nothing else needs to shout
"it worked" — the button visibly became a different thing.

Reinforcements layered on top:

- **`animate-settle` bounce** on the flip to Following — a 0.18s `scale(1) → 1.06 → 1`
  damp that "seals" the tap. Fired via a 200ms ref-guarded `bounce` flag, and only on
  the flip *to* Following (never on un-follow). Static under reduced motion; the
  filled→outline swap alone still carries the state.
- **Hover/focus on Following reveals "Unfollow."** Two labels are stacked in one CSS
  grid cell (the cell reserves the wider label's width so the swap never shifts layout);
  `group-hover`/`group-focus-visible` toggles visibility. Making un-follow a deliberate,
  revealed action prevents an accidental single-click undo — and it's **keyboard
  reachable** (`group-focus-visible`, not hover-only).
- **Optimistic + snapshot rollback**, identical to the P0 pattern: flip in `onMutate`,
  restore `context?.previous` on error, sticky Retry toast.

---

## P2 — Profile reveals (`src/pages/ProfilePage.tsx` + `ProfileArtworkCard.tsx`)

Two coordinated reveals make the profile feel composed rather than dumped:

- **P2a — Tab-panel cross-fade.** The grid wrapper is `key={tab}`, so switching
  Works↔Liked remounts *the container* (not the N cards) and it cross-fades via
  `animate-reveal`. Keying the wrapper — not each card — keeps it one cheap animation.
- **P2b — Bounded grid reveal wave.** Each `ProfileArtworkCard` gets
  `animationDelay: min(280, index * 30)ms`, so cards ripple in in sequence. The `min`
  cap is the important part: without it a large grid would stagger for seconds; capping
  at 280ms keeps the wave crisp regardless of item count.

Both are `motion-reduce:animate-none` → the panel and every card appear instantly at
full opacity.

---

## P3 — Settings save states (`src/pages/SettingsPage.tsx`)

- **Three-state Save button.** Idle → `loading` (TanStack `isPending`, `aria-busy` via
  the Button primitive) → a transient **"Saved ✓"** (`Check` icon +
  `t('settings.savedShort')`) that auto-reverts after 2s. Both forms (profile, and
  email/password) share the pattern.
- **Ref-tracked confirmation timers.** Each form owns a `savedTimer` ref
  (`profileSavedTimer` / `accountSavedTimer`). A re-save clears the pending timer before
  arming a new one, and an unmount-cleanup effect clears both — so an overlapping save,
  or navigating away, can't fire `setState` on a dead component or clobber the flag.
- **Avatar cross-fade.** The preview `<img>` is `key={avatarPreview}` + `animate-reveal`,
  so picking a new file blur-fades the new avatar in rather than hard-swapping. (Mock:
  the file is read to a data URL for preview only; the real save is multipart.)
- **`onError` toast added in review.** A failed settings save originally failed
  *silently* — the missing case in the first pass. Both mutations now surface
  `t('toast.saveFailed')` with a Retry action, matching like/save/follow. The success
  path stays inline (the "Saved ✓" pill + an `sr-only` `role="status"` line); failure
  goes to the toast so it isn't announced twice.

> `TODO(backend)`: `PATCH /users/:id` — profile (multipart if avatar changed) and
> account (`{ email?, password? }`). Marked at both `mutationFn`s.

---

## P4 — Shared-element card→detail morph: ATTEMPTED, then ABANDONED

**Goal.** A Pinterest-style morph where a canvas card visually grows into the artwork
detail modal — the marquee micro-interaction. It was built against the native **View
Transitions API**, then **fully removed**. The detail now opens with the default `Modal`
entrance. Three independent blockers, any one of which alone would have justified
dropping it:

1. **The canvas cards live inside a `will-change: transform`, scaled compositor layer.**
   The discovery canvas paints all cards on a single plane the camera transforms
   imperatively each rAF frame (`will-change-transform` on the plane, per
   `src/features/artworks/canvas/ArtworkCanvas.tsx`). The View Transitions API snapshots
   an element's *rendered* box, but a card here has no stable, un-transformed box to
   snapshot — it's a sub-rect of a GPU layer under a live `scale(s)`. The captured
   "before" image was wrong at any zoom ≠ 1.
2. **The app uses a declarative router.** View-Transition integration in react-router
   (`unstable_viewTransition` on `Link`/`useNavigate`) is a **data-router** feature; our
   declarative `<BrowserRouter><Routes>` (a locked decision) has no such hook, and the
   data-router VT hooks throw when there's no data router in the tree. Wiring it would
   mean migrating the entire routing layer to satisfy one animation.
3. **It couldn't be visually validated.** Between (1) and (2), the morph never rendered
   a correct frame, so there was no way to confirm — let alone tune — it. Shipping an
   effect we can't see is worse than shipping the clean default.

**Decision.** Removed entirely — no dead flags, no half-wired VT calls. The card→detail
transition is the `Modal`'s standard entrance (focus-in, scroll-lock, scrim), which is
robust, accessible, and identical whether you arrive by click, direct URL, or refresh.
If a morph is ever revisited it belongs *after* a router decision and a canvas that can
expose a stable per-card box — likely via FLIP measured off the DOM rather than the
native API — not as a bolt-on.

---

## Status at a glance

| Priority | Interaction | State |
|---|---|---|
| P0 | Optimistic mutations + sticky/paused Retry toast | Shipped, hardened in review |
| P1 | FollowButton swap + settle + revealed Unfollow | Shipped |
| P2 | Profile tab cross-fade + bounded reveal wave | Shipped |
| P3 | Settings 3-state Save, avatar cross-fade, error toast | Shipped (error toast added in review) |
| P4 | Card→detail shared-element morph | Attempted, abandoned & removed |

Everything shipped degrades to its instant end state under `prefers-reduced-motion`,
localises through `t()`, and added zero dependencies.
