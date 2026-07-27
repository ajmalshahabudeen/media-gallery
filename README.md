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

## 🚀 Quick Start with Docker Compose & Caddy HTTPS Proxy

### 🔒 Best Free + Easy + Quick Solution: Caddy Reverse Proxy with `tls internal`

To get HTTPS working on your LAN IPs (e.g. `https://192.168.1.50` or `https://localhost`) with a Dockerized Next.js app, we include Caddy as a reverse proxy using `tls internal`.

### 1. `Caddyfile`

```caddy
{
    # Prevents Caddy from trying to install the CA inside the container
    skip_install_trust
}

:38479 {
    reverse_proxy web:3000
}
```

### 2. `docker-compose.yml`

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
    expose:
      - "3000"
    environment:
      - DATABASE_URL=file:/app/prisma_db/dev.db
      - REDIS_URL=redis://redis:6379
      - BETTER_AUTH_URL=http://localhost:38479
    volumes:
      - db_data:/app/prisma_db            # Isolated SQLite Database Volume
      - ${HOST_MEDIA_PATH:-./}:/host_media:ro
      - C:\:/host_drives/c:ro              # Mount host drives for media scanning
      - D:\:/host_drives/d:ro
    depends_on:
      - redis

  caddy:
    image: caddy:2-alpine
    container_name: media_gallery_caddy
    ports:
      - "38479:38479"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - default
    depends_on:
      - web
    restart: unless-stopped

volumes:
  redis_data:
  db_data:
  caddy_data:
  caddy_config:
```

### 3. Launch Stack

```bash
docker compose up -d
```

Access the server in your browser or PWA:
- Open `https://YOUR_LAN_IP` (e.g., `https://192.168.1.50` or `https://localhost`).
- Click **Advanced → Proceed** on initial browser local CA warning.

---

### 🛡️ Making Caddy HTTPS Trusted on Devices (Phones, PCs, Tablets)

1. Extract Caddy’s root certificate from the running container:

```bash
docker compose exec caddy cat /data/caddy/pki/authorities/local/root.crt > caddy-root.crt
```

2. Install `caddy-root.crt` as a **Trusted Root CA** on each device:
   - **Windows**: Double-click `caddy-root.crt` → Install Certificate → Local Machine → Place all certificates in: **Trusted Root Certification Authorities**.
   - **macOS**: Double-click `caddy-root.crt` → add to System keychain → set to Always Trust.
   - **Android**: Settings → Security & Privacy → More Security Settings → Encryption & Credentials → Install a Certificate → CA Certificate.
   - **iOS**: AirDrop/Email `caddy-root.crt` → Settings → Profile Downloaded → Install → Settings → General → About → Certificate Trust Settings → Enable Full Trust.

After installing the root CA, the warning disappears permanently.

---

### 📲 Installing PWA on Local HTTP via Chrome Flags (Zero Certificate Config)

If accessing via HTTP (e.g. `http://192.168.1.101:38479`), Chrome and Edge allow installing PWAs by treating your server IP as a secure origin:

1. Open this URL in Chrome / Edge:
   `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Enable the flag and enter your server IP:
   `http://192.168.1.101:38479`
3. Change dropdown to **Enabled** and click **Relaunch**.
4. The **Install App** button will trigger native PWA installation!

---

### 💡 Alternative (mkcert)

If you prefer certificates that are already trusted on your main dev machine:

```bash
# Install mkcert once, then:
mkcert -install
mkcert localhost 127.0.0.1 ::1 192.168.1.50   # replace with your LAN IP
```

Mount the generated `.pem` files into Caddy and replace `tls internal` in your `Caddyfile` with `tls /etc/caddy/cert.pem /etc/caddy/key.pem`.

---

## 🛠️ Docker Architecture & Volumes

Everything runs independently inside Docker with Caddy acting as reverse proxy exposing ports `80` and `443`.

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
