FROM oven/bun:1.3.14-alpine AS base

# Install Python 3, ffmpeg, Pillow, OpenSSL, and dependencies
RUN apk add --no-cache python3 py3-pip py3-pillow ffmpeg nodejs npm openssl bash

WORKDIR /app

# Copy package lockfiles and configs
COPY package.json bun.lock ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Environment variables required for build & prisma generate
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
ENV PYTHONUNBUFFERED 1
ENV DATABASE_URL "file:/app/prisma_db/dev.db"
ENV BETTER_AUTH_URL "http://localhost:38479"

# Install node dependencies
RUN bun install --frozen-lockfile --backend=copyfile && rm -rf /root/.bun/install/cache

# Copy application source code
COPY . .

# Make entrypoint script executable and convert line endings
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# Generate Prisma Client & Build Next.js with webpack (avoids Turbopack symlink tar issues in containerd)
RUN bun run db:generate
RUN bun run next build --webpack && rm -rf .next/cache

EXPOSE 38479

# Entrypoint script initializes SQLite DB at container startup & launches server
ENTRYPOINT ["/app/docker-entrypoint.sh"]
