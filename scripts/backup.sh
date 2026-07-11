#!/bin/sh

BACKUP_DIR=/backups
DATE=$(date +"%Y-%m-%d_%H-%M-%S")

mkdir -p "$BACKUP_DIR"

echo "Waiting for PostgreSQL..."

until pg_isready -h postgres -U "$POSTGRES_USER"
do
    sleep 2
done

echo "PostgreSQL is ready."

echo "Creating backup..."

PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h postgres \
    -p 5432 \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    > "$BACKUP_DIR/backup_$DATE.sql"

if [ $? -eq 0 ]; then
    echo "Backup completed."
else
    echo "Backup failed."
    exit 1
fi

ls -1t "$BACKUP_DIR"/backup_*.sql | tail -n +11 | xargs -r rm
# find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete

echo "Old backups deleted."