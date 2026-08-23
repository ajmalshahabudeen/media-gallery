#!/bin/sh
set -e

export PYTHONUNBUFFERED=1

echo "==> Ensuring SQLite database volume directory exists..."
mkdir -p /app/prisma_db

echo "==> Synchronizing Prisma database schema inside Docker..."
bun run db:push --accept-data-loss || bun x prisma db push --accept-data-loss

echo "==> Starting background media thumbnail & hover play preview generator daemon..."
python3 /app/scripts/preview_generator.py --daemon &

echo "==> Launching Server Gallery container application..."
# next-server must be PID 1 so an OOM kill restarts the container
# instead of leaving bun alive with a zombie child.
exec node ./node_modules/next/dist/bin/next start -H 0.0.0.0 -p "${PORT:-38479}"
