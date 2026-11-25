# ==========================================
# Stage 1: Install app dependencies
# ==========================================
FROM oven/bun:1.3.14-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

ENV DATABASE_URL="file:/app/prisma_db/dev.db"

RUN bun install --frozen-lockfile --backend=copyfile && rm -rf /root/.bun/install/cache

# ==========================================
# Stage 2: Minimal Prisma CLI for runtime db:push / studio
# ==========================================
FROM oven/bun:1.3.14-alpine AS prisma_cli
WORKDIR /opt/prisma

RUN printf '{"name":"prisma-cli","private":true,"dependencies":{"prisma":"7.9.0","dotenv":"17.4.2"}}\n' > package.json \
    && bun install --backend=copyfile \
    && rm -rf /root/.bun/install/cache

# ==========================================
# Stage 3: Build Next.js standalone bundle
# ==========================================
FROM deps AS builder
WORKDIR /app

RUN apk add --no-cache nodejs

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/prisma_db/dev.db"
ENV BETTER_AUTH_URL="http://localhost:38479"
ENV BETTER_AUTH_SECRET="build-time-placeholder-secret-only"
ENV NEXT_PRIVATE_LOCAL_WORKERS=1

RUN bun run db:generate \
    && bun run build \
    && rm -rf .next/cache

COPY --from=prisma_cli /opt/prisma/node_modules /tmp/prisma_nm

# Assemble minimal /runtime directory from Next.js standalone output + runtime scripts
RUN mkdir -p /runtime/.next \
    && cp -a .next/standalone/. /runtime/ \
    && cp -a .next/static /runtime/.next/static \
    && cp -a public /runtime/public \
    && cp -a package.json prisma prisma.config.ts generated scripts lib tsconfig.json docker-entrypoint.sh /runtime/ \
    && node -e ' \
      const fs = require("fs"), path = require("path"); \
      const srcRoot = "/tmp/prisma_nm", dstRoot = "/runtime/node_modules"; \
      fs.mkdirSync(dstRoot, { recursive: true }); \
      function merge(srcDir, dstDir) { \
        fs.mkdirSync(dstDir, { recursive: true }); \
        for (const entry of fs.readdirSync(srcDir)) { \
          const s = path.join(srcDir, entry), d = path.join(dstDir, entry); \
          const st = fs.lstatSync(s); \
          if (st.isDirectory()) { \
            merge(s, d); \
          } else if (!fs.lstatSync(d, { throwIfNoEntry: false })) { \
            fs.cpSync(s, d, { verbatimSymlinks: true }); \
          } \
        } \
      } \
      function cleanBrokenSymlinks(dir) { \
        for (const entry of fs.readdirSync(dir)) { \
          const p = path.join(dir, entry); \
          const st = fs.lstatSync(p); \
          if (st.isSymbolicLink()) { \
            if (!fs.existsSync(p)) fs.unlinkSync(p); \
          } else if (st.isDirectory()) { \
            cleanBrokenSymlinks(p); \
          } \
        } \
      } \
      merge(srcRoot, dstRoot); \
      cleanBrokenSymlinks("/runtime"); \
    ' \
    && rm -rf /tmp/prisma_nm \
    && sed -i 's/\r$//' /runtime/docker-entrypoint.sh \
    && chmod +x /runtime/docker-entrypoint.sh \
    && (cd /runtime && DATABASE_URL="file:/tmp/smoke.db" bun run db:push && rm -f /tmp/smoke.db)

# ==========================================
# Stage 4: Ultra-lean production runtime
# ==========================================
FROM oven/bun:1.3.14-alpine AS runner
WORKDIR /app

RUN apk add --no-cache python3 py3-pillow ffmpeg nodejs openssl \
    && ln -sf /usr/bin/python3 /usr/bin/python \
    && mkdir -p /app/prisma_db

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1
ENV PORT=38479
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL="file:/app/prisma_db/dev.db"
ENV BETTER_AUTH_URL="http://localhost:38479"

COPY --from=builder /runtime /app

EXPOSE 38479 5555

ENTRYPOINT ["/app/docker-entrypoint.sh"]
