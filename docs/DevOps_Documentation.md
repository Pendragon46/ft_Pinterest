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

## Prerequisites

- Docker
- Docker Compose
- GNU Make

Clone the repository:

```bash
git clone <repository>
cd ft_pinterest
```

Build and start the project:

```bash
make start
```

Verify that all containers are running:

```bash
make ps
```

Stop the project:

```bash
make stop
```

```

Every container should become **healthy**.

---

# Monitoring

Prometheus collects application and infrastructure metrics, while Grafana provides dashboards for real-time monitoring.

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

## Grafana Dashboard

Implemented panels:

- Backend status
- PostgreSQL status
- CPU usage
- RAM usage
- Disk usage
- HTTP requests

Grafana is automatically provisioned with:

- Prometheus datasource
- ft_pinterest dashboard

Dashboard and datasource are automatically restored on a fresh installation. User settings and alerts are persisted in the `grafana_data` Docker volume.

---

## Alerting

Implemented alerts:

- Backend unavailable
- PostgreSQL unavailable
- Node Exporter unavailable
- High CPU usage
- High RAM usage
- High Disk usage

---

## Verification

### Backend

```bash
curl -k https://localhost:8443/api/health
```

### Frontend

```bash
curl -k https://localhost:8443/
```

### Prometheus

```bash
curl -k https://localhost:8443/prometheus/-/healthy
```

### Grafana

```bash
curl -k https://localhost:8443/grafana/api/health
```

### Docker Health Status

```bash
make ps
```

All containers should have the `healthy` status.

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

Run the custom health verification script:

```bash
make health

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

# Status Pages

## Backend Health Endpoint

The backend exposes a health endpoint used by Docker and Nginx.

```text
https://localhost:8443/api/health
https://localhost:8443/status
```

Example response:

```json
{
  "status": "ok",
  "backend": "online",
  "database": "online",
  "uptime": 120,
  "version": "1.0.0"
}
```

If PostgreSQL becomes unavailable:

```json
{
  "status": "error",
  "backend": "online",
  "database": "offline"
}
```

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