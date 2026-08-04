# Server Gallery Mobile

Expo / React Native client for the **Server Gallery** home media server.

- **App name:** Server Gallery  
- **Android package:** `com.mediagallery.mobile`  
- **Scheme:** `servergallery://`

## Features

- Video player with seek, skip ±10s, mute, landscape fullscreen
- Audio player with speed control and animated disc
- Image viewer with rotation / zoom
- Gallery parity with web: search, filter, group, favorites
- Configurable LAN server URL (HTTP cleartext allowed for home networks)

---

## Development

```bash
bun install
bun run start
# or device/emulator:
bun run android
```

---

## Build a release APK (EAS — recommended)

No local Android SDK required.

```bash
bun add -g eas-cli
eas login
eas build --platform android --profile preview
```

Install the downloaded APK on your phone, or:

```bash
adb install path/to/server-gallery.apk
```

### Local APK (optional, needs Android SDK + JDK 17)

```bash
bun run android:prebuild
cd android
./gradlew assembleRelease   # Windows: gradlew.bat assembleRelease
```

APK output:

`android/app/build/outputs/apk/release/app-release.apk`

---

## Why release APKs used to crash

Production builds differed from Expo Go / dev client in several ways this repo now hardens:

1. **Cleartext HTTP** — LAN URLs like `http://192.168.x.x:38479` were only allowed in *debug* manifests. Release now sets `usesCleartextTraffic` via `expo-build-properties`.
2. **Navigation before mount** — auth redirects wait for `useRootNavigationState()`.
3. **Splash / bootstrap** — root layout always mounts the navigator, hides splash safely, and never blocks forever if the server is offline.
4. **Cold start without session** — skips network auth when no token is stored so the sign-in screen opens offline.
5. **Branding** — display name/icon/splash are **Server Gallery** (not generic `mobile`).

---

## Project layout

```
mobile/
├── src/app/           # Expo Router screens
├── src/components/    # UI + media preview
├── src/lib/api.ts     # Server URL + session client
├── src/store/         # Zustand store
├── assets/images/     # App icon, adaptive icon, splash
├── app.json           # Expo config (name, icons, cleartext)
└── eas.json           # EAS Build profiles
```
