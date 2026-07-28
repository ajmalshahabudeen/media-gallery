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

### Option 2: Offline Local Build (Local Gradle Build) 🛠️

Building locally does not require an Expo cloud account, but requires Android Studio, Android SDK, and Java (JDK 17+) installed on your machine.

1. **Generate Native Android Project (Prebuild):**
   ```bash
   bun x expo prebuild --platform android
   ```

2. **Build APK using Gradle:**
   - **On Windows (PowerShell/CMD):**
     ```powershell
     cd android
     .\gradlew.bat assembleRelease
     ```
   - **On Linux/macOS:**
     ```bash
     cd android
     ./gradlew assembleRelease
     ```

3. **Locate & Install APK:**
   - The compiled standalone APK will be created at:
     `android/app/build/outputs/apk/release/app-release.apk`
   - Install on your device via ADB:
     ```bash
     adb install android/app/build/outputs/apk/release/app-release.apk
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
