#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="file:/data/subman.db"
fi

mkdir -p /data /app/storage /app/docs

echo "[entrypoint] Running Prisma db push..."
npx prisma db push --accept-data-loss

if [ "${SEED_ON_BOOT:-false}" = "true" ]; then
  echo "[entrypoint] Seeding database..."
  node dist/prisma/seed.js
fi

echo "[entrypoint] Starting API..."
exec node dist/src/main.js
