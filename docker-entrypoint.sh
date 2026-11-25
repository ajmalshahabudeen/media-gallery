#!/bin/sh
set -eu

export PYTHONUNBUFFERED=1

echo "==> Ensuring SQLite database volume directory exists..."
mkdir -p /app/prisma_db

echo "==> Synchronizing Prisma database schema inside Docker..."
bun run db:push --accept-data-loss

echo "==> Starting background media thumbnail & hover preview daemon..."
if [ -f /app/scripts/preview_generator.py ]; then
  python3 /app/scripts/preview_generator.py --daemon &
fi

echo "==> Launching Server Gallery on 0.0.0.0:${PORT:-38479}..."
# next-server must be PID 1 so an OOM kill restarts the container
# instead of leaving a wrapper alive with a zombie child.
if [ -f /app/server.js ]; then
  exec node /app/server.js
fi
exec node ./node_modules/next/dist/bin/next start -H 0.0.0.0 -p "${PORT:-38479}"
