_This project has been created as part of the 42 curriculum by trindran, cramaros, nrakotom, srabeman._

---

# Description

**Atlaas** is a real-world web application: a visual discovery and sharing platform for
creative work (photography, illustration, design…). Members publish **artworks**
(images and short videos), explore them on an interactive discovery canvas, and connect
around them: following creators, liking and commenting, and chatting in real time.

The goal was to build a complete, production-shaped social platform as a team: a secure
account system, real-time features, media handling, an admin back-office, monitoring, and
full internationalization, all containerized and reachable over HTTPS with a single command.

### Key features

- **Accounts & auth** — email/password sign-up & login (hashed + salted with bcrypt),
  Google OAuth 2.0, JWT sessions.
- **Profiles** — editable profile (name, bio, avatar with a default), public profiles,
  followers/following, real-time **online status**.
- **Artworks** — publish images and videos (Cloudinary), like, comment, tag; a discovery
  canvas as the home experience.
- **Social graph** — follow/unfollow, mutual-follow "friends".
- **Real-time chat** — 1:1 messaging between mutuals, typing indicators, presence, message
  history (Socket.IO).
- **Search** — search artworks and authors with tag suggestions, sorting and pagination.
- **Admin back-office** — user management (roles, delete), artwork moderation, analytics.
- **Internationalization** — English, French, Arabic, with full **RTL** support and a
  language switcher.
- **Privacy** — Privacy Policy & Terms pages; GDPR data export and account deletion.
- **Observability** — Prometheus metrics + Grafana dashboards + Alertmanager; automated
  backups and disaster-recovery scripts.

---

# Instructions

### Prerequisites

- **Docker** and **Docker Compose** (v2).
- **OpenSSL** (used by `make` to generate a local self-signed dev certificate).
- **Node.js** on the host (only used to run the demo **seed** script after start).
- A **Cloudinary** account and a **Google OAuth** client (for media upload and Google login).

### Environment setup

Credentials live in `.env` files that are **git-ignored**; `.env.example` files are provided.

```bash
cp .env.example .env                 # POSTGRES_*, GRAFANA_ADMIN_*
cp backend/.env.example backend/.env # DATABASE_URL, JWT_SECRET, CLOUDINARY_*, GOOGLE_*
cp frontend/.env.example frontend/.env
```

Then fill in the values:

- Root `.env`: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `GRAFANA_ADMIN_USER`,
  `GRAFANA_ADMIN_PASSWORD`.
- `backend/.env`: `DATABASE_URL`, `JWT_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
  `CLOUDINARY_API_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`.

### Run with Docker (recommended)

```bash
make start
```

`make start` generates the dev TLS cert, builds the images, starts the whole stack, waits
for the API to be ready, then seeds a demo network of accounts and artworks.

The application is served over HTTPS at **https://localhost:8443** and Grafana at
**https://localhost:8443/grafana**.

Useful targets:

| Command                                      | Description                                    |
| -------------------------------------------- | ---------------------------------------------- |
| `make start`                                 | Build, start the stack, and seed the demo data |
| `make stop`                                  | Stop the stack                                 |
| `make seed`                                  | (Re)seed demo accounts/artworks (idempotent)   |
| `make logs`                                  | Follow container logs                          |
| `make backup` / `make restore BACKUP_FILE=…` | Database backup / restore                      |
| `make clean-volumes` / `make fclean`         | Remove volumes / full cleanup                  |

> Demo account credentials are listed in [`docs/CREDENTIALS.md`](docs/CREDENTIALS.md)
> (two admin accounts + a network of users; all local accounts use `Atlaas!2026-<username>`).

---

# Resources

### Official documentation

- NestJS — https://docs.nestjs.com
- Prisma (ORM) — https://www.prisma.io/docs
- PostgreSQL — https://www.postgresql.org/docs
- React — https://react.dev
- Vite — https://vite.dev
- Tailwind CSS — https://tailwindcss.com/docs
- TanStack Query — https://tanstack.com/query
- Socket.IO — https://socket.io/docs
- Cloudinary — https://cloudinary.com/documentation
- Passport / Google OAuth 2.0 — https://www.passportjs.org
- react-i18next — https://react.i18next.com
- Prometheus & Grafana — https://prometheus.io/docs / https://grafana.com/docs
- NGINX (reverse proxy, TLS, WebSocket upgrade) — https://nginx.org/en/docs

### Video Tutorials

- **NestJS**: [Anson](https://youtu.be/uWZ_6pDbLpU), [Marius Espejo](https://www.youtube.com/watch?v=2n3xS89TJMI&list=PLlaDAvA2MhR2jb8zavu6I-w1BA878aHcB)
- **Prisma**: [Web Dev Simplified](https://www.youtube.com/watch?v=RebA5J-rlwg&t=3018s)
- **Socket.IO**: [Marius Espejo](https://youtu.be/atbdpX4CViM)
- **Cloudinary**: [Cloudinary](https://youtu.be/l7TUGdRN-f0)

### AI usage

AI tools were used during this project for the following tasks:

- **Project architecture**: helping design the database schema and module structure
- **Backend development**: guidance on NestJS authentication patterns, JWT implementation,
  and Prisma query structure
- **Debugging**: identifying errors in NestJS configuration and Prisma migrations
- **Documentation**: drafting the initial structure of this README

All AI-generated code and suggestions were reviewed, tested, and understood by the
team before being integrated into the project. No code was blindly copy-pasted.

---

# Team Information

| Login      | Name                                   | Role(s)                                    | Responsibilities                                                                                         |
| ---------- | -------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `cramaros` | Ckeven Ramaroson                       | Architect / Developer                      | Infrastructure, Deployment, Security, Monitoring.                                                        |
| `trindran` | Toky Nicky Rindranirina                | Technical Lead / Developer                 | Backend architecture, API, Database, Social features, User interactions, media upload.                   |
| `nrakotom` | Ny Hanta Yves Mathieu Rakotomalala     | Project Manager / Scrum Master / Developer | Authentication, Google Authentication, Guest Role.                                                       |
| `srabeman` | Sedra Ny Aina Barthelemy Rabemanantsoa | Product Owner / Developer / UX/UI Designer | User interface, Visual experience, Design system, Responsive design, frontend/backend integration, Chat. |

---

# Project Management

- **How the work was organized**:
  - srabeman, frontend
  - nrakotom, backend
  - trindran, backend
  - cramaros, devops

  Weekly meetings on Fridays morning.

- **Tools** — **GitHub Issues** was used to track and triage bugs/tasks.
- **Communication channels** — Whatsapp / Slack

---

# Technical Stack

### Frontend

- **React 19 + TypeScript**, bundled with **Vite**.
- **Tailwind CSS v4** for styling (custom design-system components under `src/components/ui`).
- **TanStack Query** (server state) and **Zustand** (UI/presence state).
- **react-i18next** (+ browser language detector) for i18n/RTL.
- **react-router-dom** for routing, **Socket.IO client** for real-time, **lucide-react**
  icons, **lottie-web** for animations.

### Backend

- **NestJS + TypeScript**.
- **Prisma** ORM over **PostgreSQL**.
- **JWT** auth (`@nestjs/jwt`, `passport-jwt`) + **Google OAuth 2.0** (`passport-google-oauth20`),
  passwords hashed with **bcrypt**.
- **Socket.IO gateway** (`@nestjs/websockets`) for presence and chat.
- **Cloudinary** for image/video storage; **Multer** for uploads.
- **class-validator / class-transformer** for DTO validation.
- **helmet** (security headers), **@nestjs/throttler** (rate limiting), **prom-client** (metrics).

### Database

- **PostgreSQL** — a relational database chosen for the app's strongly-relational data
  (users, artworks, likes, comments, follows, conversations) and for Prisma's first-class
  Postgres support, migrations, and constraints (unique keys, cascades).

### Infrastructure

- **Docker Compose** orchestrates the whole stack, launched with a single `make start`.
- **NGINX** reverse proxy terminating **HTTPS** (TLS) and proxying the API, the SPA, the
  Socket.IO upgrade, and Grafana.
- **Monitoring**: Prometheus, Grafana (dashboards + Alertmanager), node-exporter and
  postgres-exporter.
- **Backups**: a dedicated backup service with `backup` / `restore` / `disaster_recovery` /
  `health_check` scripts.

---

# Database Schema

PostgreSQL, managed by **Prisma**. Every primary key is a `String` UUID
(`@default(uuid())`); table carries `createdAt` (and, where noted, `updatedAt`).

### Tables and relationships

| Relationship               | Type                          | Via                                                |
| -------------------------- | ----------------------------- | -------------------------------------------------- |
| User → Artwork             | one-to-many                   | `Artwork.authorId`                                 |
| User → Comment             | one-to-many                   | `Comment.authorId`                                 |
| User → Like                | one-to-many                   | `Like.authorId`                                    |
| User ↔ User (follow)       | many-to-many (self, directed) | `Follow (followerId, followingId)`                 |
| Artwork → Like             | one-to-many                   | `Like.artworkId`                                   |
| Artwork → Comment          | one-to-many                   | `Comment.artworkId`                                |
| Artwork ↔ Tag              | many-to-many                  | implicit `Artwork.tags` / `Tag.artworks`           |
| User ↔ Conversation        | many-to-many                  | `ConversationParticipant (conversationId, userId)` |
| Conversation → Message     | one-to-many                   | `Message.conversationId`                           |
| User → Message (sender)    | one-to-many (optional)        | `Message.senderId`                                 |
| Artwork → Message (shared) | one-to-many (optional)        | `Message.artworkId` (`SetNull`)                    |

Deletes cascade (`onDelete: Cascade`) from a user/artwork to their dependent rows; a message's
shared artwork uses `SetNull`. Conversations left with no participant after a user is deleted
are cleaned up by the app.

### Key fields and data types

**User**
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `fullname` | String? | |
| `username` | String | unique |
| `email` | String | unique |
| `password` | String? | bcrypt hash; null for OAuth accounts |
| `provider` | enum `Provider` | `LOCAL` \| `GOOGLE` (default `LOCAL`) |
| `googleId` | String? | unique |
| `bio` | String? | |
| `avatarUrl` | String | default avatar URL |
| `avatarPublicId` | String? | Cloudinary public id |
| `role` | enum `Role` | `USER` \| `ADMIN` \| `GUEST` (default `USER`) |
| `createdAt` / `updatedAt` | DateTime | |

**Artwork** — indexes on `authorId`, `createdAt`
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `title` | String | |
| `description` | String? | |
| `mediaUrl` | String? | Cloudinary URL |
| `mediaPublicId` | String? | Cloudinary public id |
| `resourceType` | String? | `image` \| `video` |
| `authorId` | UUID | FK → User (Cascade) |
| `createdAt` / `updatedAt` | DateTime | |

**Like** — unique `(authorId, artworkId)`
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `authorId` | UUID | FK → User (Cascade) |
| `artworkId` | UUID | FK → Artwork (Cascade) |
| `createdAt` | DateTime | |

**Comment**
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `authorId` | UUID | FK → User (Cascade) |
| `artworkId` | UUID | FK → Artwork (Cascade) |
| `content` | String | |
| `createdAt` | DateTime | |

**Follow** — composite PK `(followerId, followingId)`
| Field | Type | Notes |
|---|---|---|
| `followerId` | UUID | FK → User (Cascade) |
| `followingId` | UUID | FK → User (Cascade) |
| `createdAt` | DateTime | |

**Tag** — index on `name`, many-to-many with Artwork
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | String | unique |
| `createdAt` / `updatedAt` | DateTime | |

**Conversation**
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `pairKey` | String | unique — canonical key of the participant pair |
| `createdAt` / `updatedAt` | DateTime | |

**ConversationParticipant** — composite PK `(conversationId, userId)`, index on `userId`
| Field | Type | Notes |
|---|---|---|
| `conversationId` | UUID | FK → Conversation (Cascade) |
| `userId` | UUID | FK → User (Cascade) |
| `lastReadAt` | DateTime? | read-marker for unread counts |

**Message** — index on `(conversationId, createdAt)`
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `conversationId` | UUID | FK → Conversation (Cascade) |
| `kind` | enum `MessageKind` | `USER` \| `SYSTEM` (default `USER`) |
| `senderId` | UUID? | FK → User (Cascade) |
| `content` | String? | text of a user message |
| `systemKey` | String? | i18n key for a system message |
| `artworkId` | UUID? | FK → Artwork (SetNull) — shared artwork |
| `createdAt` | DateTime | |

**Enums** — `Role` (`USER`, `ADMIN`, `GUEST`), `Provider` (`LOCAL`, `GOOGLE`),
`MessageKind` (`USER`, `SYSTEM`).

![Database Schema](diagram_prisma.png)

---

# Features List

| Feature                   | Description                                                             | Login              |
| ------------------------- | ----------------------------------------------------------------------- | ------------------ |
| Authentication            | Email/password (bcrypt) + Google OAuth 2.0, JWT sessions                | nrakotom           |
| User profiles             | Edit profile, avatar upload (+ default), bio, public profile pages      | trindran           |
| Follow system             | Follow/unfollow, followers/following counts, mutual "friends"           | trindran           |
| Online presence           | Real-time online status via Socket.IO                                   |                    |
| Artworks                  | Publish images/videos, edit, delete; likes and comments                 | trindran           |
| Discovery canvas          | Interactive home canvas to explore artworks                             |                    |
| Search                    | Search artworks & authors, tag suggestions, sort, pagination            | trindran           |
| Real-time chat            | 1:1 messaging between mutuals, typing indicators, history               |
| Admin back-office         | User CRUD, roles, artwork moderation, analytics dashboard               |
| Internationalization      | EN/FR/AR, full RTL, language switcher                                   |
| Privacy / GDPR            | Privacy Policy & Terms pages, data export, account deletion             |
| Monitoring                | Prometheus + Grafana dashboards + Alertmanager                          | cramaros           |
| Backups                   | Automated backup, restore, disaster-recovery, health checks             | cramaros           |
| Responsive design         | Fully responsive, mobile-first, cross-browser (Chrome, Firefox, Safari) |
| Role-based access control | `USER`, `ADMIN`, `GUEST`                                                | trindran, nrakotom |

---

# Modules

Point rule: **Major = 2 pts, Minor = 1 pt** (14 points required).

> _TODO (team): confirm the final list you claim and can demonstrate — only fully functional,
> demonstrable modules count. Add which member(s) implemented each. The table below lists the
> modules with clear evidence in the codebase; verify each against the subject's exact wording
> before claiming it._

| Category    | Module                                         | Type  | Pts | Notes / where                                 |
| ----------- | ---------------------------------------------- | :---: | :-: | --------------------------------------------- |
| Web         | Framework front **and** back (React + NestJS)  | Major |  2  | `frontend/`, `backend/`                       |
| Web         | Real-time features (WebSockets)                | Major |  2  | Socket.IO presence + chat                     |
| Web         | User interaction (chat + profiles + friends)   | Major |  2  | chat, profiles, follows                       |
| Web         | Use an ORM                                     | Minor |  1  | Prisma                                        |
| Web         | Advanced search (filters, sorting, pagination) | Minor |  1  | search module                                 |
| Web         | File upload & management                       | Minor |  1  | Cloudinary, images+videos, validation, delete |
| Web         | Custom design system (10+ components)          | Minor |  1  | `components/ui/*`                             |
| A11y & i18n | Multiple languages (≥3)                        | Minor |  1  | EN/FR/AR                                      |
| A11y & i18n | RTL support                                    | Minor |  1  | Arabic, layout mirroring                      |
| A11y & i18n | Additional browsers                            | Minor |  1  | Firefox support/fixes                         |
| User Mgmt   | Standard user management                       | Major |  2  | profile, avatar, friends, online status       |
| User Mgmt   | OAuth 2.0 remote auth                          | Minor |  1  | Google                                        |
| User Mgmt   | Advanced permissions (CRUD + roles)            | Major |  2  | admin panel, `RolesGuard`, `Role` enum        |
| DevOps      | Monitoring (Prometheus + Grafana)              | Major |  2  | services + exporters + dashboards + alerts    |
| DevOps      | Health check + backups + disaster recovery     | Minor |  1  | `scripts/*.sh`, backup service                |
| Data        | Advanced analytics dashboard (+ CSV export)    | Major |  2  | admin analytics                               |
| Data        | GDPR compliance                                | Minor |  1  | data export + account deletion                |

**Evidenced total (before selection): well above 14 points.**

// total points = 2+2+2+1+1+1+1+1+1+1+2+1+2+2+1+2+1 = 22

> Candidate/uncertain (verify against subject wording before claiming): complete WCAG 2.1 AA
> accessibility (Major), notification system (Minor), data import (Minor). A **Modules of
> choice** (e.g., the discovery canvas) may also be justified — add a full justification in
> this section if claimed.

---

# Individual Contributions

> _TODO (team) — required section. For each member provide a detailed breakdown of the
> features/modules/components they implemented, and challenges faced and how they were
> overcome. Be honest; every member must be able to explain their contributions._

- **srabeman** — TODO
- **nrakotom** :
  - Register, login, JWT-based auth
  - Global APP_GUARD applying JwtAuthGuard and RolesGuard to all routes
  - Public decorator to exempt specific routes from auth
  - Google OAuth
- **cramaros** :
  - Docker & Docker Compose infrastructure.
  - Frontend environment setup (React packages and dependencies).
  - Backend environment setup (NestJS packages and dependencies).
  - PostgreSQL and Prisma configuration.
  - Nginx reverse proxy with HTTPS.
  - Prometheus & Grafana monitoring stack.
  - Prometheus metrics collection and exporters.
  - Custom Grafana dashboards and alerting system.
  - Grafana security and access management.
  - Health check and service status monitoring.
  - Automated PostgreSQL backup, restore and disaster recovery system.
- **trindran** :
  - Prisma model for user, artwork, comment, like, follow, Tag
  - Implement basis user CRUD with the dto validation
  - Upload avatar, file and artwork with dto validation
  - follow, like, comment friendship system with dto validation
  - Role based access control for USER/ADMIN with dto validation
  - Search system with filters, sorting and pagination

---

# Known limitations & notes

- an error is shown in the console when user try to connect using Google Oauth in Brave browser. desactivate the shield to make it work.

- Google profile-picture avatars are loaded cross-origin (CORS) to stay compatible with
  Firefox's Opaque Response Blocking.
- The demo seed publishes 41/42 images of the `seed/trindran` gallery (one filename yields a
  title shorter than the 3-character minimum and is skipped).
- _TODO: add any other known limitations, license, and credits._
