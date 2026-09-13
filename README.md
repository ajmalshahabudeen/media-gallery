# 🎬 Server Gallery

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3-black?logo=bun)](https://bun.sh/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)
[![SQLite](https://img.shields.io/badge/Prisma_7-SQLite-003B57?logo=sqlite)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis-7_Alpine-DC382D?logo=redis)](https://redis.io/)
[![Python](https://img.shields.io/badge/Python-Multiprocessing-3776AB?logo=python)](https://python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Server Gallery** is an offline-first, high-performance, self-hosted media gallery and streaming server built with **Next.js 16**, **Docker**, **Prisma ORM (SQLite)**, **Redis**, and a **Python 3 Multiprocessing** indexing engine.

It turns any PC, home server, NAS, or workstation into a centralized private streaming hub. Easily index terabytes of photos, videos, music, and documents stored on local hard drives or external USB/NAS disks without copying or duplicating files, and stream them smoothly across desktop browsers, mobile devices, smart TVs, and offline PWAs over your local Wi-Fi / LAN.

---

## 📑 Table of Contents

- [Architecture & Overview](#-architecture--overview)
- [Key Features](#-key-features)
- [System Prerequisites](#-system-prerequisites)
- [Step-by-Step Docker Setup & Running](#-step-by-step-docker-setup--running)
  - [Step 1: Clone the Repository](#step-1-clone-the-repository)
  - [Step 2: Environment Configuration](#step-2-environment-configuration)
  - [Step 3: Drive & Storage Mount Configuration](#step-3-drive--storage-mount-configuration)
  - [Step 4: Launching the Application](#step-4-launching-the-application)
  - [Step 5: Verifying Health & Viewing Logs](#step-5-verifying-health--viewing-logs)
- [First-Time Walkthrough & User Setup](#-first-time-walkthrough--user-setup)
  - [1. Create Your Account](#1-create-your-account)
  - [2. Promote Account to Administrator](#2-promote-account-to-administrator)
  - [3. Add Media Library Folders in Settings](#3-add-media-library-folders-in-settings)
- [Feature Guides](#-feature-guides)
  - [VLC/MX-Style Video Player & Drawer](#vlcmx-style-video-player--media-drawer)
  - [Background Preview & Thumbnail Daemon](#background-preview--thumbnail-daemon)
  - [Integrated Prisma Database Studio](#integrated-prisma-database-studio)
  - [Backup & Restore Hub with Auto-Healing](#backup--restore-hub-with-auto-healing)
  - [PWA & Local Network (LAN) Streaming](#pwa--local-network-lan-streaming)
- [Companion Mobile App](#-companion-mobile-app)
- [Local Development Without Docker](#-local-development-without-docker)
- [Ports, Volumes & Environment Variables](#-ports-volumes--environment-variables)
- [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 🏛 Architecture & Overview

```
                          ┌────────────────────────────────────────┐
                          │         Client Web Browsers /          │
                          │   Mobile PWA / React Native App        │
                          └───────────────────┬────────────────────┘
                                              │ HTTP (Port 38479)
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Docker Container: media_gallery_app (web)                                              │
│                                                                                        │
│  ┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────────┐  │
│  │ Next.js 16 Web App   │    │  Better-Auth Engine  │    │  Prisma ORM (SQLite)     │  │
│  │  - React 19 + shadcn │    │  - Session cookies   │    │  - /app/prisma_db/dev.db │  │
│  │  - HTTP 206 Streaming│    │  - Role verification │    │  - db_data named volume  │  │
│  └──────────┬───────────┘    └──────────────────────┘    └────────────┬─────────────┘  │
│             │                                                         │                │
│             │ Child Process Spawning / HTTP                           │ Port 5555      │
│             ▼                                                         ▼                │
│  ┌──────────────────────┐                                ┌──────────────────────────┐  │
│  │ Python Workers       │                                │  Prisma Studio (On-Dem.) │  │
│  │  - scanner.py        │                                │  - Web DB visualizer     │  │
│  │  - preview_gen daemon│                                └──────────────────────────┘  │
│  └──────────┬───────────┘                                                              │
└─────────────┼──────────────────────────────────────────────────────────────────────────┘
              │                                │ Tasks & Caches
              │ Direct Bind Mounts             ▼
              ▼                     ┌────────────────────────────────────┐
┌──────────────────────────┐        │ Docker Container:                  │
│ Host Physical Drives     │        │ media_gallery_redis                │
│  - C:\ -> /host_drives/c │        │  - Task Queue (LPUSH/RPOPLPUSH)    │
│  - D:\ -> /host_drives/d │        │  - WebP Thumbnail Cache            │
│  - F:\ -> /host_drives/f │        │  - LRU In-Memory Cache (256MB)     │
│  - /host_media           │        └────────────────────────────────────┘
└──────────────────────────┘
```

The system is composed of two containerized services:
1. **`web` (`media_gallery_app`)**: Runs the Next.js 16 application on port **38479**, hosts the REST API, serves video streams with byte-range support, executes the multi-core Python scanner (`scanner.py`), runs the background thumbnail and sneak-peek daemon (`preview_generator.py`), and exposes Prisma Studio on port **5555** on demand.
2. **`redis` (`media_gallery_redis`)**: Redis 7 Alpine caching metadata, managing preview generation queues, and storing WebP preview blobs with an LRU memory cap.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| **VLC/MX-Style Player** | Centered playback controls, auto-hiding overlays, buffering spinners, double-click fullscreen, and keyboard shortcuts (`Space`/`K` play/pause, `←`/`→` 5s seek, `↑`/`↓` volume, `F` fullscreen, `M` mute). |
| **HTTP 206 Streaming** | Native HTTP partial content byte-range streaming for instant video seeking and minimal network overhead. |
| **Multi-Format Previewer** | Responsive bottom sheet drawer supporting photos (zoom/pan/rotate), videos, high-fidelity audio with interactive waveforms and speed controls, and documents. |
| **Python Multi-Core Indexer** | `ProcessPoolExecutor` multiprocessing scanner traverses hundreds of thousands of files across drives in seconds, streaming real-time directory progress directly to the UI. |
| **Background Preview Daemon** | Background daemon generating WebP thumbnails and desktop hover sneak-peeks with low CPU priority (`nice +10`), utilizing FFmpeg and Pillow. |
| **Prisma Database Studio** | Visual database browser embedded in the Settings page; starts and stops on demand on port `5555` to inspect SQLite tables inside Docker. |
| **Backup & Auto-Healing Hub** | Sub-50ms `.tar.gz` compressed metadata backup, pre-restore automatic rollback snapshots, and parallel drive remapping queue when migrating drives or computers. |
| **Per-User Library Privacy** | Better-Auth authentication isolating library folders per user, with role-based access control (`admin` vs `user`). |
| **System & Security Audit Logs** | Real-time tracking of sign-in events, user modifications, media streaming activity, client IPs, and device user-agents. |
| **Offline PWA Support** | Self-contained static fallback page (`public/offline.html`), service worker caching, dynamic web manifest, and LAN IP discovery. |
| **Custom Views & Grouping** | Five view modes (Small Cards, Big Cards, Detailed Cards, List, Detailed List), dynamic grouping (Folder, Type, Date), and multi-criteria sorting. |

---

## 💻 System Prerequisites

Before setting up, ensure your system meets the following requirements:

### For Docker Deployment (Recommended)
- **Operating System**: Windows 10/11 (with WSL2 enabled), macOS, or any modern Linux distribution (Ubuntu, Debian, Fedora, Arch, etc.).
- **Docker**:
  - Windows / macOS: [Docker Desktop](https://www.docker.com/products/docker-desktop/) (ensure the WSL2 backend is enabled on Windows).
  - Linux: [Docker Engine](https://docs.docker.com/engine/install/) and the [Docker Compose Plugin](https://docs.docker.com/compose/install/).
- **Hardware**:
  - Minimum: 2 CPU cores, 2 GB available RAM.
  - Recommended: 4+ CPU cores, 4 GB available RAM (especially for multi-core video preview generation and large library indexing).

### For Local Development (Without Docker)
- [Bun](https://bun.sh/) 1.2+ installed (`curl -fsSL https://bun.sh/install | bash` or `powershell -c "irm bun.sh/install.ps1 | iex"`).
- [Python](https://www.python.org/) 3.10+ with `pillow` and `ffmpeg` installed on the system PATH.
- [Redis](https://redis.io/) server running locally on port 6379.

---

## 🚀 Step-by-Step Docker Setup & Running

Follow these steps to configure and launch Server Gallery using Docker.

### Step 1: Clone the Repository

Open your terminal or command prompt and clone the repository:

```bash
git clone https://github.com/ajmalshahabudeen/media-gallery.git
cd media-gallery
```

---

### Step 2: Environment Configuration

Create or inspect your local `.env` file in the project root:

```env
# Database file location (inside the container volume)
DATABASE_URL="file:/app/prisma_db/dev.db"

# Better-Auth Secret (generate a secure random 32-character string)
BETTER_AUTH_SECRET=CwYFhm1l4L4Vb30mm4SgTSf558hAd8ZV

# External drive or folder shortcut (optional)
# HOST_MEDIA_PATH=D:\Media
```

> [!TIP]
> You can leave `BETTER_AUTH_SECRET` as the default for local offline use, or generate your own unique key with `openssl rand -base64 32`.

---

### Step 3: Drive & Storage Mount Configuration

Because Docker containers run inside an isolated Linux virtual environment, the application **cannot access your files** unless you mount your host drives into the container.

Open `docker-compose.yml` and locate the `volumes:` section under the `web` service:

```yaml
    volumes:
      - db_data:/app/prisma_db
      - ${HOST_MEDIA_PATH:-./}:/host_media
      - C:\:/host_drives/c
      - F:\:/host_drives/f
```

#### 🪟 Windows Configuration & Crucial Drive Letter Rules

1. **Check Your Available Drive Letters**:
   Open Windows File Explorer and check which drives exist on your PC (e.g. `C:\`, `D:\`, `E:\`).
2. **Mount Only Existing Drives**:
   > [!CAUTION]
   > **Docker Desktop Requirement**: Docker Desktop on Windows will crash or refuse to start the container if you specify a drive letter that does not physically exist on your machine (e.g., trying to mount `F:\` when you do not have an `F:` drive).
   >
   > If you only have `C:\` and `D:\`, update `docker-compose.yml` accordingly:
   > ```yaml
   >     volumes:
   >       - db_data:/app/prisma_db
   >       - ${HOST_MEDIA_PATH:-./}:/host_media
   >       - C:\:/host_drives/c
   >       - D:\:/host_drives/d
   >       # - F:\:/host_drives/f  <-- Comment out or remove drive letters you do not have!
   > ```
3. **Mounting External Hard Drives or USB Sticks**:
   If you plug in an external drive that mounts as `E:\`, add it to the list:
   ```yaml
         - E:\:/host_drives/e
   ```
4. **Docker Desktop File Sharing Setting**:
   In Docker Desktop, navigate to **Settings** ➔ **Resources** ➔ **File Sharing** (or **WSL Integration**) and make sure the drives you want to share are checked and permitted.

#### 🐧 Linux Configuration

On Linux, mount your media directories or external drive mount points:

```yaml
    volumes:
      - db_data:/app/prisma_db
      - /home/username/Videos:/host_media
      - /mnt/storage:/host_drives/storage:ro
      - /media/username/MyExternalDrive:/host_drives/external:ro
```

#### 🍎 macOS Configuration

On macOS, bind-mount your user media directories:

```yaml
    volumes:
      - db_data:/app/prisma_db
      - /Users/username/Pictures:/host_media
      - /Volumes/ExternalSSD:/host_drives/external
```

---

### Step 4: Launching the Application

You can launch Server Gallery either using our automated 1-click launch scripts or via standard Docker commands.

#### Option A: 1-Click Launch Scripts (Recommended)

- **On Windows**:
  Double-click `run.bat` or run it from Command Prompt / PowerShell:
  ```cmd
  run.bat
  ```
  *What `run.bat` does automatically:*
  1. Checks if Docker CLI is installed.
  2. Verifies that the Docker daemon / Docker Desktop is running.
  3. Checks for container status and code updates.
  4. Automatically builds images and starts containers (`docker compose up -d --build`).
  5. Recovers and clears stale cache if a build error is detected.
  6. Verifies container health and opens `http://localhost:38479` in your default browser.

- **On Linux / macOS**:
  Make `run.sh` executable and execute it:
  ```bash
  chmod +x run.sh
  ./run.sh
  ```

#### Option B: Standard Docker Compose Commands

You can run standard Docker CLI commands from the project root:

```bash
# Build images and start all containers in the background
docker compose up -d --build

# Stop all running containers
docker compose down

# Stop containers and clean up volumes (WARNING: removes database and caches)
# docker compose down -v
```

---

### Step 5: Verifying Health & Viewing Logs

Check that both the application and Redis services are healthy:

```bash
docker compose ps
```

*Expected Output:*
```text
NAME                  IMAGE                COMMAND                  SERVICE   CREATED         STATUS                   PORTS
media_gallery_app     media-gallery-web    "/app/docker-entrypo…"   web       1 minute ago    Up 1 minute (healthy)    0.0.0.0:5555->5555/tcp, 0.0.0.0:38479->38479/tcp
media_gallery_redis   redis:7-alpine       "docker-entrypoint.s…"   redis     1 minute ago    Up 1 minute (healthy)    0.0.0.0:6379->6379/tcp
```

To view live container logs:

```bash
# Stream Next.js, Python scanner, and preview generator logs
docker compose logs -f web

# Stream Redis logs
docker compose logs -f redis
```

Open your browser and navigate to:
👉 **`http://localhost:38479`** (or `http://YOUR_LAN_IP:38479` from any device on your Wi-Fi).

---

## 👤 First-Time Walkthrough & User Setup

### 1. Create Your Account

1. Open `http://localhost:38479` in your browser.
2. You will be greeted with the authentication screen. Click **Sign Up**.
3. Enter your Name, Email, and a Password, then submit the form.

---

### 2. Promote Account to Administrator

To access admin features (User Management and Security Audit Logs), promote your account to the `admin` role. Because the SQLite database is stored inside an isolated Docker volume (`db_data:/app/prisma_db`), run the built-in CLI command on your host terminal:

```bash
# In Docker (Recommended):
docker exec -it media_gallery_app bun run scripts/make-admin.ts your-email@example.com
```

*Example Output:*
```text
[SUCCESS] Granted administrator role to John Doe (your-email@example.com).
```

Log out and log back in (or refresh the page). The **Users** (`/dashboard/users`) and **System Logs** (`/dashboard/logs`) navigation links will now appear in your sidebar.

---

### 3. Add Media Library Folders in Settings

1. Navigate to **Settings** (`/dashboard/settings`) in the sidebar.
2. Locate the **Add Media Library Folder** card.
3. Enter your folder path.

#### How Path Resolution Works (Windows, Linux, Docker)
You don't need to manually calculate Docker paths! The internal path translation engine (`scripts/scanner.py` and `lib/server-utils.ts`) automatically bridges host paths:

- **Windows Native Paths**: You can enter your native Windows path directly!
  - `C:\Users\YourName\Pictures`
  - `D:\Movies`
  - `F:\Videos\GoPro`
  *The app automatically maps `C:\...` to `/host_drives/c/...`, `D:\...` to `/host_drives/d/...`, and `F:\...` to `/host_drives/f/...`.*
- **Docker Mount Shortcut**:
  - `/host_media` (points to the directory specified in `HOST_MEDIA_PATH` or `./`).
- **Linux / macOS Mounts**:
  - `/host_drives/storage` or `/host_media`.

4. Provide an optional friendly label (e.g. "Family Photos" or "External Hard Drive") and click **Add Media Folder**.
5. The system initiates the real-time Python scanner. An **Indexing Progress Banner** appears at the top of the dashboard displaying:
   - Live count of indexed files and discovered folders.
   - The active path currently being indexed.
   - Live status spinner.

---

## 💡 Feature Guides

### VLC/MX-Style Video Player & Media Drawer

Clicking any video file opens an immersive, VLC-inspired playback drawer designed for smooth desktop and mobile streaming:
- **Instant Seeking**: Uses HTTP 206 partial content streaming so you can jump to any timestamp in a multi-gigabyte video without downloading the whole file.
- **Keyboard Shortcuts**:
  - `Space` or `K`: Play / Pause
  - `←` / `→`: Skip backward / forward by 5 seconds
  - `↑` / `↓`: Increase / decrease volume by 10%
  - `M`: Mute / Unmute
  - `F`: Toggle full-screen mode
- **Mobile Friendly**: Touch-optimized swipe gestures, auto-hiding navigation bars, and background playback protection.

---

### Background Preview & Thumbnail Daemon

When files are indexed, preview tasks are pushed to a Redis queue. A low-priority background worker (`scripts/preview_generator.py`) running inside the container processes tasks asynchronously:
- **WebP Thumbnails**: Generates lightweight, crisp WebP thumbnails for all image and video formats using FFmpeg and Pillow.
- **Desktop Hover Sneak-Peeks**: On desktop screens with fine mouse pointers, hovering over a video card displays an animated 8-frame WebP preview clip.
- **CPU Throttling**: The daemon runs with `os.nice(10)` and batch delays, ensuring server responsiveness is never compromised during heavy indexing.

---

### Integrated Prisma Database Studio

Server Gallery includes a built-in controller for **Prisma Studio** — a visual GUI for browsing and editing SQLite database records.

1. Go to **Settings** (`/dashboard/settings`).
2. Scroll to the **Prisma Database Studio** card.
3. Click **Start Prisma Studio**.
4. The application spawns Prisma Studio on port **5555** inside the container.
5. Click **Open Studio** or browse to:
   👉 **`http://localhost:5555`** (or `http://YOUR_LAN_IP:5555`).
6. When finished, click **Stop Prisma Studio** to free container resources.

---

### Backup & Restore Hub with Auto-Healing

Under **Settings** ➔ **Backup & Restore Hub**, you can export and import complete database snapshots:
- **Zero-Dependency Compressed Archive**: Exports users, media folders, favorites, accounts, and system logs into a lightweight `.tar.gz` archive (< 100 KB) in under 50 milliseconds (physical media files remain on your drives untouched).
- **Drive Auto-Healing & Remapping**: If you restore a backup on a different PC or if your drive letter changed (e.g. from `F:\` to `D:\`), the auto-healing engine runs a 16-worker parallel queue that probes connected drives and suggests verified remappings.
- **Pre-Restore Rollback Snapshot**: Every restore operation automatically creates a safety snapshot (`dev.db.pre-restore.<timestamp>.bak`) with 1-click instant rollback.

---

### PWA & Local Network (LAN) Streaming

Server Gallery is designed to be accessible by any device on your local Wi-Fi.

1. **Find Your Host Computer's Local IP**:
   - On Windows: Run `ipconfig` in Command Prompt and find your **IPv4 Address** (e.g. `192.168.1.101`).
   - On Linux/macOS: Run `hostname -I` or `ip a`.
2. **Open In Mobile Browser**:
   Navigate to `http://192.168.1.101:38479` from your phone or tablet.

#### Installing as a Standalone PWA over Local HTTP (Chrome / Android / PC)
Modern Chromium browsers require HTTPS for PWA installation unless the local IP is whitelisted as secure:
1. On your device, open Chrome and navigate to:
   `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Enable the flag and paste your server's URL (e.g. `http://192.168.1.101:38479`).
3. Relaunch Chrome.
4. Open the gallery and tap **Install App** (or the browser menu ➔ **Add to Home Screen**) to install Server Gallery as a native, full-screen app.

> [!TIP]
> The **Settings** page (`/dashboard/settings`) includes a **PWA Mobile & LAN Setup Guide** card with 1-click copy buttons for the exact flag and URL.

---

## 📱 Companion Mobile App

A companion native mobile application built with **React Native / Expo** is available in the `mobile/` directory:
- Includes native video playback (`expo-video`), audio controls, image viewer with pinch-to-zoom, and offline-first state management via Zustand.
- Connects directly to your Server Gallery instance using LAN discovery or manual IP entry.

To run the mobile app locally:

```bash
cd mobile
bun install
bun start
```

---

## 🛠 Local Development Without Docker

If you prefer to develop or run Server Gallery directly on your host machine without Docker:

1. **Install Dependencies**:
   ```bash
   bun install
   ```
2. **Start Redis**:
   Ensure Redis is running locally on `127.0.0.1:6379`.
3. **Initialize Database**:
   ```bash
   bun run db:push
   ```
4. **Start Development Server**:
   ```bash
   bun run dev
   ```
   The development server starts at `http://localhost:3000` (or `http://localhost:38479` if configured).

5. **Linting and Testing**:
   ```bash
   # Run ESLint
   bun run lint

   # Run automated unit test suites
   bun test

   # Run Next.js production build test
   bun run build
   ```

---

## ⚙️ Ports, Volumes & Environment Variables

### Network Ports

| Port | Service | Description |
| :--- | :--- | :--- |
| **`38479`** | `web` | Next.js 16 web application, REST APIs, and media streaming endpoint. |
| **`5555`** | `web` | Prisma Studio visual database manager (accessible when started from Settings). |
| **`6379`** | `redis` | Redis 7 Alpine caching and task queue. |

### Docker Volumes

| Volume Name | Container Path | Purpose |
| :--- | :--- | :--- |
| **`db_data`** | `/app/prisma_db` | Persists the SQLite database (`dev.db`), ensuring user accounts and metadata survive container updates. |
| **`redis_data`** | `/data` | Persists Redis key-value cache and preview queue data. |

### Environment Variables (`.env`)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `38479` | Port for the Next.js server inside the container. |
| `HOSTNAME` | `0.0.0.0` | Host interface binding for container networking. |
| `DATABASE_URL` | `file:/app/prisma_db/dev.db` | SQLite connection string for Prisma ORM. |
| `REDIS_URL` | `redis://redis:6379` | Redis connection URL. |
| `BETTER_AUTH_SECRET` | *(auto-generated)* | 32+ character key for encrypting auth sessions and cookies. |
| `BETTER_AUTH_URL` | `http://localhost:38479` | Base application URL for Better-Auth trusted origins. |
| `HOST_MEDIA_PATH` | `./` | Host directory shortcut bind-mounted to `/host_media`. |

---

## ❓ Troubleshooting & FAQs

### 1. Docker Error: `mkdir F:\: The system cannot find the path specified`
- **Cause**: On Windows, Docker Desktop throws this error when `docker-compose.yml` specifies a drive letter that does not physically exist on your machine.
- **Solution**: Open `docker-compose.yml`, locate the `volumes:` section of `web`, and remove or comment out any drive letters (like `F:\:/host_drives/f`) that your PC does not have.

### 2. "Unable to access server from my phone or another PC on Wi-Fi"
- **Cause**: Windows Firewall or host firewall blocking inbound traffic on port 38479.
- **Solution**: Open PowerShell as **Administrator** on the host machine and run:
  ```powershell
  New-NetFirewallRule -DisplayName "Server Gallery (38479)" -Direction Inbound -LocalPort 38479 -Protocol TCP -Action Allow
  ```
  Ensure your phone and server are connected to the same local Wi-Fi / subnet.

### 3. "Normal build failed. Clearing corrupted build cache..."
- **Cause**: Stale Docker layer cache or interrupted compilation.
- **Solution**: Both `run.bat` and `run.sh` will automatically attempt to prune the cache and rebuild. You can also manually purge the build cache with:
  ```bash
  docker builder prune -a -f
  docker compose build --no-cache
  docker compose up -d
  ```

### 4. "Videos or photos won't load in the gallery"
- **Cause**: The folder configured in Settings is not properly mounted into the Docker container.
- **Solution**: Verify that the host folder's drive is listed under `volumes:` in `docker-compose.yml`. For example, if your files are in `D:\FamilyVideos`, ensure `- D:\:/host_drives/d` is in `docker-compose.yml`, then rescan in Settings.

### 5. "How do I reset or clear the Redis cache?"
- Navigate to **Settings** (`/dashboard/settings`), find **Cache & Performance Settings**, and click **Purge & Refresh Redis Cache**.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE). Built for home server enthusiasts and self-hosters.
