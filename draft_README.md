*This project has been created as part of the 42 curriculum by cramaros, trindran, srabeman, nrakotom.*

---

# ft_transcendence — [Project Name]
> [do not forget, this has to be professional not casual] \
> [One sentence that describes the app.
Example: "An infinite canvas web app where users discover and share artwork organized by topic."]

---

# Description

### What is this project?

[2-3 sentences describing the app concept. What does a user see when they open it?
What can they do? What makes it different from a standard social app?]

### Key features

- Infinite canvas — content is displayed on a 2D navigable map, clustered by topic
- Tag-based positioning — posts are placed automatically based on their tags
- Search — filter the canvas by keyword to see only matching content
- User accounts — register, log in, manage your profile
- Social features — follow users, like and comment on posts
- Real-time chat — direct messaging between users
- [Add any other features your team implemented]


---


# Instructions

### Prerequisites

Make sure the following are installed on your machine:

| Tool | Version | Purpose |
|------|---------|---------|
| Docker | 24+ | Containerization |
| Docker Compose | 2.0+ | Multi-container orchestration |
| Node.js | 20 LTS | Backend runtime (dev only) |
| npm | 10+ | Package manager (dev only) |

### Environment setup

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Required variables in `.env`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/transcendence
JWT_SECRET=your_long_random_secret
JWT_EXPIRATION=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
# [add any other required variables]
```

### Run with Docker (recommended)

```bash
make start
```

The app will be available at `http://localhost:3000` (backend) and
`http://localhost:5173` (frontend, or whichever port is configured).

### Run locally without Docker (development)

**Backend:**
```bash
cd backend
npm install
npx prisma migrate dev
npm run start:dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Individual Contributions

### \<login1\> — Project Manager / Backend Developer
- [List specific features and modules you built]
- [Describe any technical challenges you faced and how you solved them]

### \<login2\> — [role]
- [List specific features and modules]
- [Challenges and solutions]

### \<login3\> — [role]
- [List specific features and modules]
- [Challenges and solutions]

### \<login4\> — [role]
- [List specific features and modules]
- [Challenges and solutions]

---

# Resources

### Documentation
- [NestJS official docs](https://docs.nestjs.com)
- [Prisma docs](https://www.prisma.io/docs)
- [React docs](https://react.dev)
- [PostgreSQL docs](https://www.postgresql.org/docs)
- [Docker docs](https://docs.docker.com)
- [Passport.js docs](https://www.passportjs.org)
- [JWT introduction](https://jwt.io/introduction)
- [Cloudinary docs](https://cloudinary.com/documentation)

### Articles and tutorials
- [NestJS authentication guide](https://docs.nestjs.com/security/authentication)
- [NestJS WebSockets guide](https://docs.nestjs.com/websockets/gateways)
- [Prisma with NestJS](https://docs.nestjs.com/recipes/prisma)
- [Add any other articles that helped your team]

### AI usage
AI tools (Claude by Anthropic) were used during this project for the following tasks:

- **Project architecture**: helping design the database schema and module structure
- **Backend development**: guidance on NestJS authentication patterns, JWT implementation,
  and Prisma query structure
- **Debugging**: identifying errors in NestJS configuration and Prisma migrations
- **Documentation**: drafting the initial structure of this README

All AI-generated code and suggestions were reviewed, tested, and understood by the
team before being integrated into the project. No code was blindly copy-pasted.

---

## Known Limitations

- [List anything that doesn't work perfectly or is incomplete]
- [Example: "The canvas positioning algorithm is a simplified version and may cluster
  posts unevenly for tags with very few entries"]

---

# Additional sections

## Team Information

| Login | Role(s) | Responsibilities |
|-------|---------|-----------------|
| \<login1\> | Project Manager / Backend Developer | [describe: auth, API, database, etc.] |
| \<login2\> | [role] | [responsibilities] |
| \<login3\> | [role] | [responsibilities] |
| \<login4\> | [role] | [responsibilities] |

---

## Project Management

### How we organized the work
[Describe how tasks were distributed. Example: "We held weekly meetings to sync on
progress and divided work by feature. Each feature had a designated owner responsible
for both implementation and testing."]

### Tools used
- **Version control**: Git + GitHub
- **Task tracking**: [GitHub Issues / Trello / Notion — fill in what you used]
- **Communication**: [Discord / Slack — fill in what you used]
- **Branch strategy**: feature branches merged into `dev`, then into `main` after review

---

## Technical Stack

### Frontend
- **Framework**: React + TypeScript
- **Styling**: [Tailwind CSS / Bootstrap / other — fill in]
- **Real-time**: WebSockets via [socket.io-client or native WebSocket]
- **Other libraries**: [list anything significant]

### Backend
- **Framework**: NestJS (Node.js + TypeScript)
- **Authentication**: JWT (JSON Web Tokens) + Passport.js
- **File storage**: Cloudinary
- **ORM**: Prisma
- **Real-time**: WebSockets via NestJS Gateway

### Database
- **System**: PostgreSQL
- **Why we chose it**: PostgreSQL is a robust, open-source relational database with
  strong support for complex queries and relationships, making it well-suited for a
  social platform with interconnected data (users, posts, tags, follows, etc.).

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **[Add if applicable]**: ELK Stack (Elasticsearch, Logstash, Kibana) for log management
- **[Add if applicable]**: WAF/ModSecurity for security

### Justification for major technical choices
- **NestJS over Express**: NestJS provides a structured, modular architecture that
  scales well for a team project. Its built-in support for TypeScript, dependency
  injection, and guards made implementing authentication and permissions straightforward.
- **Prisma over raw SQL**: Prisma generates a fully typed client from the schema,
  catching database errors at compile time rather than runtime.
- **Cloudinary for file storage**: Handles image upload, transformation, and delivery
  without requiring us to manage a file server manually.

---

## Database Schema

### Tables and relationships

| Table    | Description | Key relationships |
|----------|-------------|-------------------|
| User     | Stores account info, credentials, role, avatar | Has many Artworks, Comments, Likes, Follows |
| Artwork  | User-created posts with image and description | Belongs to User, has many Tags, Comments, Likes |
| Tag      | Keywords attached to artworks | Many-to-many with Artwork |
| Like     | A user liking an artwork | Belongs to User and Artwork |
| Comment  | A user commenting on an artwork | Belongs to User and Artwork |
| Follow   | Follow relationship between two users | References User twice (follower / following) |
| [Message]   | Direct messages between users | Belongs to sender and receiver (User) |
| [Notification] | In-app alerts | Belongs to User |

### Key fields

**User**: `id (uuid)`, `username (unique)`, `email (unique)`, `password (hashed)`,
`avatarUrl`, `role (USER/ADMIN)`, `createdAt`, `updatedAt`

**Artwork**: `id (uuid)`, `title`, `description`, `mediaUrl`, `authorId (FK → User)`,
`createdAt`, `updatedAt`

**Follow**: composite primary key `(followerId, followingId)` both referencing User

> For a visual diagram of the schema, see [`prisma/schema.prisma`](./backend/prisma/schema.prisma)

---

## Features List

| Feature | Description | Owner |
|---------|-------------|-------|
| User registration | Create an account with email and password | \<login\> |
| User login | Authenticate and receive a JWT token | \<login\> |
| Google OAuth | Sign in with a Google account | \<login\> |
| Two-factor authentication | Optional 2FA via authenticator app | \<login\> |
| User profile | View and edit profile info and avatar | \<login\> |
| Artwork upload | Post images with title, description, and tags | \<login\> |
| Infinite canvas | Navigate a 2D map of content clustered by tag | \<login\> |
| Search | Filter canvas by keyword or tag | \<login\> |
| Follow system | Follow/unfollow other users | \<login\> |
| Like system | Like artworks | \<login\> |
| Comment system | Comment on artworks | \<login\> |
| Real-time chat | Direct messages between users | \<login\> |
| Notifications | In-app alerts for activity | \<login\> |
| Admin panel | Manage users and content | \<login\> |
| [Add more as completed] | | |

---

## Modules

| Status | Module | Type | Points | Owner | Description |
|--------|--------|------|--------|-------|-------------|
| [] | Framework frontend + backend | Major | 2 | \<login\> | React (frontend) + NestJS (backend) |
| [] | Frontend framework | Minor | 1 | \<login\> | React + TypeScript |
| [] | Backend framework | Minor | 1 | \<login\> | NestJS |
| [] | Real-time features (WebSockets) | Major | 2 | \<login\> | Live chat and canvas updates |
| [] | User interaction | Major | 2 | \<login\> | Chat, profiles, follow system |
| [] | Standard user management | Major | 2 | \<login\> | Registration, login, profile, avatar |
| [] | OAuth (Google login) | Minor | 1 | \<login\> | Google sign-in via passport-google |
| [] | ORM | Minor | 1 | \<login\> | Prisma connected to PostgreSQL |
| [] | Notification system | Minor | 1 | \<login\> | In-app alerts for user activity |
| [] | Advanced search | Minor | 1 | \<login\> | Search with filters and tag support |
| [] | File upload | Minor | 1 | \<login\> | Image upload via Cloudinary |
| [] | Custom design system | Minor | 1 | \<login\> | [describe your component library] |
| [] | Multiple languages (i18n) | Minor | 1 | \<login\> | [languages supported] |
| [] | Additional browser support | Minor | 1 | \<login\> | Firefox, Safari, Edge |
| [] | Public API | Major | 2 | \<login\> | Secured public API with rate limiting |
| [] | RTL language support | Minor | 1 | \<login\> | Arabic RTL layout support |
| [] | Advanced permission system | Major | 2 | \<login\> | Admin/moderator/user roles and CRUD |
| [] | Two-factor authentication | Minor | 1 | \<login\> | TOTP via authenticator app |
| [] | WAF/ModSecurity | Major | 2 | \<login\> | Hardened WAF + HashiCorp Vault |
| [] | ELK stack | Major | 2 | \<login\> | Elasticsearch, Logstash, Kibana |
| [] | Microservices | Major | 2 | \<login\> | Backend split into independent services |
| [] | GDPR compliance | Minor | 1 | \<login\> | Data export, deletion, confirmation |

**Total: 29 points**

---
