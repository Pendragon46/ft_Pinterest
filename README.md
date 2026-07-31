*This project has been created as part of the 42 curriculum by trindran, cramaros, nrakotom, srabeman*

---

# Description

The project is an infinite canvas web app where user discover and share artwork.\
It's like pinterest but with infinite canvas instead of standard scrolling.

### Key features

- Infinite canvas — content is displayed on a 2D navigable map, clustered by topic
- Tag-based positioning — posts are placed automatically based on their tags
- Search — filter the canvas by keyword to see only matching content
- User accounts — register, log in, manage your profile
- Social features — follow users, like and comment on posts

---

# Instruction

### Prerequisites

Make sure the following are installed on your machine:

| Tool | Version | Purpose |
|------|---------|---------|
| Docker | 24+ | Containerization |
| Docker Compose | 2.0+ | Multi-container orchestration |
| Node.js | 20 LTS | Backend runtime (dev only) |
| npm | 10+ | Package manager (dev only) |

### Environment setup

Copy the example env files and fill in your values:

```bash
cp .env.example .env
```
Required variables in `.env`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/transcendence
JWT_SECRET=your_long_random_secret
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

The app will be available at `http://localhost:8443`

---

# Resources

 - **NestJS** : [official site documentation ] (https://docs.nestjs.com/)
 - **Prisma** : [official documentation ] (https://www.prisma.io/docs)
 - **Socket.IO** : [official documentation ] (https://socket.io/docs/v4/)
## Description
## Instruction
## 📚 Resources
### Official Documentation

- **NestJS**: [Official Documentation](https://docs.nestjs.com/)
- **Prisma**: [Official Documentation](https://www.prisma.io/docs)
- **Socket.IO**: [Official Documentation](https://socket.io/docs/v4/)
- **React**: [Official Documentation](https://react.dev/)
- **Cloudinary**: [Official Documentation](https://cloudinary.com/documentation)

### Video Tutorials

- **NestJS**: [Anson](https://youtu.be/uWZ_6pDbLpU), [Marius Espejo](https://www.youtube.com/watch?v=2n3xS89TJMI&list=PLlaDAvA2MhR2jb8zavu6I-w1BA878aHcB)
- **Prisma**: [Web Dev Simplified](https://www.youtube.com/watch?v=RebA5J-rlwg&t=3018s)
- **Socket.IO**: [Marius Espejo](https://youtu.be/atbdpX4CViM)
- **Cloudinary**: [Cloudinary](https://youtu.be/l7TUGdRN-f0)
## Team Information:
## Project Management:
## Technical Stack:
 - Backend :
   - NestJS
   - Prisma
   - PostgreSQL
   - Typescript
- Frontend :
  - React
  - TypeScript

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

## Team Information:

| Login | Role(s) | Responsibilities |
|-------|---------|-----------------|
| \<login4\> | Product Owner | [responsibilities] |
| \<login1\> | Project Manager / Backend Developer | [describe: auth, API, database, etc.] |
| \<login2\> | Technical Lead/ developper | [responsibilities] |
| \<login3\> | Technical Lead/ developper | [responsibilities] |



---

## Project Management:

### How the team organized the work
Weekly meetings. Each feature had a responsible for implementation and testing.

### Tools used
- **Version control**: Git + GitHub
- **Task tracking**: [GitHub Issues]
- **Communication**: [Whatsapp / Slack]

---

## Technical Stack:

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
  
## Database Schema:

![Database Schema](diagram_prisma.png)

### Tables and relationships

| Table    | Description | Key relationships |
|----------|-------------|-------------------|
| User     | Stores account info, credentials, role, avatar | Has many Artworks, Comments, Likes, Follows |
| Artwork  | User-created posts with image and description | Belongs to User, has many Tags, Comments, Likes |
| Tag      | Keywords attached to artworks | Many-to-many with Artwork |
| Like     | A user liking an artwork | Belongs to User and Artwork |
| Comment  | A user commenting on an artwork | Belongs to User and Artwork |
| Follow   | Follow relationship between two users | References User twice (follower / following) |

### Key fields

**User**: `id (uuid)`, `username (unique)`, `email (unique)`, `password (hashed)`,
`avatarUrl`, `role (USER/ADMIN)`, `createdAt`, `updatedAt`

**Artwork**: `id (uuid)`, `title`, `description`, `mediaUrl`, `authorId (FK → User)`,
`createdAt`, `updatedAt`

**Follow**: composite primary key `(followerId, followingId)` both referencing User

---

## Features List:

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

## Features List:

## Modules:
 - Major :
    - [x] Use a framework for the frontend and backend(React, NestJS).
    - [x] Implement real-time features using WebSockets or similar technology.
    - [] Allow users to interact with other users
	
    - [x] Advanced Permission System *(frontend committed; backend changes are local & uncommitted — see `local_backend_changes.md`)*
    - [] Standard user management and authentication
	- [x] Module of choice (infinite canvas)
	- [] Monitoring system with Prometheus and Grafana.
	

 
- Minor :
    - [x] Use a frontend framework (React).
    - [x] Use a backend framework (NestJS).
    - [x] Use an ORM (Prisma) for the database.
    - [x] Health check and status page system with automated backups and disaster recovery procedures.
    - [x] A complete notification system for all creation, update, and deletion actions.
    - [x] File upload and management system
    - [x] Custom-made design system with reusable components, including a proper color palette, typography, and icons.
	- [x]  Implement advanced search functionality with filters, sorting, and pagination.
    - [x] Multilingue
    - [x] Support for additional browsers
    - [x] RTL Arabic
    - [x] GDPR compliance features
	- [] file upload
	- [] Oauth2.0 authentication with Google
	- [] User activity analytics and insights dashboard

Excpected points: 23/28

## Individual Contributions:
- trindran :
  - prisma model for user, artwork, comment, like, follow, Tag
  - Implement basis user CRUD with the dto validation
  - Upload avatar, file and artwork with dto validation
  - follow, like, comment friendship system with dto validation
  - Role based access control for USER/ADMIN with dto validation
  - Online status with socket.io
  - Search system with filters, sorting and pagination

- nrakotom :
- cramaros :
  - Set up the complete development environment (frontend, backend, Docker, and service dependencies).
  - Implemented the health monitoring system, including health checks, the status page, automated PostgreSQL backups, and disaster recovery procedures.
- srabeman :



