# Atlaas Frontend — Documentation

The source keeps only short labels + `TODO(backend)` markers; the *why* lives
here. These docs are the defence narrative — read them in this order.

1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** — the whole system: stack, the
   discovery canvas (refs + one rAF loop), the deterministic mock world, routing
   contexts, UI primitives, i18n/RTL, auth. Start here.
2. **[BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md)** — verification pass,
   cleanup rules, the seam contract, and the full endpoint inventory (what the
   NestJS backend has, must fix, must build, or should stay mocked). Read before
   wiring anything real.
3. **[ARTWORK_DETAIL_SPEC.md](./ARTWORK_DETAIL_SPEC.md)** — the artwork detail
   view: layout, fixed comments box, optimistic actions, backend seams.
4. **[PROFILE_SETTINGS_SPEC.md](./PROFILE_SETTINGS_SPEC.md)** — the Profile and
   Settings pages as built, with the decisions log.
5. **[UX_MICROINTERACTIONS_SPEC.md](./UX_MICROINTERACTIONS_SPEC.md)** — the P0–P4
   motion roadmap (what shipped, what was deferred, and the reduced-motion path).
6. **[LEGAL_CONTENT.md](./LEGAL_CONTENT.md)** — Privacy & Terms source text and
   the placeholder table (company details to fill before launch).

> Product & locked decisions: [`../Context.MD`](../Context.MD).
