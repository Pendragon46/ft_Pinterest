#!/bin/sh

set -e

if [ $# -ne 1 ]; then
    echo "Usage:"
    echo "/scripts/restore.sh /backups/backup.sql"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup not found:"
    echo "$BACKUP_FILE"
    exit 1
fi

echo "Restoring database..."

PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h postgres \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    < "$BACKUP_FILE"

echo "Restore completed."