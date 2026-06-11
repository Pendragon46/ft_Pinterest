# ft_pinterest - DevOps Documentation

## Description

This project uses a containerized architecture based on Docker to ensure:

- Identical installation for all team members.
- A reproducible development environment.
- Complete isolation of dependencies.
- Compatibility with ft_pinterest project requirements.
- Simple integration of future features.

The entire project is launched via Docker Compose.

---

# Technical Stack

## Frontend

- React
- TypeScript
- Vite

## Backend

- NestJS
- TypeScript
- Prisma ORM

## Database

- PostgreSQL 16

## Reverse Proxy

- Nginx

## Infrastructure

- Docker
- Docker Compose

---

# Architecture

                    Internet
                        │
                        ▼
                  ┌─────────┐
                  │  NGINX  │
                  └────┬────┘
                       │
            ┌──────────┴──────────┐
            ▼                     ▼
      React Frontend         NestJS Backend
                                    │
                                    ▼
                              PostgreSQL
                                    │
                                    ▼
                                 Prisma

---

# Project Structure

```text
ft_transcendence/
│
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   ├── .env
│   └── .env.example
│
├── backend/
│   ├── src/
│   ├── prisma/
│   ├── Dockerfile
│   ├── .env
│   └── .env.example
│
├── nginx/
│   └── nginx.conf
│
├── docker-compose.yml
│
└── README.md
```

---

# Docker Services

## Frontend

Container:

```text
app_frontend
```

Internal port:

```text
5173
```

Responsibilities:

- User interface
- React pages
- Communication with API

---

## Backend

Container:

```text
app_backend
```

Internal port:

```text
3000
```

Responsibilities:

- REST API
- Authentication
- User management
- Communication with PostgreSQL

---

## PostgreSQL

Container:

```text
ft_pinterest_postgres
```

Internal port:

```text
5432
```

Responsibilities:

- Data storage
- Persistence

Volume used:

```text
postgres_data
```

Data persists even after container restart.

---

## Nginx

Container:

```text
ft_pinterest_nginx
```

Public port:

```text
8080
```

Responsibilities:

- Single entry point
- Reverse proxy
- Frontend / Backend routing
- HTTPS preparation

---

# Nginx Routing

Frontend:

```text
http://localhost:8080/
```

Backend:

```text
http://localhost:8080/api/
```

Health Check:

```text
http://localhost:8080/api/health
```

---

# Installation

## Prerequisites

Docker:

```bash
docker --version
```

Docker Compose:

```bash
docker compose version
```

Git:

```bash
git --version
```

---

# Clone the project

```bash
git clone <repository>
cd ft_transcendence
```

---

# Configuration

## Backend

Create:

```text
backend/.env
```

from:

```text
backend/.env.example
```

Example:

```env
DATABASE_URL=postgresql://postgres:password@postgres:5432/app
JWT_SECRET=CHANGE_ME
```

---

## Frontend

Create:

```text
frontend/.env
```

from:

```text
frontend/.env.example
```

---

# Startup

Build images:

```bash
docker compose build
```

Start:

```bash
docker compose up -d
```

Verify:

```bash
docker compose ps
```

All services should be:

```text
healthy
```

---

# Logs

All services:

```bash
docker compose logs -f
```

Frontend:

```bash
docker compose logs -f frontend
```

Backend:

```bash
docker compose logs -f backend
```

Database:

```bash
docker compose logs -f postgres
```

Nginx:

```bash
docker compose logs -f nginx
```

---

# Shutdown

Stop:

```bash
docker compose down
```

Stop and remove volumes:

```bash
docker compose down -v
```

(ATTENTION!) This command deletes the database.

---

# Prisma

Enter the backend:

```bash
docker exec -it app_backend sh
```

Create a migration:

```bash
npx prisma migrate dev --name migration_name
```

Generate Prisma client:

```bash
npx prisma generate
```

Check status:

```bash
npx prisma migrate status
```

---

# DevOps Verification

## Frontend Verification

```bash
curl http://localhost:8080/
```

React HTML should be returned.

---

## Backend Verification

```bash
curl http://localhost:8080/api/health
```

Expected response:

```json
{
  "status": "ok"
}
```

---

## PostgreSQL Verification

```bash
docker exec -it app_postgres psql -U postgres -d ft_pinterest
```

List tables:

```sql
\dt
```

---

# Developer Conventions

## Frontend

Install dependencies only in:

```text
frontend/package.json
```

Never install on the host machine.

Always rebuild:

```bash
docker compose build frontend
```

after modifying dependencies.

---

## Backend

Install dependencies only in:

```text
backend/package.json
```

Example:

```bash
npm install @nestjs/config
```

Then:

```bash
docker compose build backend
```

---

## Environment Variables

Never commit:

```text
.env
```

Only files:

```text
.env.example
```

should be versioned.

---

# Current Security

Implemented:

- Isolated Docker network
- No Backend ports publicly exposed
- No PostgreSQL ports publicly exposed
- Separate environment variables
- Nginx reverse proxy
- Healthchecks on all services

---

# Current DevOps State

Completed:

- Dockerfiles

- Docker Compose

- Docker internal network

- React Frontend

- NestJS Backend

- PostgreSQL

- Prisma

- Nginx

- Reverse Proxy

- Environment variables

- Healthchecks

- PostgreSQL persistence

---

# Remaining Tasks

## High Priority

- Prisma models
- Prisma migrations
- JWT authentication
- User management

## Medium Priority

- HTTPS / SSL
- Nginx security headers
- Request rate limiting

## Low Priority

- GitHub Actions
- Automatic backups
- Monitoring
- Log centralization

---

# DevOps Contact

Any modification to:

- docker-compose.yml
- Dockerfile
- nginx.conf
- environment variables
- Prisma

must be validated with the DevOps lead before merging.
