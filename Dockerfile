# syntax=docker/dockerfile:1

# ==========================================
# Stage 1: Install dependencies
# ==========================================
FROM oven/bun:1.3.14-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

ENV DATABASE_URL="file:/app/prisma_db/dev.db"

# Use copyfile backend to prevent hardlink/tar layer issues across overlayfs
RUN bun install --frozen-lockfile --backend=copyfile && rm -rf /root/.bun/install/cache

# ==========================================
# Stage 2: Generate Prisma client & build Next.js
# ==========================================
FROM oven/bun:1.3.14-alpine AS builder
WORKDIR /app

# Node.js is required by Next.js build workers & webpack plugins
RUN apk add --no-cache nodejs

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/prisma_db/dev.db"
ENV BETTER_AUTH_URL="http://localhost:38479"
ENV NEXT_PRIVATE_LOCAL_WORKERS=1
ENV NODE_OPTIONS="--max-old-space-size=2048"

RUN bun run db:generate
# Build with --webpack to avoid Next.js 16 Turbopack symlink/0-byte tar layer corruption
RUN bun run next build --webpack && rm -rf .next/cache

# ==========================================
# Stage 3: Lean production runtime
# ==========================================
FROM oven/bun:1.3.14-alpine AS runner
WORKDIR /app

# Runtime tools: Python 3 + Pillow + ffmpeg (media scanning/previews), Node.js (Next.js PID 1), OpenSSL (Prisma)
RUN apk add --no-cache python3 py3-pillow ffmpeg nodejs openssl

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1
ENV PORT=38479
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL="file:/app/prisma_db/dev.db"
ENV BETTER_AUTH_URL="http://localhost:38479"

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN sed -i 's/\r$//' /app/docker-entrypoint.sh \
    && chmod +x /app/docker-entrypoint.sh \
    && mkdir -p /app/prisma_db

EXPOSE 38479 5555

ENTRYPOINT ["/app/docker-entrypoint.sh"]
