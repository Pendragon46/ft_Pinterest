# Atlaas — Frontend Context & Decisions

> Handoff note for Claude Code / any dev picking up the frontend.
> This file captures decisions already made so we don't re-litigate them. Read it first.

## What the project is
**Atlaas** — a creative-inspiration social platform (Pinterest-like, aimed at designers/creatives sharing their work). This is the 42 **ft_transcendence** final project. Team of 2 touching code: **me = full frontend (React), teammate = backend + wiring backend↔frontend.**

Product vocabulary (matches the Prisma schema): a piece of content is a **work / artwork** (title, description, imageUrl, category like Portrait/Editorial/Typography/UX-UI). Works have **tags**, **likes**, **comments**, an **author**. Users **follow** each other. Roles: USER / ADMIN.

Tagline / product angle: *"Don't scroll inspiration. Navigate it."* — discovery is the point.

## Screens (6)
1. **Login** — split screen: brand panel (left, gradient + logo), form (right): email, password, "Sign in", Google OAuth, forgot-password link, link to register. *(real Figma design)*
2. **Home / Discovery** — an **infinite pannable 2D canvas** (pan in all 4 directions, works laid on an infinite plane, fixed centered search overlay, "Refocus" button to recenter). This is a **personal design choice**, NOT a subject module (earns 0 points). It's the hardest component — build it LAST. See risk note below.
3. **Artwork detail** — modal/overlay: work on the left, right panel with author + Follow, title, views, tags, like/comment/save/share, comments thread + input. *(AI-generated concept, inspiration only)*
4. **Profile** — header (avatar, name, @handle, bio, stats works/followers/following), tabs Works / Collections / Liked, grid of works. Has empty states (e.g. "No liked works yet"). *(AI concept)*
5. **Settings** — sidebar (Account / Appearance / Notifications / Privacy) + forms (profile, avatar, email/password). *(AI concept)*
6. **Privacy Policy + Terms of Service** — MANDATORY per subject, must be reachable (footer) and have real content, or the project is REJECTED. Not designed yet.

## Stack (already installed, versions in package.json)
- React 19 + TypeScript, **Vite** build
- **Tailwind CSS v4** — via `@tailwindcss/vite` plugin (NOT the old v3 `tailwind.config.js` + `@tailwind base/...` directives). Activated in CSS with a single line: `@import "tailwindcss";`
- react-router-dom v7, @tanstack/react-query v5 (server state), zustand v5 (client state), axios, framer-motion v12
- API base URL via `VITE_API_URL` (env), backend reached at `http://localhost/api` behind nginx

## Decisions already locked
- **Styling = Tailwind v4.** Chosen partly because RTL is nearly free via logical properties (use `ps-*`/`pe-*`/`ms-*`/`me-*`, NOT `pl/pr/ml/mr`).
- **i18n + RTL are IN** (confirmed modules). Therefore: **NO hardcoded user-facing text** — every string goes through translation keys from day one. 3 languages min, including one RTL (Arabic/Hebrew). Write CSS with logical properties throughout.
- **Architecture = feature-based (light version).** Reasoning: what changes together lives together, and it keeps me (frontend) and teammate (backend integration) from colliding in Git. Grow folders on demand — do NOT scaffold 15 empty folders upfront.
  Target shape (create only what a screen actually needs):
  ```
  src/
    app/         # router.tsx, providers.tsx (QueryClient etc.)
    pages/       # one screen per route (LoginPage, ProfilePage, ...)
    features/    # domain logic+UI: artworks/, auth/, comments/, likes/, follows/
                 #   each: components/ hooks/ api/ types.ts
    components/  # reusable, NO business logic
      ui/        # Button, Input, Avatar, Tag, Modal, EmptyState, Divider...
      layout/    # Header, PageLayout, Footer...
    hooks/       # generic hooks (useDebounce...)
    lib/         # axios instance + interceptors, react-query config
    types/       # shared types (mirror Prisma models)
  ```
  Key rule: if something knows about the domain (an artwork, an author) → `features/`. If it's generic (a Button works in any app) → `components/ui/`.
- **Alias `@` → `src`** configured in BOTH `vite.config.ts` (resolve.alias) AND `tsconfig.app.json` (baseUrl + paths). Both are required or `npm run build` (which runs `tsc -b`) breaks.
- **SSR = probably NOT** (would be a full re-architecture, and clashes with the client-side infinite canvas). Do not add SSR without a deliberate team decision.

## Subject hard constraints that hit the frontend
- Responsive across all devices (never desktop-only).
- Compatible with latest Chrome; **zero console errors/warnings** (this is a REJECTION criterion — matters a lot for the infinite canvas).
- All forms validated on BOTH frontend and backend.
- Privacy Policy + Terms of Service pages (see screen 6).
- Multi-user real-time (likes/comments should reflect live across connected users → WebSocket territory).

## Confirmed module plan
14 module points are decided and split with the teammate (list held by the team). Modules that fall out "for free" from what we're building anyway: Web major (front+back framework), User interaction (chat/profile/friends — core of Atlaas), custom Design System (≥10 reusable components), i18n + RTL, ORM (Prisma), Google OAuth (already in Login design). The infinite canvas is extra/for-prestige, not counted.

## ⚠️ Infinite canvas — risk note (read before building it)
- Earns 0 module points (personal design choice). It's the most expensive component.
- A badly-done pannable/virtualized canvas spams the console and lags → can trigger the zero-console-errors rejection. The impressive feature can become the failing feature.
- **Build a fallback**: a plain masonry grid (simple vertical scroll) that renders the same `ArtworkCard`. If the canvas eats too much time or breaks, swap the container, keep the cards. This is WHY `ArtworkCard` (feature) is kept separate from the container that lays it out.
- Sequence: build `ArtworkCard` + data + ui components first, drop them in a simple grid, THEN attempt the canvas.

## How we work (deadline: ~2 weeks)
- Claude builds reusable components (Button, Input, Card...) — commented, clean.
- I assemble the pages from those components (so I can defend every page at the 42 evaluation — required: I must be able to explain all my code).
- Teammate wires the backend behind the UI.

## Current setup state
Tailwind v4 installed + activated, Vite plugin wired, `@` alias in place, Vite demo boilerplate removed from App.tsx/index.css, App.css deleted. `npm run dev` shows "Atlaas" styled by Tailwind (confirmed working).

## Suggested first build order
1. Folder skeleton (only what's needed): `app/router.tsx`, `lib/axios.ts`, `components/ui/`.
2. Set up i18n (so no page is built with hardcoded strings).
3. Build `Button` + `Input` + `Divider` in `components/ui/`.
4. Assemble the **Login** page from them (start here — simplest real screen, establishes the pattern). Wire OAuth button as non-functional UI until backend is ready.
5. Router + a couple of routes.
6. Then Profile / Settings / Artwork, reusing components. Privacy/Terms as static pages + Footer.
7. Home infinite canvas LAST, with the grid fallback ready.