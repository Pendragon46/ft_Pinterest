# ft_transcendence — Project Overview

---

## What are we building?

A Pinterest-style web app with an **infinite canvas**. Instead of a scrolling feed,
content lives on a 2D map. Posts cluster by topic — navigate toward a region and
the content gets more specific. Users can also search, which filters the canvas to
show only matching posts.

---

## The three layers of the app

Every web application is split into three parts that talk to each other:

```
Browser (what users see)       → React + TypeScript     (frontend)
Server  (logic and rules)      → NestJS                 (backend)
Database (permanent storage)   → PostgreSQL via Prisma  (shared)
```

All three will eventually run inside **Docker** containers, started with one command.
During development we run them directly without Docker for speed.

---

## Project structure

```
ft_transcendence/
├── backend/
│   ├── src/
│   │   ├── user/           ← CRUD operations for users (done)
│   │   ├── auth/           ← authentication (in progress)
│   │   ├── app.module.ts   ← root of the NestJS app
│   │   └── main.ts         ← entry point, starts the server on port 3000
│   ├── prisma/
│   │   └── schema.prisma   ← database schema (tables and relationships)
│   ├── .env                ← secret config (never committed to git)
│   └── package.json        ← list of dependencies
├── frontend/
└── docker-compose.yml
```

---

## Key concepts

### CRUD
The four basic operations you can do on any data:
- **C**reate — add a new record (register a user)
- **R**ead — fetch a record (get a user's profile)
- **U**pdate — modify a record (change a username)
- **D**elete — remove a record (delete an account)

The user module already implements CRUD. Almost every feature in the app
is CRUD on some piece of data.

---

### API and endpoints
The frontend can't touch the database directly. It sends **HTTP requests**
to the backend, which processes them and returns data in **JSON** format.

Each URL the backend exposes is called an **endpoint**:
```
POST   /auth/register    ← create a new account
POST   /auth/login       ← log in and receive a token
GET    /users/:id        ← get a user's profile
PATCH  /users/:id        ← update a user's profile
DELETE /users/:id        ← delete a user
```

The four HTTP verbs map to CRUD:
| Verb   | Action |
|--------|--------|
| GET    | Read   |
| POST   | Create |
| PATCH  | Update |
| DELETE | Delete |

---

### NestJS module structure
Every feature in NestJS is organized into a **module** with three files:

```
feature/
├── feature.module.ts      ← wires everything together
├── feature.controller.ts  ← defines endpoints, handles requests
└── feature.service.ts     ← contains the actual logic
```

- **Controller** — the door. Receives requests, calls the service, returns responses.
- **Service** — the brain. Does the actual work (database queries, calculations, etc.).
- **Module** — the glue. Registers the controller and service so NestJS knows they exist.

---

### Prisma
Prisma sits between NestJS and PostgreSQL. Instead of writing raw SQL,
you write TypeScript. Prisma translates it.

```typescript
// Instead of: SELECT * FROM "User" WHERE email = 'alice@example.com'
const user = await prisma.user.findUnique({ where: { email: 'alice@example.com' } });
```

The database structure is defined in `prisma/schema.prisma`. Every time
you change that file, you run a migration to apply the changes to the database:
```bash
npx prisma migrate dev --name describe_your_change
```

---

### Authentication and JWT
Authentication answers: **is this person who they claim to be?**

Flow:
```
User sends email + password
        ↓
Backend checks password against stored hash
        ↓
If correct → backend generates a JWT token and sends it back
        ↓
Frontend stores the token and attaches it to every future request
        ↓
Backend verifies the token on every protected endpoint
```

A **JWT (JSON Web Token)** is a signed string the server generates on login.
It encodes the user's ID and an expiry time. Only the server can verify it.
It looks like this:
```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEyMyJ9.SflKxwRJSMeKKF2QT4fwpM
```

A **password hash** is what gets stored in the database instead of the real password.
You never store raw passwords. When a user logs in, you hash what they typed and
compare it to the stored hash.

---

## The database schema (summary)

| Table         | What it stores |
|---------------|----------------|
| User          | accounts, credentials, roles, settings |
| Artwork/Post  | user-created content with canvas coordinates |
| Tag           | keywords attached to posts |
| Post_Tag      | which tags belong to which post (junction table) |
| Canvas_Region | which area of the canvas each tag maps to |
| File          | uploaded images and their metadata |
| Comment       | user comments on posts |
| Follow        | who follows whom |
| Message       | direct messages between users |
| Notification  | in-app alerts for each user |

---

## Modules we are implementing (and their point values)

| Module | Type | Points |
|---|---|---|
| Framework frontend + backend | Major | 2 |
| Frontend framework only | Minor | 1 |
| Backend framework only | Minor | 1 |
| Real-time features (WebSockets) | Major | 2 |
| User interaction (chat, profiles, friends) | Major | 2 |
| Standard user management | Major | 2 |
| OAuth (Google login) | Minor | 1 |
| ORM (Prisma) | Minor | 1 |
| Notification system | Minor | 1 |
| Advanced search | Minor | 1 |
| File upload | Minor | 1 |
| Custom design system | Minor | 1 |
| Multiple languages (i18n) | Minor | 1 |
| Additional browser support | Minor | 1 |
| Public API | Major | 2 |
| RTL language support (Arabic) | Minor | 1 |
| Advanced permission system | Major | 2 |
| Two-factor authentication (2FA) | Minor | 1 |
| WAF/ModSecurity | Major | 2 |
| ELK stack (DevOps) | Major | 2 |
| Microservices | Major | 2 |
| GDPR compliance | Minor | 1 |

**Target: 14 points minimum. Currently aiming for ~29.**

---

## Running the project locally (without Docker)

### Backend
```bash
cd backend
npm install					#	install dependencies
npm audit					#	view detailed security report
npm audit fix				#	apply automatic fixes
npm audit fix --force		#	handle remaining or "unfixable" vulnerabilities
npm audit --production		# 	clear out the warnings and only
npx prisma migrate dev		#	apply database schema
npm run start:dev			#	start with hot reload on port 3000
```

### Useful backend commands
```bash
npx prisma migrate dev --name <name> # apply schema changes to the database
npx prisma generate                  # regenerate the Prisma client after schema changes
npx prisma studio                    # open a visual database browser at localhost:5555
```

---

## Current status

| Area | Status | Owner |
|------|--------|-------|
| Project setup | ✅ Done | team |
| Database schema | ✅ Done | team |
| User CRUD | ✅ Done | teammate |
| Authentication | 🔄 In progress | you |
| Everything else | ⏳ Not started | — |

---

## What to work on next (authentication)

Authentication is the next priority because almost every other feature
depends on knowing who the logged-in user is.

It needs to be built in this order:
1. Register endpoint — hash password, save user, return success
2. Login endpoint — verify password, return JWT token
3. JWT Guard — middleware that protects routes from unauthenticated requests
4. Google OAuth — allow login via Google account
5. 2FA — optional second verification step after login