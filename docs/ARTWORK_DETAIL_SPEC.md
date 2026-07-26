# Artwork Detail — Spec & Notes

The artwork detail view: one component rendered in two route contexts, a fixed-shape
loading frame, and optimistic like/save/follow/comment actions that all fail safely to
a shared retry toast. This documents the *why*; the code carries only short labels and
`TODO(backend)` markers.

> Files: `src/features/artworks/components/ArtworkDetail.tsx`,
> `src/pages/ArtworkPage.tsx`, `src/features/artworks/artwork.api.ts`,
> `src/features/artworks/artwork.types.ts`,
> `src/features/artworks/components/FollowButton.tsx`,
> `src/features/artworks/components/HeartBurst.tsx`, `src/components/ui/Modal.tsx`.

## 1. Two render contexts, one component

`ArtworkPage` (`src/pages/ArtworkPage.tsx`) is a single route (`/artwork/:id`) that
renders in two shapes, selected by `location.state.background` — the app-wide
modal-route pattern (see `ARCHITECTURE.md` §Routing & page contexts):

| Context | Trigger | Chrome | `onClose` |
|---|---|---|---|
| **Modal** | `background` present (opened from a card `<Link>`) | the router's `Modal` (size `xl`) supplies the overlay, white card, focus trap, `aria-labelledby` | `navigate(-1)` |
| **Standalone** | direct URL / refresh / share (no `background`) | the page brings its own `max-w-6xl` white card on a `bg-neutral-100` centered `<main>` | `undefined` (no overlay to dismiss) |

`ArtworkDetail` itself renders **content only** — it never knows which context it's in.
The single seam is the optional `onClose` prop: present → a close `X` button appears in
the header; absent → it's omitted. `ArtworkPage` passes `onClose` only when a
`background` exists, so the same subtree serves both the modal and the full page.

### `#artwork-title` is an invariant, not a detail

The modal frame sets `aria-labelledby="artwork-title"` (`Modal.tsx`, `labelledBy` wired
by the router), so **an element with that id must exist in every state** or the dialog
loses its accessible name. All three `ArtworkPage` branches honor this:

- **loading** → `ArtworkDetailSkeleton` renders `<h1 id="artwork-title" class="sr-only">`
  with `t('artwork.loading')`;
- **error / 404** → the not-found block's `<h1 id="artwork-title">`;
- **success** → the real title `<h1 id="artwork-title">` inside `ArtworkDetail`.

The query uses `retry: false` because a missing artwork is a deterministic 404, not a
transient failure worth retrying.

## 2. Fixed-height layout — opens then fills, never resizes

The shell is a fixed-height grid, shared verbatim by `ArtworkDetail` and
`ArtworkDetailSkeleton` (the `SHELL` constant):

```
grid h-[85svh] max-h-[85svh] grid-rows-[auto_1fr] overflow-hidden rounded-xl
md:h-[40rem] md:grid-cols-[1.15fr_1fr] md:grid-rows-1
```

Mobile fills the viewport (`85svh`, media on top); desktop is a stable two-column
`40rem` frame (media left, content right). The height is **fixed on purpose**: the
comment list lives in the only `1fr` scroll region (`min-h-0 flex-1 overflow-y-auto`),
so the frame's outer size is independent of comment count. Whether there are zero
comments or fifty, the modal is the same size.

The skeleton mirrors that exact shape at the same fixed height — media block, header
row, title/meta/tag lines, three action chips, four comment rows, composer bar — so the
modal **opens at its final size and fills in**, rather than popping open small and
resizing as data lands. The skeleton and the real view are shape-matched, not
approximate.

Both skeleton and real view use the same `SkeletonBlock` shimmer language as the canvas
`SkeletonCell` (neutral base + a sweeping highlight). The shimmer animates on the GPU
(`animate-shimmer`) and is **static under reduced motion** (`motion-reduce:animate-none`);
all skeleton blocks are `aria-hidden`. `CommentsSkeleton` reserves the same vertical
rhythm as real comment rows so the list doesn't jump on arrival.

## 3. The media block is a color, not an image (yet)

The left/top media panel is a solid `backgroundColor: artwork.color` with the category
label overlaid. `color` is the project-wide **temporary stand-in for the future
`imageUrl`** (see `artwork.types.ts` and `ARCHITECTURE.md`). When uploads exist, this is
one of the two paint sites to swap `color` → `<img>`.

> **TODO(backend):** serve the real asset and render `<img src={mediaUrl}>` here.
> Note the field is **`mediaUrl`**, never `imageUrl` — the persisted Prisma column is
> `mediaUrl` (see `ProfileArtwork.mediaUrl` in `artwork.types.ts`); `imageUrl` does not
> exist in the schema. The author avatar swaps `AuthorSummary.color` → `avatarUrl` the
> same way, and `ArtworkComment.hoursAgo` → a real `createdAt`.

## 4. Optimistic actions

Every mutating action is gated behind `useRequireAuth` (signed-out users get the login
modal, with the current page stashed as `background`). All four actions share one
failure convention: **roll the optimistic change back, then raise the shared toast with
a `t('artwork.retry')` action** that re-applies the change and re-fires the mutation.
The mock backend always succeeds unless `?failMutations` is in the URL (`src/lib/devFail.ts`),
which is what makes these rollback paths exercisable before a real backend can fail.

### 4.1 Like — optimistic + heart burst

`doLike(next)` flips `liked` immediately (`applyLike`) and fires `likeMutation`. On a
*like* (not an un-like) it bumps `likeBurst`, which remounts `HeartBurst` under a fresh
`key` to replay the one-shot Lottie burst over the icon. The `Heart` icon itself carries
the state: liked → `text-red-500` + `fill="currentColor"`.

Under `prefers-reduced-motion` the burst is a **no-op** (`HeartBurst` initializes `done`
from the media query and renders `null`); the persistent red heart is the reduced-motion
carrier of state, so no information is lost. The burst is wrapped in
`Suspense` (lazy `HeartBurst`, so `lottie-web` stays code-split out of the main bundle)
inside a `SilentBoundary` — an optional flourish must never take the app down. On failure
`applyLike(!next)` reverts and the toast (`t('toast.saveFailed')`) offers Retry.

### 4.2 Save — optimistic toggle

`doSave(next)` flips `saved` (icon fills), fires `saveMutation`; identical rollback +
retry-toast on error. No burst.

### 4.3 Follow (`FollowButton`)

Self-contained optimistic toggle for the author. **Follow** (filled, inviting) →
**Following** (outline, quiet) — the filled→outline swap is the signal; a brief
`animate-settle` bounce (reduced-motion-suppressed) confirms the tap. Hover/focus on
"Following" reveals "Unfollow" (two labels stacked in one grid cell so the swap never
shifts layout), making un-following deliberate. On error it rolls back and raises the
same shared toast + Retry.

### 4.4 Comment composer — optimistic insert, cache-backed, draft-restore on error

The comments list is a **separate** `useQuery` (`artworkKeys.comments(id)`) from the
detail query. That comments cache is the **single source of truth**: both the rendered
list *and* the count chip read `comments.length`, so an optimistic post can never make
them disagree. `postMutation` is a full TanStack optimistic mutation:

1. **`onMutate`** — cancel in-flight comment queries, snapshot `previous`, insert an
   optimistic row (`temp_<ts>` id, `selfAuthor()` stamp, `hoursAgo: 0`) at the head of
   the cache. `handlePost` clears the composer *before* firing so the input feels
   instant.
2. **`onError`** — restore `previous` (or filter the temp row out), then hand the draft
   back **only if the composer is currently empty** (`current.length > 0 ? current : content`),
   so a newer draft typed during the in-flight post isn't clobbered. Sets `postStatus =
   'failed'` and raises the shared toast with Retry (re-fires `postMutation.mutate`).
3. **`onSuccess`** — `invalidateQueries` to reconcile the temp row with the server's
   canonical row (real id + timestamp) and to restore anything a mid-load post
   interrupted — exactly the future backend path. Refocuses the composer.

Replies: the "Reply" button prepends `@handle ` to the draft (whole-token match so `@sam`
isn't treated as already present when `@samuel` is in the draft) and focuses the
composer — also `useRequireAuth`-gated. Enter posts; the Post button is disabled on an
empty draft and shows `loading` while the mutation is pending.

## 5. Counts are local-optimistic by design

Like/save/follow counts are **not** globally reconciled. The like chip shows
`artwork.likeCount + (liked ? 1 : 0)` — a purely local adjustment on top of the fetched
base. This is deliberate for the current mock: the mutation endpoints echo state but
don't return updated aggregate counts, so the local delta is the honest optimistic
value. It reconciles naturally on the **next detail fetch** (fresh `likeCount` from the
server). The comment count is the exception — it reads the live comments cache, so it's
always exact. This trade-off is documented rather than hidden: real per-artwork
aggregate counts arrive with the backend.

## 6. Backend seams

All reads/writes route through `artwork.api.ts` (and `user.api.ts` for follow); today
they resolve from the deterministic mock with artificial latency. Signatures and
`artworkKeys` stay identical when the backend lands — only the function bodies change.

| Action | Seam (`TODO(backend)`) | Shape |
|---|---|---|
| Load detail | `GET /artworks/:id → ArtworkDetail` (404 if unknown) | `retry: false` on the query |
| Load comments | `GET /artworks/:id/comments → ArtworkComment[]` (newest first) | separate query/cache |
| Post comment | `POST /artworks/:id/comments → ArtworkComment` | server owns `id` + `createdAt`; optimistic caller reconciles on the returned row |
| Like | `POST` / `DELETE /artworks/:id/like` (body `{ loggedUser }`) | optimistic caller; endpoint echoes state |
| Save | `POST` / `DELETE /artworks/:id/save` (body `{ loggedUser }`) | optimistic caller; endpoint echoes state |
| Follow | `POST` / `DELETE /users/:id/follow` (body `{ loggedUser }`) | `FollowButton`, optimistic |

Persisted shape (`ProfileArtwork`, `artwork.types.ts`): `mediaUrl?` (nullable Prisma
column), `tags: { name }[]`, and the Prisma `_count` include → `_count.likes` /
`_count.comments`. The author link is an `authorId` FK; the embedded `AuthorSummary` is a
subset of `User`. Comment posting passes the request's `AbortSignal` through once real.

## 7. Accessibility & motion

- **Modal a11y comes from `Modal.tsx`:** `role="dialog"` + `aria-modal`, focus moved
  into the panel on open, background scroll locked, Escape closes, Tab trapped, focus
  restored to the trigger on close. The detail view only has to keep `#artwork-title`
  present (§1).
- **Polite success, assertive failure — never both.** Comment success is announced via
  an `sr-only` `role="status" aria-live="polite"` node (`t('artwork.commentPosted')`);
  failure is announced by the toast (`role="alert"`), so the two never duplicate.
- **Action chips** are real `<button aria-pressed>` for like/save/share; the comment
  counter is a non-interactive `as="span"` (nothing to press). Icons are
  `aria-hidden`; the visible label carries meaning. Share copies the canonical
  `/artwork/:id` URL, tolerates a rejected clipboard (never throws), and flashes a
  transient `t('artwork.linkCopied')` hint.
- **Reduced motion** is respected everywhere: skeleton shimmer, chip transitions, close
  hover, follow settle-bounce, and the like burst all suppress under
  `prefers-reduced-motion`.
- **RTL** via logical properties (`ms-auto`, `end-0`, `start-0`) — no hardcoded
  left/right. **No hardcoded strings:** every label is `t('artwork.*')` /
  `t('category.*')` / `t('toast.saveFailed')`, mirrored across `en`/`fr`/`ar`.

## 8. Entrance animation — P4 attempted and abandoned

The detail opens with the `Modal`'s default entrance only: a 200ms
`scale-95 → scale-100` + `opacity-0 → opacity-100` (reduced-motion-suppressed), from
`Modal.tsx`. **P4 — a shared-element card→detail view-transition morph** (the clicked
card visually growing into the modal) was **attempted and removed**. It's intentionally
not present; the plain Modal entrance is the shipped behavior.
