#!/bin/sh
set -e

echo "Waiting for database..."

until nc -z postgres 5432; do
  sleep 2
done

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting NestJS..."
exec npm run start:dev