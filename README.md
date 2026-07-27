# 🎬 Server Gallery

**Server Gallery** is an offline-first, self-hosted media gallery server built with **Next.js 16**, **Docker**, **Prisma ORM (SQLite)**, **Redis**, and **Python Multiprocessing**. 

Designed for home servers, local networks (LAN), and self-hosted environments to stream photos, videos, music, and documents seamlessly across all your devices.

---

## ✨ Features

- 📹 **VLC/MX-Style Media Player**: Immersive full-height video playback with VLC-style centered controls, double-click fullscreen, auto-hiding overlays, buffering indicators, keyboard shortcuts, and HTTP byte-range streaming.
- 🖼️ **Multi-Format Previewer**: Photos, high-bitrate videos, FLAC/MP3 audio, and document previews in mobile-friendly full-screen drawers.
- ⚡ **Python Multiprocessing Scanner**: High-speed folder indexing leveraging `ProcessPoolExecutor` multiprocessing and zero-dependency socket-based Redis queueing.
- 🌐 **LAN Network Scanner & Offline PWA**:
  - Auto-discovers server IP changes on local Wi-Fi/LAN (`192.168.x.x`, `10.x.x.x` on port `38479`).
  - Pre-cached self-contained offline fallback page (`public/offline.html`) served by Service Worker (`public/sw.js`) when server IP changes or network drops.
  - Dynamic PWA Web Manifest supporting installation on iOS, Android, and Desktop.
- 🔐 **Better-Auth & Per-User Libraries**: Secure authentication with individual user media folder libraries.
- 👑 **Admin User Management**: Dedicated `/dashboard/users` dashboard featuring shadcn DataTables for user CRUD, role modification (`admin` / `user`), account banning, and deletion.
- 📜 **System & Security Audit Logs**: Dedicated `/dashboard/logs` dashboard tracking real-time server activity, login attempts (success & failure), device IPs, browser User-Agents, and JSON metadata payloads. Dual terminal ANSI console & SQLite logging.
- 🌓 **Dark / Light Theme**: Built-in theme switcher (`next-themes`) supporting Dark, Light, and System modes.

---

## 🔑 Promoting a User to Admin (Docker & Local CLI)

Since SQLite is running inside an isolated Docker volume (`db_data:/app/prisma_db`), you can promote any registered user to an **Administrator** using our built-in CLI command without needing direct database access.

### 1. In Docker Container (Recommended)

Run the following command on your host machine where Docker is running:

```bash
docker exec -it media_gallery_app bun run scripts/make-admin.ts user@example.com
```

### 2. In Local Development Environment

If running locally with Bun:

```bash
bun run scripts/make-admin.ts user@example.com
```

*Example Output:*
```text
[SUCCESS] Granted administrator role to John Doe (user@example.com).
```

Once promoted, log out and log back in (or refresh). The **Users** and **System Logs** navigation options will appear in your sidebar.

---

## 🚀 Quick Start with Docker Compose

### Prerequisites
- [Docker Desktop](https://www.docker.com/) or Docker Engine with Docker Compose.

### 1. Clone & Configure

```bash
git clone https://github.com/your-repo/media-gallery.git
cd media-gallery
```

### 2. Launch Stack

Start the application container and Redis instance:

```bash
docker compose up -d
```

Access the server in your browser or PWA:

```text
http://localhost:38479
# Or on your local network:
http://<YOUR_SERVER_IP>:38479
```

---

## 🛠️ Docker Architecture & Volumes

Everything runs independently inside Docker:

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: media_gallery_redis
    ports:
      - "6379:6379"

  web:
    build: .
    container_name: media_gallery_app
    ports:
      - "38479:3000"
    environment:
      - DATABASE_URL=file:/app/prisma_db/dev.db
      - REDIS_URL=redis://redis:6379
      - BETTER_AUTH_URL=http://localhost:38479
    volumes:
      - db_data:/app/prisma_db            # Isolated SQLite Database Volume
      - ${HOST_MEDIA_PATH:-./}:/host_media:ro
      - C:\:/host_drives/c:ro              # Mount host drives for media scanning
      - D:\:/host_drives/d:ro
```

*Database Auto-Initialization:* On container boot, `docker-entrypoint.sh` automatically initializes and synchronizes the SQLite schema (`bun run db:push`).

---

## 📂 Project Structure

```text
├── app/
│   ├── api/                # Media, Auth, Admin Users & Logs API routes
│   ├── dashboard/          # Gallery, Users CRUD, Logs, Profile & Settings
│   ├── offline/            # Static PWA fallback routing
│   ├── icon.tsx            # PWA App Icon
│   └── manifest.ts         # Dynamic PWA Web Manifest
├── components/
│   ├── preview/            # VideoPreview (VLC style), PhotoPreview, AudioPreview, Drawer
│   ├── ui/                 # shadcn UI components (DataTable, Dialog, Sidebar, Select, etc.)
│   ├── mode-toggle.tsx     # Light/Dark Theme Switcher
│   ├── NetworkScanner.tsx  # LAN Subnet Server Scanner
│   └── ServiceWorkerRegister.tsx
├── lib/
│   ├── logger.ts           # Dual Terminal Console + DB System Log utility
│   ├── prisma.ts           # Prisma ORM Singleton
│   └── redis.ts            # ioredis Connection Handler
├── prisma/
│   └── schema.prisma       # User, Session, MediaFolder, and SystemLog models
├── public/
│   ├── offline.html        # Self-contained static PWA offline page
│   └── sw.js               # Service Worker precaching & offline fetch interceptor
├── scripts/
│   ├── make-admin.ts       # CLI command to promote user to Admin
│   └── scanner.py          # Multiprocessing media scanner script
├── Dockerfile              # Production Bun + Python container definition
└── docker-compose.yml      # Multi-container orchestration stack
```

---

## 📜 License

MIT License. Designed for home media server enthusiasts.
