#!/bin/sh

set -e

echo "====================================="
echo "FT_PINTEREST DISASTER RECOVERY"
echo "====================================="

LATEST=$(ls -t /backups/*.sql | head -n1)

if [ -z "$LATEST" ]; then
    echo "No backup found."
    exit 1
fi

echo
echo "Latest backup:"
echo "$LATEST"
echo

/scripts/restore.sh "$LATEST"

echo
echo "Recovery completed successfully."