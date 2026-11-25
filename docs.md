# media-gallery (Root)

Root workspace configuration, Docker containerization, and launch scripts for the Next.js + Bun + Python + Redis Media Gallery application.

## Docker & Launch Files

- `Dockerfile` — Multi-stage Alpine container image (`deps` -> `builder` -> `runner`) using `oven/bun:1.3.14-alpine`. Installs dependencies with `--backend=copyfile`, compiles Next.js with `--webpack` (avoiding Turbopack tar/layer issues), and copies only runtime artifacts (`node_modules`, `generated`, `prisma`, `public`, `.next`, `scripts`, `lib`) alongside Python 3, Pillow, `ffmpeg`, Node.js, and OpenSSL.
- `docker-entrypoint.sh` — Container startup entrypoint ensuring `/app/prisma_db` exists, syncing Prisma SQLite schema via `bun run db:push --accept-data-loss`, launching `scripts/preview_generator.py --daemon` in the background, and exec-ing `next start` as PID 1 on port `38479`.
- `docker-compose.yml` — Orchestrates `media_gallery_redis` (`redis:7-alpine`, 256MB LRU cap) and `media_gallery_app` (`media-gallery-web:latest`, ports `38479` & `5555`, 1024MB limit, `/api/health` check, named volumes `redis_data`/`db_data`, and configurable host drive mounts).
- `.dockerignore` — Excludes `node_modules`, `.next`, `mobile`, local `.db`/`.env` files, `.git`, agent folders, and markdown docs (except `README.md`) from the Docker build context.
- `run.bat` — Windows 1-click launcher with `BUILDX_NO_DEFAULT_ATTESTATIONS=1`, Docker/Compose/daemon checks, corrupted layer/base-image cache recovery (`--no-cache --pull`), build-failure guard, health polling, and browser launch.
- `run.sh` — Linux/macOS/Git-Bash 1-click launcher mirroring `run.bat` with `docker compose` / `docker-compose` detection, cache/base-image recovery, health polling, and browser launch.
