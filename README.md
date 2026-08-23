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

Next.js listens on **38479** directly (no reverse proxy). Redis is the only other service.

```bash
docker compose up -d
# or: run.bat / ./run.sh
```

Open `http://localhost:38479` or `http://YOUR_LAN_IP:38479`.

### 📲 Installing PWA on Local HTTP via Chrome Flags

1. Open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Enable it and add `http://192.168.1.101:38479` (your LAN IP)
3. Relaunch, then use **Install App**

---

## 🛠️ Docker Architecture & Volumes

`web` (Next.js + Prisma + Python workers) on host port **38479**, plus `redis`. SQLite lives on the `db_data` volume. Host media is bind-mounted at `/host_drives/*`.

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
