# Journal d'intégration backend → frontend

Suivi d'exécution de la spec d'intégration ft_Pinterest. Une entrée par tâche.

## Préambule — écarts par rapport à la spec (constatés avant de démarrer)

### Porte de vérification : `tsc -b` au lieu de `tsc --noEmit`
La spec impose `npx tsc --noEmit` comme porte standard. Dans ce projet, le
`tsconfig.json` racine utilise `"files": []` + `references` (tsconfig.app.json /
tsconfig.node.json). Résultat : `npx tsc --noEmit` sur la racine ne vérifie
**aucun fichier** et sort toujours en 0 — c'est un no-op. La vraie vérification
de types est `tsc -b` (ce qu'utilisent `npm run build` et `npm run verify`).

**Décision** : la porte de type réellement appliquée est `npx tsc -b`, combinée
à `npx eslint src`. C'est le seul moyen d'attraper les erreurs ; suivre la spec
à la lettre laisserait passer du code cassé.

### Réinitialisation d'un état partiel cassé (session précédente)
Au démarrage, la branche `safety_net` portait des modifications non commitées
d'une session précédente qui **ne compilaient pas** (`tsc -b` → 9 erreurs) :
- `user.api.ts` : les mutations `updateProfile` / `updateAccount` / `setFollow`
  avaient été supprimées (la spec demande de les garder sur mocks jusqu'aux
  phases 3/4), cassant `SettingsPage.tsx` et `FollowButton.tsx` ;
- `search.api.ts` : édition partielle cassée (clés `works`/`tags` inexistantes
  dans `SuggestionGroups`, forme `Suggestion` erronée, appel à `layoutTile`
  absent).

**Décision (validée avec l'utilisateur)** : réinitialiser les fichiers modifiés
à HEAD, supprimer le `mappers.ts` orphelin, puis exécuter la spec proprement
depuis la tâche 0.1. Baseline propre confirmée : `tsc -b` = 0, `eslint src` = 0.

---

## Tâche 0.1 — Configuration
- Statut : terminé
- Fichiers modifiés : `frontend/.env` (corrigé de `http://localhost/api` →
  `/api`, conforme à la spec), `frontend/vite.config.ts` (ajout du proxy de dev
  `/api` → `http://localhost:3000`), `frontend/INTEGRATION_LOG.md` (créé)
- Vérification : `.env` bien ignoré par git (règle `.env` dans les deux
  `.gitignore`) ; `tsc -b` OK / `eslint src` OK
- Notes : l'`.env` hérité pointait vers `http://localhost/api` (port 80 absolu,
  qui bypasse le proxy Vite et ne correspond à aucun listener — nginx est sur
  8080/8443). Remis à `/api` (relatif) comme exigé : fonctionne en dev (proxy
  Vite) comme en prod (nginx même origine).

## Tâche 0.2 — Vérification du lien réseau
- Statut : **BLOQUÉ** (blocage serveur — R1 : ne pas toucher `backend/`)
- Fichiers modifiés : aucun
- Vérification :
  - `GET /api/health` → **OK** (`{"status":"ok","database":"online",...}`)
  - `POST /api/auth/register` et `POST /api/auth/login` → **500 Internal
    server error**
  - `GET /api/auth/me` → 401 (aucun token obtenu)
- Notes (cause racine identifiée dans les logs backend) :
  - Erreur Prisma `P2021 : The table public.User does not exist in the current
    database`. La base Postgres est connectée mais **vide** : aucune des 21
    migrations de `backend/prisma/migrations/` n'a été appliquée.
  - Origine : `backend/Dockerfile` ligne 20 `#npx prisma migrate deploy` est
    **commentée**, et le `CMD` lance seulement `start:dev`. Les migrations ne
    sont donc jamais déployées au démarrage du conteneur.
  - **Impact** : tous les endpoints data (`/users/*`, `/artworks/*`,
    `/search/*`, `/auth/*`) renvoient 500 tant que le schéma n'est pas déployé.
    Les portes runtime/curl et les recettes navigateur des tâches 1.2 → 5.3 ne
    peuvent pas passer. L'écriture du code frontend (portes tsc/eslint) reste,
    elle, possible.
  - **Correctif hors périmètre frontend** : appliquer les migrations, p.ex.
    `docker exec ft_pinterest_backend npx prisma migrate deploy` (action ops
    ponctuelle, ne modifie aucun fichier), ou décommenter la ligne du
    Dockerfile + `make restart` (modif backend — interdite par R1 côté agent).
  - **En attente de décision utilisateur** avant toute action sur la base.

### Résolution 0.2 (décision utilisateur : appliquer les migrations)
- Action ops ponctuelle : `docker exec ft_pinterest_backend npx prisma migrate
  deploy` → « All migrations have been successfully applied » (21 migrations).
  Aucun fichier `backend/` modifié.
- Re-vérification : `register` → `access_token` OK ; `/auth/me` → objet user
  **sans champ `password`** ; `UID = a4e2c613-352f-417c-8e76-1407785002e4`
  (= `$UID` pour la suite).
- **Statut 0.2 : terminé.**

### Sonde du ticket backend T1 (prérequis Phase 3) — NON LIVRÉ
Sondes sans/avec token :
- `POST /artworks/:id/like` (sans auth) → **404** (attendu 401 si T1) ⇒ pas de
  JwtAuthGuard, UUID codé en dur toujours en place.
- `POST /users/:id/follow` (sans auth) → **500** (`loggedUser` attendu en body).
- `GET /artworks/:id/comments` → **400** (lit toujours `loggedUser` en body de
  GET), avec ou sans token.

**Conclusion** : T1 n'est pas livré. Conformément au prérequis Phase 3 et à
l'Annexe C, la **Phase 3 est différée** (like/comment/follow restent sur mocks).
Ordre appliqué : 1.1 → 1.4, 2.1 → 2.3, 4.1 → 4.3, puis **arrêt en attente de
T1**. La Phase 5 (nettoyage) est également différée : elle retirerait des mocks
encore utilisés par les mutations de la Phase 3.
Demande T1 consignée le 2026-07-21.

## Tâche 1.1 — Couche de mapping
- Statut : terminé
- Fichiers modifiés : `frontend/src/lib/mappers.ts` (créé, version complète de
  la spec §1.1 : `ServerUser/Artwork/Comment/Like/Follow`, `colorFromId`,
  `mediaTypeFromUrl`, `hoursSince`, mappers, `realArtworkId`)
- Vérification : `tsc -b` OK / `eslint src` OK
- Notes : le brouillon hérité (réinitialisé) manquait `ServerLike`,
  `ServerFollow` et `realArtworkId` ; la version complète les inclut, requis
  par les phases 2/3. eslint ne signale pas les exports non encore importés.

## Tâche 1.2 — user.api.ts, lectures
- Statut : terminé
- Fichiers modifiés : `frontend/src/features/users/user.api.ts` (en-tête
  d'imports + 5 lectures branchées ; `userKeys` et les 3 mutations conservées
  sur mocks)
- Vérification : `tsc -b` OK / `eslint src` OK ; endpoints live :
  `GET /users/:id` 200, `/artworks` 200, `/artworks/liked` 200,
  `followers/count` → `0`, `following/count` → `0` (entiers nus).
- Notes / écarts :
  - **Écart assumé vs spec** : la spec conserve `getMockProfile` dans l'import
    (« encore utilisé par les mutations »). Ici les mutations utilisent
    `updateMockProfile`, pas `getMockProfile` : l'importer le laisserait
    inutilisé → échec eslint. `getMockProfile` **retiré** de l'import.
    `LATENCY_MS` + `delay` **conservés** (encore utilisés par les mutations).
  - **Observation backend (R1 — non corrigé)** : `GET /users/:id` **renvoie le
    hash du mot de passe**. `toUser` liste les champs exposés (pas de
    `password`), donc rien ne fuit côté frontend. À corriger côté backend.

## Tâche 1.3 — search.api.ts, suggestions
- Statut : terminé
- Fichiers modifiés : `frontend/src/features/search/search.api.ts` (imports +
  `fetchSuggestions` seul ; les 4 autres fetchers inchangés)
- Vérification : `tsc -b` OK / `eslint src` OK ; `GET /search?q=…` → forme
  `{ artworks, users, tags }` conforme ; `users` contient `itest`.
- Notes : `SuggestionGroups` = `{ disciplines, creators }` respecté ;
  disciplines locales + créateurs API ; repli local (requête vide / échec
  réseau). Même fuite `password` sur `/search` (users) — seuls
  `id/fullname/username` sont lus.

## Tâche 1.4 — Vérification de Phase 1
- Statut : terminé (portes automatisées)
- Fichiers modifiés : aucun
- Vérification : `npm run verify` → **exit 0** (tsc -b + eslint + check:i18n +
  vite build tous OK). Avertissements non bloquants : `eval` dans
  `node_modules/lottie-web` (dépendance, hors périmètre) ; chunk > 500 kB
  (informatif).
- Notes : les recettes navigateur (profil/onglets/recherche à l'écran) restent
  **à valider manuellement** — non exécutables en headless. Les vérifs API
  équivalentes ont été faites par curl (voir 1.2/1.3).

## Tâche 2.1 — Module de disposition des tuiles
- Statut : terminé
- Fichiers modifiés : `frontend/src/features/search/tile.layout.ts` (créé)
- Vérification : `tsc -b` OK / `eslint src` OK ; constantes importées de
  `canvas.constants.ts` (CELL/CARD/TILE) — non redéfinies.
- Notes : PRNG mulberry32 à graine `(tx,ty)` → disposition déterministe ;
  `pageForTile`, `layoutTile`, `ITEMS_PER_TILE` exportés.

## Tâche 2.2 — Tuiles alimentées par le serveur
- Statut : terminé
- Fichiers modifiés :
  - `artwork.api.ts` : `fetchTileArtworks` → `GET /search/artworks` + `layoutTile`
  - `search.api.ts` : `fetchNicheTile` → `GET /search/tags` (repli niche locale)
- Vérification : `tsc -b` OK / `eslint src` OK ; `GET /search/artworks` 200,
  `GET /search/tags?q=portrait` 200, `sort=bogus` → 400 (garde respectée).
- Notes / écarts :
  - **Écart vs spec** : le bloc d'imports « avancé » de la spec (2.2 A) liste
    `realArtworkId/toArtworkComment/toArtworkDetail/ServerComment` — non
    utilisés en 2.2. Ajoutés **au fur et à mesure** (2.3 pour detail ; les
    imports commentaires attendront la Phase 3) pour ne pas casser eslint.
  - Constantes de latence orphelines retirées (`TILE_LATENCY_MS` des deux
    fichiers) — sinon `no-unused-vars`.

## Tâche 2.3 — Détail d'un artwork
- Statut : terminé
- Fichiers modifiés : `artwork.api.ts` (`fetchArtworkDetail` → `GET
  /artworks/:id` via `realArtworkId` + `toArtworkDetail` ; imports
  `getCreatedDetail`/`generateDetail` retirés)
- Vérification : `tsc -b` OK / `eslint src` OK ; id inexistant → **404**
  structuré (`{message,error,statusCode}`) → devient `ApiError`, pas d'écran
  blanc.
- **Vérification données réelles** (Phase 2 de bout en bout) : 2 lignes
  `Artwork` insérées **directement en base** (via `psql`, car l'upload est
  bloqué — voir ci-dessous). `GET /artworks/seed-img-1` → objet réel mappé par
  `toArtworkDetail` (sans include : auteur=authorId, tags=[], counts=0) ;
  `GET /search/artworks` → 2 items → `layoutTile` ; l'URL `.mp4` détectée
  `video`. Path lecture canvas/détail prouvé sur formes Prisma réelles.
- Notes : recette navigateur (clic carte → modale) reste manuelle.

### BLOCAGE infra n°2 — Cloudinary en placeholder (impacte la Phase 4)
Un seed via `POST /artworks/user/:id` (upload, endpoint sans T1) renvoie
**400 « Failed to create artwork »**. Cause : `artwork.service.create` fait
`cloudinaryService.uploadImage(file)` dans un try/catch (un 4xx n'est pas
loggué en ERROR, d'où l'absence de trace). Diagnostic :
`CLOUDINARY_CLOUD_NAME = ft_pinterest_cloud_name` = **valeur placeholder**
(le vrai cloud est `i1i52wjs`, cf. l'avatar par défaut). Les credentials
Cloudinary du `backend/.env` sont factices. Conséquence :
- Le **code** frontend de la Phase 4 (createArtwork / avatar / delete) peut être
  écrit et passer les portes tsc/eslint/build.
- La **vérification runtime** de l'upload (fichier → URL Cloudinary) restera en
  échec tant que de vrais credentials Cloudinary ne seront pas fournis dans
  `backend/.env` (secrets appartenant à l'équipe — hors périmètre agent, R1).
Le seeding via Swagger suggéré par la spec emprunte le même chemin → aussi
bloqué. D'où le seed direct en base pour vérifier la lecture.

## Phase 4 — Upload (code écrit, portes vertes ; runtime bloqué côté backend)

### Tâche 4.1 — Support multipart et validation
- Statut : terminé
- Fichiers : `http.ts` (`multipartConfig`, Content-Type undefined pour laisser
  le navigateur poser le boundary) ; `upload.validation.ts` (créé) ;
  `locales/{en,fr,ar}/common.json` (`errors.fileTooLarge`, `errors.fileType`).
- Vérification : `tsc -b` + `eslint` OK ; `check:i18n` → 203 clés × 3 locales.
- Écart assumé : `validateUpload` renvoie `UploadErrorKey`
  (`'errors.fileTooLarge' | 'errors.fileType'`) plutôt que `string` — sinon
  `t(key)` ne type-check pas face aux ressources i18next strictes.

### Tâche 4.2 — Avatar et profil
- Statut : code terminé ; **runtime bloqué**
- Fichiers : `user.api.ts` (`updateProfile` multipart/JSON, `updateAccount`
  JSON ; `loggedUser` retiré ; import mock `updateMockProfile`/`ProfilePatch`
  supprimé — devenu inutile) ; `SettingsPage.tsx` (state `avatarFile`/
  `avatarError`, `validateUpload` sur sélection, affichage d'erreur, appels
  mutations sans `loggedUser`).
- Vérification portes : `tsc -b` + `eslint` OK.
- **BLOCAGE runtime n°3 (famille T1)** : `PATCH /users/:id` renvoie **403
  « not authorized to update this user »** même avec token. Cause :
  `users.controller.ts:56` passe un **UUID codé en dur**
  (`"34131762-…"`) comme `loggedUserId`, et le service exige
  `id === loggedUserId`. Donc PATCH /users n'est **pas** réellement
  indépendant de T1 (contrairement à la catégorisation §1 de la spec). Le
  code frontend est correct pour le contrat post-T1 ; il fonctionnera dès que
  le backend lira `req.user.id`.

### Tâche 4.3 — Création et suppression d'artwork
- Statut : code terminé ; **runtime bloqué**
- Fichiers : `artwork.api.ts` (`createArtwork(authorId, input)` multipart champ
  `art` ; `deleteArtwork(id)` ; import mock `addCreatedArtwork` + types
  `MediaType`/`ProfileArtwork` retirés) ; `CreatePage.tsx` (appel
  `createArtwork(userId, {...})`).
- Vérification portes : `npm run verify` → **exit 0** (tsc + eslint + i18n +
  build).
- Écart assumé : la spec demande d'appeler `validateUpload(file,'artwork')`
  dans `CreatePage`. Or `CreatePage` valide **déjà** le fichier via
  `validateFile` (artwork.validation) qui gate le bouton Publier. Ajouter
  `validateUpload` doublonnerait avec un autre espace de clés d'erreur
  (`create.errors.*` vs `errors.*`). `validateUpload` n'est donc utilisé que
  par l'avatar (4.2), où aucune validation n'existait. Choix documenté.
- **Runtime** :
  - `createArtwork` → `POST /artworks/user/:id` → **400** (Cloudinary
    placeholder — blocage n°2). Genuinement indépendant de T1 (auteur = param
    d'URL) mais bloqué par les credentials.
  - `deleteArtwork` → `DELETE /artworks/:id` (sans body, forme post-T1) →
    **500** pré-T1 (le contrôleur lit `data.userId` dans le body ; §1 le note
    mais la spec écrit la forme post-T1). Fonctionnera post-T1.

### Bilan des vérifications runtime
- **Vérifié de bout en bout** : toutes les **lectures** (Phases 1 & 2) — profil,
  œuvres, likées, compteurs, recherche, tuiles, détail — sur données réelles.
- **Non vérifiable dans cet environnement** : toutes les **mutations**
  (Phases 3 & 4) — bloquées par (a) identité codée en dur / `loggedUser` en
  body = ticket **T1** non livré, et (b) credentials **Cloudinary** factices.
  Le code correspondant est écrit pour le contrat cible et passe toutes les
  portes statiques.
