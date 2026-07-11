## Minor Features

### Health Monitoring

The project includes health checks for all core services:

- Frontend
- Backend
- PostgreSQL
- Nginx

The backend exposes a `/health` endpoint used by Docker health checks and the status page.

### Automated Backups

A dedicated backup service automatically creates PostgreSQL database backups using `pg_dump`.

Features:

- scheduled backups using Supercronic
- timestamped SQL dump files
- automatic cleanup of old backups
- configurable backup retention

### Disaster Recovery

Recovery scripts are provided to restore the application after a database failure.

Available utilities:

```bash
make health      # Check application status
make restore     # Restore a specific backup
make recover     # Restore the latest backup