# Modifications backend LOCALES (ne pas committer)

> ⚠️ **Ces changements `backend/` sont volontairement laissés non commités.**
> Ils servent uniquement à faire tourner l'app en local (le backend « réel »
> relève d'un·e autre membre / du ticket T1). Les fichiers `backend/` modifiés
> apparaissent en `M` dans `git status` : **ne pas les stager, ne pas les
> committer.** La partie frontend (Phase 3, cartes, dropdown…) est un vrai
> livrable et est commitée normalement.

Sommaire :
- [0. Prérequis infra](#0-prérequis-infra-pas-du-code)
- [1. Ticket T1 — identité par token JWT](#1-ticket-t1--identité-par-token-jwt)
- [2. Correctif abonnés/abonnements inversés](#2-correctif-abonnésabonnements-inversés)
- [3. Upload à un seul tag](#3-upload-à-un-seul-tag)
- [4. Auteur / tags / compteurs dans les réponses artwork](#4-auteur--tags--compteurs-dans-les-réponses-artwork)
- [5. Vérification runtime](#5-vérification-runtime)
- [6. Déployer / revenir en arrière](#6-déployer--revenir-en-arrière)

---

## 0. Prérequis infra (pas du code)

### 0.1 Migrations Prisma (base neuve)
Les migrations ne sont **pas** appliquées au démarrage (`backend/Dockerfile` a
`#npx prisma migrate deploy` commenté). Sur une base vide, l'auth renvoie 500.
Après `make start` (ou tout `make clean`/`fclean`/`restart` qui recrée le volume
Postgres) :
```bash
docker exec ft_pinterest_backend npx prisma migrate deploy
```

### 0.2 Cloudinary — recharger le conteneur
`backend/.env` contient de **vrais** credentials (`CLOUDINARY_CLOUD_NAME=i1i52wjs`).
`env_file` étant lu à la **création** du conteneur, un conteneur démarré avant
la mise à jour du `.env` garde l'ancienne valeur en mémoire → upload en 400.
Correctif : recréer le conteneur pour relire `backend/.env` :
```bash
docker compose up -d --force-recreate backend
```

---

## 1. Ticket T1 — identité par token JWT

**Contexte.** Le backend livré porte l'identité de l'utilisateur en dur (UUID
codés en dur) ou attend un champ `loggedUser` dans le corps de la requête. On
câble le JWT à la place : chaque route de mutation reçoit
`@UseGuards(JwtAuthGuard)` et lit l'utilisateur via `@Request() req` →
`req.user.id`. Le `JwtStrategy` (déjà présent) renvoie `{ id, username, role }`,
donc `req.user.id` est l'id en base. Un `RolesGuard` global existe déjà et
laisse passer les routes sans `@Roles()`, donc ajouter le guard par route est
sûr.

> Chaque fichier contenait déjà, en commentaire, la version « post-T1 »
> attendue. Les changements ci-dessous activent cette version.

### 1.1 `backend/src/likes/likes.controller.ts`

**AVANT** — UUID codé en dur :
```ts
import { Controller, Get, Post, Param, Delete, Body } from '@nestjs/common';
import { LikesService } from './likes.service';

@Controller('artworks')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post(':artworkId/like')
  create(@Param('artworkId') artworkId: string) {
    return this.likesService.like(artworkId, "37260a66-8b53-4980-846f-35e935bbe40e");
  }

  @Delete(':artworkId/like')
  remove(@Param('artworkId') artworkId: string) {
    return this.likesService.unlike(artworkId, "37260a66-8b53-4980-846f-35e935bbe40e");
  }
}
```

**APRÈS** — guard + `req.user.id` :
```ts
import { Controller, Post, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { LikesService } from './likes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('artworks')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':artworkId/like')
  create(@Param('artworkId') artworkId: string, @Request() req: { user: { id: string } }) {
    return this.likesService.like(artworkId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':artworkId/like')
  remove(@Param('artworkId') artworkId: string, @Request() req: { user: { id: string } }) {
    return this.likesService.unlike(artworkId, req.user.id);
  }
}
```

**Explication.** L'UUID `37260a66-…` était l'auteur du like pour *tout le monde*.
Désormais le like est attribué à l'utilisateur authentifié ; sans token → 401.

### 1.2 `backend/src/comment/comment.controller.ts`

**AVANT** — `loggedUser` lu dans le corps (y compris pour le GET, ce que le
frontend ne peut pas envoyer via axios) :
```ts
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('artworks')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post(':artworkId/comment')
  create(@Param('artworkId') artworkId: string, @Body() data: CreateCommentDto) {
    return this.commentService.comment(artworkId, data.loggedUser, data.comment);
  }

  @Delete(':artworkId/comment/:commentId')
  remove(@Param('artworkId') artworkId: string, @Param('commentId') commentId: string, @Body() data: CreateCommentDto) {
    return this.commentService.removeComment(artworkId, commentId, data.loggedUser);
  }

  @Get(':artworkId/comments')
  findAll(@Param('artworkId') artworkId: string, @Body() data: CreateCommentDto) {
    return this.commentService.findAll(artworkId, data.loggedUser);
  }
}
```

**APRÈS** — guard + `req.user.id`, plus de `@Body` sur DELETE/GET :
```ts
import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('artworks')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':artworkId/comment')
  create(@Param('artworkId') artworkId: string, @Body() data: CreateCommentDto, @Request() req: { user: { id: string } }) {
    return this.commentService.comment(artworkId, req.user.id, data.comment);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':artworkId/comment/:commentId')
  remove(@Param('artworkId') artworkId: string, @Param('commentId') commentId: string, @Request() req: { user: { id: string } }) {
    return this.commentService.removeComment(artworkId, commentId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':artworkId/comments')
  findAll(@Param('artworkId') artworkId: string, @Request() req: { user: { id: string } }) {
    return this.commentService.findAll(artworkId, req.user.id);
  }
}
```

**Explication.** Lire `loggedUser` dans le corps d'un **GET** était le bug qui
renvoyait 400 : axios n'envoie pas de corps sur un GET. On prend l'identité dans
le token, et on retire le `@Body` des routes qui n'en ont plus besoin.

### 1.3 `backend/src/follow/follow.controller.ts`

**AVANT** — `Body.loggedUser` (crash 500 si le corps est absent) :
```ts
@Post(':id/follow')
follow(@Param('id') id: string, @Body() Body) {
  return this.followService.follow(Body.loggedUser, id);
}

@Delete(':id/unfollow')
unfollow(@Param('id') id: string, @Body() Body) {
  return this.followService.unfollow(Body.loggedUser, id);
}
```

**APRÈS** — guard + `req.user.id` (les getters inchangés) :
```ts
import { Controller, Get, Post, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { FollowService } from './follow.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// ...
@UseGuards(JwtAuthGuard)
@Post(':id/follow')
follow(@Param('id') id: string, @Request() req: { user: { id: string } }) {
  return this.followService.follow(req.user.id, id);
}

@UseGuards(JwtAuthGuard)
@Delete(':id/unfollow')
unfollow(@Param('id') id: string, @Request() req: { user: { id: string } }) {
  return this.followService.unfollow(req.user.id, id);
}
```

### 1.4 `backend/src/artwork/artwork.controller.ts` — `DELETE :id`

**AVANT** — `userId` dans le corps :
```ts
@Delete(':id')
remove(@Param('id') id: string, @Body() data: { userId: string }) {
  return this.artworkService.remove(id, data.userId);
}
```

**APRÈS** — guard + `req.user.id` (+ import `UseGuards` et `JwtAuthGuard`) :
```ts
@UseGuards(JwtAuthGuard)
@Delete(':id')
remove(@Param('id') id: string, @Request() req: { user: { id: string } }) {
  return this.artworkService.remove(id, req.user.id);
}
```
> `POST /artworks/user/:id` (création) est **laissé tel quel** : l'auteur vient
> déjà du paramètre d'URL, pas besoin de T1.

### 1.5 `backend/src/users/users.controller.ts` — `PATCH :id` et `DELETE :id`

**AVANT** — UUID codé en dur `34131762-…` passé comme « utilisateur connecté » ;
le service exige `id === loggedUserId` → **403** pour tout le monde sauf ce UUID
fantôme :
```ts
@Patch(':id')
@UseInterceptors(FileInterceptor('avatar'))
update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @UploadedFile(/* ParseFilePipe */) file?: Express.Multer.File) {
  return this.usersService.update(id, updateUserDto, file, "34131762-f416-40a9-98fb-95725479dff3");
}

@Delete(':id')
removebyId(@Param('id') id: string) {
  return this.usersService.removeById(id, "34131762-f416-40a9-98fb-95725479dff3");
}
```

**APRÈS** — guard + `req.user.id` (imports `UseGuards`, `Request`, `JwtAuthGuard`
ajoutés) :
```ts
@UseGuards(JwtAuthGuard)
@Patch(':id')
@UseInterceptors(FileInterceptor('avatar'))
update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req: { user: { id: string } }, @UploadedFile(/* ParseFilePipe */) file?: Express.Multer.File) {
  return this.usersService.update(id, updateUserDto, file, req.user.id);
}

@UseGuards(JwtAuthGuard)
@Delete(':id')
removebyId(@Param('id') id: string, @Request() req: { user: { id: string } }) {
  return this.usersService.removeById(id, req.user.id);
}
```

**Explication.** C'est ce qui débloque l'enregistrement du profil/compte :
`id === req.user.id` autorise l'utilisateur à modifier **son** profil, et 403
pour celui d'autrui.

### 1.6 `backend/src/comment/dto/create-comment.dto.ts`

**AVANT** — `loggedUser` requis :
```ts
@IsString()
@IsNotEmpty()
loggedUser!: string;
```

**APRÈS** — `loggedUser` optionnel :
```ts
@IsString()
@IsOptional() // identité via le token maintenant ; gardé optionnel pour compat
loggedUser?: string;
```

**Explication.** Le frontend n'envoie plus que `{ comment }`. Avec
`forbidNonWhitelisted` + un `loggedUser` requis, ce corps serait rejeté (400).
Le rendre optionnel règle le problème sans casser d'anciens appels.

---

## 2. Correctif abonnés/abonnements inversés

**Fichier : `backend/src/follow/follow.service.ts`.** Bug préexistant, pas lié
à T1 mais nécessaire pour que le follow soit testable.

**Cause.** Les relations Prisma du modèle `User` sont nommées **à l'envers** :
`user.followers` (relation « Follower ») contient les lignes où l'utilisateur
EST le follower → les gens qu'il **suit** ; `user.following` contient les lignes
où il est suivi → ses **abonnés**. Les 4 getters renvoyaient donc le mauvais
sens (après un follow : `following/count`=0, `followers/count`=1).

**AVANT** :
```ts
async getFollowers(userId: string) {
  const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { followers: true } });
  if (!user) throw new NotFoundException('User not found');
  return user.followers;
}
async getFollowingcount(id: string) {
  const user = await this.prisma.user.findUnique({ where: { id }, include: { following: true } });
  if (!user) throw new NotFoundException('User not found');
  return user.following.length;
}
async getFollowerscount(id: string) {
  const user = await this.prisma.user.findUnique({ where: { id }, include: { followers: true } });
  if (!user) throw new NotFoundException('User not found');
  return user.followers.length;
}
async getFollowing(id: string) {
  const user = await this.prisma.user.findUnique({ where: { id }, include: { following: true } });
  if (!user) throw new NotFoundException('User not found');
  return user.following;
}
```

**APRÈS** — chaque `following` ⇄ `followers` intervertis :
```ts
async getFollowers(userId: string) {
  const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { following: true } });
  if (!user) throw new NotFoundException('User not found');
  return user.following;
}
async getFollowingcount(id: string) {
  const user = await this.prisma.user.findUnique({ where: { id }, include: { followers: true } });
  if (!user) throw new NotFoundException('User not found');
  return user.followers.length;
}
async getFollowerscount(id: string) {
  const user = await this.prisma.user.findUnique({ where: { id }, include: { following: true } });
  if (!user) throw new NotFoundException('User not found');
  return user.following.length;
}
async getFollowing(id: string) {
  const user = await this.prisma.user.findUnique({ where: { id }, include: { followers: true } });
  if (!user) throw new NotFoundException('User not found');
  return user.followers;
}
```

**Explication.** Sans ce correctif, `fetchIsFollowing` (frontend) lisait
`GET /users/:id/following` (= mes abonnés) au lieu de mes abonnements et
renvoyait toujours `false` ; les compteurs de profil étaient inversés.
Vérifié après correctif : ME suit TARGET → `ME/following` liste TARGET,
`ME/following/count`=1, `ME/followers/count`=0, `TARGET/followers/count`=1.

> Alternative plus « propre » : renommer les relations dans `schema.prisma` et
> migrer. Le correctif au niveau service évite une migration.

---

## 3. Upload à un seul tag

**Fichier : `backend/src/artwork/dto/create-artwork.dto.ts`.**

**Cause.** En multipart, un tableau se transmet en répétant la clé
(`tags=a&tags=b`). Avec **un seul** tag, `tags=solo` arrive comme une **chaîne**,
pas un tableau → `@IsArray()` renvoie 400.

**AVANT** :
```ts
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

// ...
	@IsArray()
	@ArrayNotEmpty()
	@IsString({ each: true })
	tags?: string[];
```

**APRÈS** — `@Transform` qui coerce un tag unique en tableau :
```ts
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { Transform } from "class-transformer";

// ...
	@Transform(({ value }) =>
		Array.isArray(value) ? value : value === undefined ? value : [value],
	)
	@IsArray()
	@ArrayNotEmpty()
	@IsString({ each: true })
	tags?: string[];
```

**Explication.** `@Transform` (class-transformer) s'exécute avant la validation
(le `ValidationPipe` global a `transform: true`). Un `'solo'` devient `['solo']`,
un tableau reste tel quel, `undefined` reste `undefined`. Vérifié : upload à 1
et à 2 tags → OK.

---

## 4. Auteur / tags / compteurs dans les réponses artwork

**Fichiers : `backend/src/artwork/artwork.service.ts` (`findOne`) et
`backend/src/search/search.service.ts` (`findArtwork`, `findTag`).**

**Cause.** Ces requêtes ne renvoyaient que les colonnes brutes de l'artwork,
sans la relation `author` → auteur affiché « unknown » sur les cartes et la
modale ; ni `tags` ni `_count`.

**AVANT** (`findOne`) :
```ts
async findOne(id: string) {
  let artwork = await this.prisma.artwork.findUnique({
    where: { id: id },
  });
  if (!artwork) {
    throw new NotFoundException('Artwork not found');
  }
  return artwork;
}
```

**APRÈS** (`findOne`) — même `include` que dans les deux requêtes de recherche :
```ts
async findOne(id: string) {
  let artwork = await this.prisma.artwork.findUnique({
    where: { id: id },
    include: {
      author: { select: { id: true, username: true, fullname: true } },
      tags: { select: { name: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });
  if (!artwork) {
    throw new NotFoundException('Artwork not found');
  }
  return artwork;
}
```

**AVANT** (`search.service` — `findArtwork` et `findTag`) : le `findMany`
enchaîne directement `where`, `skip`, `take`, `orderBy`, sans `include`.

**APRÈS** : ajout du même bloc `include` juste après le `where` dans **les deux**
méthodes :
```ts
const artworks = await this.prisma.artwork.findMany({
  where: { /* … inchangé … */ },
  include: {
    author: { select: { id: true, username: true, fullname: true } },
    tags: { select: { name: true } },
    _count: { select: { likes: true, comments: true } },
  },
  skip,
  take,
  orderBy: { createdAt: sort === 'recent' ? 'desc' : 'asc' },
});
```

**Explication.** Le `select` sur l'auteur (id/username/fullname) évite de
divulguer le hash du mot de passe. Résultat : vrai nom d'auteur, vrais tags,
vrais compteurs like/commentaire. Le frontend n'avait **aucun** changement à
faire (le mapper `toAuthorSummary` utilise déjà `author` s'il est présent).

---

## 5. Vérification runtime (curl)

| Test | Attendu | Obtenu |
|---|---|---|
| Mutation sans token (like/comment/follow/PATCH users) | 401 | ✅ |
| like → likes list → double-like → unlike | 201 / présent / 400 / 200 | ✅ |
| commentaire (post) + lecture + suppression | 201 / visible / 200 | ✅ |
| `PATCH /users/:id` (le sien / un autre) | 200 / 403 | ✅ |
| follow / unfollow + compteurs | 201 / 200 / sens correct | ✅ |
| upload œuvre (1 et 2 tags) + avatar | URL Cloudinary réelle | ✅ |
| `/search/artworks` renvoie `author`/`mediaUrl`/`_count` | oui | ✅ |

---

## 6. Déployer / revenir en arrière

**Déployer** (après toute modif dans `backend/`) :
```bash
docker compose up -d --build backend
# si la base vient d'être recréée :
docker exec ft_pinterest_backend npx prisma migrate deploy
```

**Tout annuler** (revenir au backend d'origine) :
```bash
git checkout -- backend/
docker compose up -d --build backend
```

> Les fichiers concernés : `likes/likes.controller.ts`,
> `comment/comment.controller.ts`, `comment/dto/create-comment.dto.ts`,
> `follow/follow.controller.ts`, `follow/follow.service.ts`,
> `artwork/artwork.controller.ts`, `artwork/artwork.service.ts`,
> `artwork/dto/create-artwork.dto.ts`, `users/users.controller.ts`,
> `search/search.service.ts`.

---

## 8. Module RGPD (mail + export + suppression)

Nouvelle dépendance : `nodemailer` + `@types/nodemailer` (ajoutées à
`backend/package.json`). Nouvelles variables `.env` : `SMTP_HOST`, `SMTP_PORT`,
`SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (user/pass vides → mode journalisation).

### src/mail/mail.service.ts + mail.module.ts — nouveau module mail
**Pourquoi** : notifier par e-mail les opérations RGPD (export, suppression).
**Changement** : `MailService` tolérant aux pannes — sans config SMTP il
journalise `[MAIL:noop]` au lieu d'envoyer ; avec Ethereal il logge une URL de
preview. Importé dans `app.module.ts` et `users.module.ts`.
**Vérifié** : au démarrage → `WARN [MailService] SMTP not configured — mails
will be logged only` ; `Found 0 errors`.

### src/users/users.service.ts — exportUserData()
**Pourquoi** : exigence RGPD « demander/exporter ses données » en format lisible.
**Changement** : `select` explicite (jamais `password` ni `avatarPublicId`) →
document JSON auto-descriptif (compte, artworks+tags, commentaires, likes,
abonnés/abonnements avec sens rétabli, compteurs). Envoie
`sendDataExportReady` après génération.
**Vérifié** : `GET /users/me/export` (token) → `format:atlaas-gdpr-export-v1`,
counts corrects ; **aucune clé `"password"`, aucun hash bcrypt** ; sans token →
401 ; log `[MAIL:noop] subject="Your data export is ready"`.

### src/users/users.controller.ts — GET /users/me/export
**Pourquoi** : exposer l'export, protégé par token.
**Changement** : route `@UseGuards(JwtAuthGuard) @Get('me/export')` placée
**avant** `@Get(':id')` (sinon « me » matché comme `:id`).
**Vérifié** : 401 sans token, 200 avec.

### src/users/users.service.ts — removeById() : correctif D2 + garde-fou + mail
**Pourquoi** : (1) faille D2 — l'autorisation testait le rôle de la **cible**,
donc n'importe quel USER pouvait supprimer un ADMIN ; (2) ne pas supprimer le
dernier admin ; (3) confirmer par e-mail.
**Changement** : charge l'**appelant** (`actor`) et teste `actor.role` ;
`adminCount <= 1` sur cible ADMIN → 403 ; capture `email`/`username` avant
`delete`, envoie `sendAccountDeleted` après succès.
**Vérifié** : USER B supprime USER A → **403** (avant : la faille l'autorisait) ;
A supprime son propre compte → 200 puis `GET /users/A` → 404 ; log
`[MAIL:noop] subject="Your account has been deleted"`.

---

## 9. Permissions avancées (3 rôles : USER / GUEST / ADMIN)

> **Décision utilisateur** : 3 rôles = ADMIN, USER, GUEST (au lieu du MODERATOR
> de la spec initiale). **GUEST = lecture seule** : navigue/voit, gère/exporte/
> supprime son propre compte, mais ne peut pas publier / liker / commenter /
> suivre. Nouveaux comptes = USER par défaut ; l'admin assigne les rôles.

### D1 — src/roles/roles.guard.ts + ordre des guards
**Pourquoi** : `RolesGuard` global lisait `req.user.role` ; sans JwtAuthGuard en
amont → `TypeError` → **500** sur les routes `@Roles()`.
**Changement** : (a) garde défensive `if (!user) return false;` ; (b) **retrait
du `RolesGuard` global** (`APP_GUARD` supprimé de `app.module.ts`) et application
explicite `@UseGuards(JwtAuthGuard, RolesGuard)` sur chaque route `@Roles` — ordre
déterministe : JwtAuthGuard peuple `req.user`, puis RolesGuard vérifie le rôle.
**Vérifié** : `GET /users` sans token → **401** (JwtAuthGuard d'abord), USER →
**403**, ADMIN → **200**.

### D2 — src/users/users.service.ts update() (faille de sécurité)
**Pourquoi** : la condition testait le rôle de la **cible** ; n'importe quel USER
pouvait éditer un ADMIN.
**Changement** : charge l'**appelant** (`actor`) et teste `actor.role`.
**Vérifié** : USER éditant un ADMIN → **403** (même correctif que removeById §8).

### D3 — src/auth/strategies/jwt.strategy.ts (rôle depuis la base)
**Pourquoi** : le rôle était figé dans le token ; une promotion/rétrogradation ne
prenait effet qu'à la reconnexion.
**Changement** : `validate()` async, injecte `PrismaService`, relit
`{ id, username, role }` en base ; compte supprimé + token valide → 401.
(`AuthModule` importe déjà `PrismaModule`.)
**Vérifié** : `/auth/me` renvoie le rôle courant issu de la base.

### B2 — Rôle GUEST : schéma + migration + enum + enforcement
- `prisma/schema.prisma` : `enum Role { USER GUEST ADMIN }`.
- Migration **additive non destructive** :
  `prisma/migrations/20260721202242_add_guest_role/` (créée par
  `prisma migrate dev`, **copiée sur l'hôte** via `docker cp` pour survivre aux
  rebuilds ; ne pas committer).
- `src/enums/role.enum.ts` : ajout de `guest = 'GUEST'`.
- **Enforcement lecture seule** : `@UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.user, Role.admin)` sur les écritures : `POST /artworks/user/:id`
  (création), `POST/DELETE like`, `POST/DELETE comment`, `POST follow /
  DELETE unfollow`. Lecture (`GET comments`) et gestion de son propre compte
  (`PATCH/DELETE /users/:id`, export) restent ouvertes au GUEST.
**Vérifié** : GUEST like/comment/follow → **403** ; GUEST lit les commentaires →
404 (pas 403) ; GUEST édite son profil / exporte → **200** ; USER like → passe le
contrôle de rôle.

### B3 — Endpoints d'administration
- `users.service.findAll` : plus de 404 sur base vide ; `select` (pas de
  `password`) + `_count` (artworks, comments) + `updatedAt`.
- `users.controller` : `GET /users` protégé `@Roles(Role.admin)`.
- `users.service.updateRoles(id, role, actorId)` : garde-fous — pas
  d'auto-rétrogradation, pas de suppression du dernier admin ; `select` de retour
  sans secret.
- `src/users/dto/update-roles.dto.ts` : `@IsEnum(Role)` (rôle hors enum → 400).
**Vérifié** : `GET /users` ADMIN → tableau **sans `password`**, USER → 403 ;
`PATCH roles` USER → 403, ADMIN set GUEST → 200, rôle invalide → 400,
auto-rétrogradation/dernier admin → 403.

### Promotion du premier administrateur (aucune UI, volontaire)
```bash
docker exec ft_pinterest_postgres psql -U postgres -d ft_pinterest \
  -c "UPDATE \"User\" SET role='ADMIN' WHERE username='<votre_username>';"
```

### Fichiers backend touchés (Phase B, non commités)
`roles/roles.guard.ts`, `app.module.ts`, `users/users.service.ts`,
`users/users.controller.ts`, `users/dto/update-roles.dto.ts`,
`auth/strategies/jwt.strategy.ts`, `enums/role.enum.ts`, `prisma/schema.prisma`,
`prisma/migrations/20260721202242_add_guest_role/`, `likes/likes.controller.ts`,
`comment/comment.controller.ts`, `follow/follow.controller.ts`,
`artwork/artwork.controller.ts`.

---

## 10. Récapitulatif RGPD + permissions avancées

### Nouveaux fichiers backend (non commités)
- `src/mail/mail.service.ts`, `src/mail/mail.module.ts`
- `src/users/dto/update-roles.dto.ts` (réécrit `@IsEnum`)
- `prisma/migrations/20260721202242_add_guest_role/`

### Nouvelles dépendances (backend/package.json)
- `nodemailer`, `@types/nodemailer`

### Nouvelles variables backend/.env
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
  (user/pass vides → mode journalisation `[MAIL:noop]`)

### Correctifs de sécurité inclus
- **D1** : `RolesGuard` renvoyait 500 sans `JwtAuthGuard` → désormais 401/403
  propre (garde `if (!user) return false` + `RolesGuard` retiré de l'`APP_GUARD`
  global, appliqué explicitement `@UseGuards(JwtAuthGuard, RolesGuard)`).
- **D2** : autorisation inversée dans `users.service` — testait le rôle de la
  cible, donc n'importe qui pouvait éditer/supprimer un ADMIN. Corrigé pour
  tester le rôle de l'appelant.
- **D3** : rôle lu en base à chaque requête (promotion/rétrogradation immédiate).

### Modèle de rôles (décision utilisateur : 3 rôles)
USER (défaut) · GUEST (lecture seule) · ADMIN. GUEST → **403** sur
publier/liker/commenter/suivre ; lecture, gestion de son compte et export RGPD
autorisés.

### Promotion du premier administrateur (aucune UI, volontaire)
```bash
docker exec ft_pinterest_postgres psql -U postgres -d ft_pinterest \
  -c "UPDATE \"User\" SET role='ADMIN' WHERE username='<votre_username>';"
```

### Contreparties frontend (elles, commitées)
- RGPD : section « Confidentialité » des Réglages (voir / télécharger / supprimer
  son compte) — commit `feat(gdpr): data export, download and account deletion`.
- Permissions : `useRole`/`RequireRole`, dashboard `/admin` (ADMIN), masquage
  des actions pour GUEST — commit `feat(admin): role-aware administration
  dashboard + GUEST read-only gating`.

### Rejouer l'intégralité (nouveau backend propre)
1. `git checkout -- backend/` puis appliquer tous les changements §1–§10.
2. `docker exec ft_pinterest_backend npm install nodemailer @types/nodemailer`
   (ou via package.json + rebuild).
3. `docker compose build backend && docker compose up -d backend`.
4. `docker exec ft_pinterest_backend npx prisma migrate deploy`.
5. Promouvoir un premier ADMIN (ci-dessus).
