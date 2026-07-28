# Media Gallery Mobile App 📱

React Native / Expo mobile client for Media Gallery server.

## Features

- 🎬 **Video Player**: Full native controls, custom drag-to-seek bar, time length display, skip ±10s, mute, and landscape fullscreen mode.
- 🎵 **Audio Player**: Disc animation, playback speed options (0.75x - 2.0x), custom seek bar, time display.
- 🖼️ **Image Viewer**: High quality image viewer with 90° rotation and zoom options.
- 📁 **Gallery & Parity**: Search, filtering, grouping by folder/type/date, and favorite system.
- ⚙️ **Server Discovery**: Configurable local server IP connection.

---

## Getting Started

### Prerequisites

Ensure you have [Bun](https://bun.sh) installed.

### 1. Install Dependencies

```bash
bun install
```

### 2. Start Development Server

```bash
bun run dev
```

Or for Android:

```bash
bun run android --clear
```

---

## Building and Installing APK

### Option 1: Online Cloud Build (EAS Build - Recommended) ☁️

Building via EAS Cloud requires an Expo account, but does not require local Android SDK or Java installation.

1. **Install EAS CLI:**
   ```bash
   bun add -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Build Android APK:**
   ```bash
   eas build --platform android --profile preview
   ```

4. **Install on Device:**
   - Once the cloud build completes, download the generated `.apk` file directly on your Android phone or scan the QR code.
   - Or install via ADB:
     ```bash
     adb install <path-to-downloaded-apk>
     ```

---

### Option 2: Docker Containerized Offline Build (Recommended) 🐳

Building via Docker requires no local Java or Android SDK installation. The build runs inside an isolated, feature-complete Android builder container (`mobile-android-builder`), exports the APK directly to your host workspace (`build/app-release.apk`), and automatically destroys the build container when finished (`--rm`).

#### Automated 1-Click Command:
```bash
bun run android:offline:build
```
*(Runs `./scripts/build-android-offline.sh`, which builds the `mobile-android-builder` Docker image with JDK 17 & Android SDK 35, compiles `app-release.apk`, exports it locally, and auto-removes the container)*

#### Manual Docker Build Steps:

1. **Build Builder Image:**
   ```bash
   docker build -t mobile-android-builder:latest -f Dockerfile.android .
   ```

2. **Run Build Container & Export APK:**
   ```bash
   docker run --rm -v "%cd%:/app" mobile-android-builder:latest bash /app/scripts/container-build-apk.sh
   ```

3. **Locate & Install APK:**
   - Exported APK location: `build/app-release.apk`
   - Install via ADB:
     ```bash
     adb install build/app-release.apk
     ```

---

## Project Structure

```
mobile/
├── src/
│   ├── app/                 # Expo Router file-based screens
│   │   ├── (auth)/          # Sign In & Sign Up routes
│   │   ├── (tabs)/          # Floating pill tab bar screens (Gallery, Favorites, Settings, Admin)
│   │   ├── fullscreen-video.tsx # Landscape fullscreen video screen
│   │   └── _layout.tsx      # Root Navigation Stack
│   ├── components/          # App UI components & preview viewers
│   │   └── preview/         # VideoPlayerView, AudioPlayerView, ImageViewerView, FilePreviewModal
│   ├── lib/                 # API client & helpers
│   └── store/               # Mobile Zustand global store
├── app.json                 # Expo configuration (Package ID: com.mediagallery.mobile)
└── eas.json                 # EAS build configuration
```
