# media-gallery (Root)

Root workspace configuration, Docker containerization, and launch scripts for the Next.js + Bun + Python + Redis Media Gallery application.

## Config, Docker & Launch Files

- `next.config.ts` — Next.js 16 configuration enabling `output: "standalone"` for minimal production images, bounding build worker concurrency (`experimental.cpus: 2`, `memoryBasedWorkersCount: true`), and excluding non-runtime folders (`mobile`, `prisma_db`, `scripts`, `public`, `.git`, `.next/cache`) from `@vercel/nft` tracing.
- `Dockerfile` — 4-stage Alpine container image (`deps` -> `prisma_cli` -> `builder` -> `runner`) using `oven/bun:1.3.14-alpine`. Builds Next.js standalone output via `bun run build`, merges `prisma@7.9.0` + `dotenv@17.4.2` CLI files recursively into `/runtime/node_modules` (ensuring partially-traced packages like `dotenv` have all entrypoints), smoke-tests `bun run db:push`, strips broken symlinks, and exports a single lean `/app` layer alongside Python 3 (`/usr/bin/python` symlink), Pillow, `ffmpeg`, Node.js, and OpenSSL.
- `docker-entrypoint.sh` — Container startup entrypoint ensuring `/app/prisma_db` exists, syncing Prisma SQLite schema via `bun run db:push --accept-data-loss`, launching `scripts/preview_generator.py --daemon` in the background, and exec-ing standalone `/app/server.js` (with `next start` fallback) as PID 1 on port `38479`.
- `docker-compose.yml` — Orchestrates `media_gallery_redis` (`redis:7-alpine`, 256MB LRU cap) and `media_gallery_app` (`media-gallery-web:latest`, ports `38479` & `5555`, 1024MB limit, `/api/health` check, named volumes `redis_data`/`db_data`, and configurable host drive mounts).
- `.dockerignore` — Excludes `node_modules`, `.next`, `mobile`, local `.db`/`.env` files, `.git`, agent folders, and markdown docs (except `README.md`) from the Docker build context.
- `run.bat` — Windows 1-click launcher with `COMPOSE_BAKE=false` and `BUILDX_NO_DEFAULT_ATTESTATIONS=1`, Docker/Compose/daemon checks, `build` + `up -d`, corrupted layer/base-image cache recovery (`--no-cache --pull`), build-failure guard, health polling, and browser launch.
- `run.sh` — Linux/macOS/Git-Bash 1-click launcher mirroring `run.bat` with `docker compose` / `docker-compose` detection, cache/base-image recovery, health polling, and browser launch.
