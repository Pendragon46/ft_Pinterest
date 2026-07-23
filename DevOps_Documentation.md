# ft_pinterest - DevOps Documentation

## Description

This project uses a containerized architecture based on Docker to provide a reproducible and isolated development environment. The infrastructure includes monitoring with Prometheus and Grafana to observe the application's health and system resources.

Main objectives:

- Reproducible development environment
- Container isolation
- HTTPS reverse proxy with Nginx
- Database persistence
- Health monitoring
- Metrics collection and visualization
- Alerting system

---

# Technical Stack

## Frontend

- React
- TypeScript
- Vite

## Backend

- NestJS
- Prisma ORM
- TypeScript

## Database

- PostgreSQL 16

## Reverse Proxy

- Nginx

## Monitoring

- Prometheus
- Grafana
- PostgreSQL Exporter
- Node Exporter

## Infrastructure

- Docker
- Docker Compose

---

# Architecture

```
                  Internet
                      │
                      ▼
                 HTTPS / NGINX
                      │
      ┌───────────────┴────────────────┐
      ▼                                ▼
 React Frontend                 NestJS Backend
                                        │
                                        ▼
                                   PostgreSQL

                      ▼
                 Prometheus
                 ▲        ▲
                 │        │
        Node Exporter   PostgreSQL Exporter
                 │
                 ▼
              Grafana
```

---

# Docker Services

| Service | Purpose |
|----------|---------|
| frontend | React application |
| backend | NestJS REST API |
| postgres | Database |
| nginx | Reverse proxy |
| prometheus | Metrics collection |
| grafana | Dashboards and alerting |
| postgres_exporter | PostgreSQL metrics |
| node_exporter | Host metrics |
| backup | Database backups |

---

# Available URLs

| Service | URL |
|----------|-----|
| Frontend | https://localhost:8443 |
| Backend API | https://localhost:8443/api |
| Health | https://localhost:8443/api/health |
| Grafana | https://localhost:8443/grafana |
| Prometheus | https://localhost:8443/prometheus |

---

# Installation

Clone the repository

```bash
git clone <repository>
cd ft_pinterest
```

Build

```bash
docker compose build
```

Start

```bash
docker compose up -d
```

Verify

```bash
docker compose ps
```

Every container should become **healthy**.

---

# Monitoring

## Prometheus

Prometheus scrapes metrics from:

- backend
- postgres_exporter
- node_exporter

Configuration:

```
monitoring/prometheus.yml
```

Alert rules:

```
monitoring/alert_rules.yml
```

---

## Grafana

Grafana visualizes Prometheus metrics through dashboards.

Implemented panels:

- Backend status
- PostgreSQL status
- CPU usage
- RAM usage
- Disk usage
- HTTP requests

---

# Alerting

Implemented alerts:

- Backend unavailable
- PostgreSQL unavailable
- Node Exporter unavailable
- High CPU usage
- High RAM usage
- High Disk usage

---

# Verification

## Backend

```bash
curl https://localhost:8443/api/health -k
```

---

## Backend metrics

```bash
curl https://localhost:8443/api/metrics -k
```

---

## Prometheus

Open

```
https://localhost:8443/prometheus
```

Useful queries:

```
up
```

```
pg_up
```

```
http_requests_total
```

---

## Grafana

Open

```
https://localhost:8443/grafana
```

Verify that the dashboard displays:

- Backend
- PostgreSQL
- CPU
- RAM
- Disk
- HTTP Requests

---

# Monitoring Tests

## Backend

```bash
docker stop ft_pinterest_backend
```

Expected:

- BackendDown alert becomes **Firing**

---

## PostgreSQL

```bash
docker stop ft_pinterest_postgres
```

Expected:

```
pg_up = 0
```

and

```
PostgresDown
```

becomes **Firing**.

---

## Node Exporter

```bash
docker stop ft_pinterest_node_exporter
```

Expected:

```
NodeExporterDown
```

becomes **Firing**.

---

## CPU

Generate CPU load

```bash
yes > /dev/null &
```

Stop

```bash
killall yes
```

The CPU dashboard should increase.

---

## RAM

Generate memory load

```bash
const a = [];
while (true) a.push(Buffer.alloc(1024 * 1024));
```

The RAM dashboard should increase.

---

# Health Checks

Each container implements a Docker health check to ensure that services are operational before dependent containers start.

# Health Check Tests

## Backend

```bash
curl -k https://localhost:8443/api/health
```

Expected response:

```json
{
  "status": "ok",
  "backend": "online",
  "database": "online"
}
```

---

## Check all containers

```bash
docker compose ps
```

Expected result:

```
backend              healthy
frontend             healthy
postgres             healthy
nginx                healthy
prometheus           healthy
grafana              healthy
postgres_exporter    healthy
node_exporter        healthy
backup               healthy
```

---


# References

## Docker

https://docs.docker.com/

## Nginx

https://nginx.org/en/docs/

## Prisma

https://www.prisma.io/docs/

## Prometheus

https://prometheus.io/docs/

## Grafana

https://grafana.com/docs/