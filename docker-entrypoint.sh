#!/bin/sh
set -e

echo "==> Ensuring SQLite database volume directory exists..."
mkdir -p /app/prisma_db

echo "==> Synchronizing Prisma database schema inside Docker..."
bun run db:push --accept-data-loss || bun x prisma db push --accept-data-loss

echo "==> Launching Server Gallery container application..."
exec bun run start
