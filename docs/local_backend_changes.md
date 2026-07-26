# Intégration — nouveau backend (origin/main) + RGPD/Permissions

Branche : `srabeman/integration` (merge de `origin/main` dans le travail frontend, puis
re‑port des modules RGPD & permissions **dans le pattern du nouveau backend**).

Contrairement aux itérations précédentes, **le backend est committé ici** (choix assumé :
adopter le backend d'équipe et intégrer proprement dessus). Les secrets restent gitignored
(`.env`, `seed-credentials.json`, `READMELOGIN.md`).

## Décision de modèle : « guest » = visiteur non connecté

Pas de rôle `GUEST`. Deux rôles réels : **USER**, **ADMIN**. Un visiteur anonyme :
- **lit** tout (routes `@Public`) ;
- ne peut **pas interagir** : les écritures exigent un token (JwtAuthGuard global → 401) ;
- côté UI, les boutons (like / follow / commenter / créer) **restent visibles** et un clic
  ouvre la **modale de login** (`useRequireAuth`) — pattern Pinterest.

## Ce que le nouveau backend avait déjà (rien à porter)

`JwtAuthGuard` global (`APP_GUARD`) + `@Public()` ; `jwt.strategy.validate()` recharge l'user
depuis la DB (rôle live) ; `RolesGuard` avec `if(!user) return false` ; `artwork.remove`
autorise déjà l'ADMIN.

## Modifications backend (vs origin/main)

| Fichier | Changement | Pourquoi |
|---|---|---|
| `auth/auth.controller.ts` | `@Public()` **par route** (register/login/google) au lieu de la **classe** ; `GET /auth/me` protégé par le guard global | **Bug origin/main** : le `@Public()` de classe court‑circuitait le guard de `me` → `req.user` undefined → 500. Cassait tout le flux de session. |
| `users/users.controller.ts` | `GET /users` → `@Roles(admin)+RolesGuard` ; nouvelle route `GET me/export` (avant `:id`) ; `PATCH :id/roles` → `UpdateRolesDto` + `req.user.id` (actorId) | Liste réservée admin ; export RGPD ; gardes de rôle. |
| `users/users.service.ts` | `findAll` : + `fullname/updatedAt/_count{artworks,comments}`, plus de 404 sur liste vide ; `update` **fix D2** (vérifie le rôle de l'**acteur**, pas de la cible) ; `updateRoles(id,role,actorId)` : gardes auto‑rétrogradation + dernier‑admin ; `removeById` : garde dernier‑admin ; **nouveau** `exportUserData` (document `atlaas-gdpr-export-v1`, sans password) | RGPD + permissions avancées, sans e‑mail. |
| `artwork/artwork.service.ts` | `findOne` : `include { author, tags, _count }` | Cartes/détail affichent auteur réel + tags + compteurs. |
| `search/search.service.ts` | `findArtwork` + `findTag` : mêmes includes | Résultats de recherche complets. |
| `follow/follow.service.ts` | swap `followers⇄following` des 4 getters | Relations nommées à l'envers dans le schéma → compteurs/état de suivi corrects. |
| `artwork/dto/create-artwork.dto.ts` | `@Transform` tag unique → tableau | multipart envoie un tag seul comme string (échouait `@IsArray`). |
| `enums/role.enum.ts` | inchangé (`user`, `admin`) | Pas de rôle GUEST (modèle A). |

## Modifications frontend

- `features/auth/useRole.ts` : `AppRole = 'USER'|'ADMIN'` ; `canInteract = isAuthenticated`.
- `features/auth/auth.types.ts`, `lib/mappers.ts` : type rôle sans GUEST.
- `features/admin/roleBadge.ts` : `ROLE_BADGE`/`ROLE_LABEL_KEY`/`ALL_ROLES` sans GUEST.
- `features/admin/AdminStats.tsx` : carte « invités » retirée (3 cartes).
- `AppHeader`, `AuthButton`, `ArtworkDetail`, `FollowButton`, `CreatePage` : boutons like/follow/
  commenter/créer **toujours visibles**, action gardée par `useRequireAuth` (modale login si anonyme).

## Outillage seed (`seed-atlaas.mjs`)

- Publication : `POST /artworks` (auteur dérivé du token) au lieu de `POST /artworks/user/:id`.
- `fetchExistingTitles` : passe le token (le nouveau backend protège `GET /users/:id/artworks`)
  → le skip‑par‑titre re‑fonctionne (plus de doublons au re‑seed).

## Vérification

- `cd frontend && npm run verify` : tsc -b + eslint (0 err) + i18n (296 clés × en/fr/ar) + build.
- Backend : `docker compose up -d --build backend` (compile via `start:dev`), migrations au boot.
- DB propre : `docker compose down -v && docker compose up -d`, puis `node seed-atlaas.mjs` (96 œuvres),
  `UPDATE "User" SET role='ADMIN' WHERE username='lina_marchand';`.
- Matrice validée (26/26) : anonyme lit (200) / écrit (401) ; USER écrit (200), liste admin (403) ;
  ADMIN liste+shape, gardes auto‑rétrogradation & dernier‑admin, modère les œuvres ; RGPD export
  (sans password) ; shapes author/tags/_count ; `/api/metrics` (Prometheus) répond.
