# Server Gallery Mobile

Expo / React Native client for the **Server Gallery** home media server.

- **App name:** Server Gallery  
- **Android package:** `com.mediagallery.mobile`  
- **Scheme:** `servergallery://`  
- **Expo SDK:** 57  
- **Android minSdk:** 24 (Android 7.0+)

## Features

- Video player with seek, skip ±10s, mute, landscape fullscreen
- Audio player with speed control and animated disc
- Image viewer with rotation / zoom
- Gallery parity with web: search, filter, group, favorites, reels
- Configurable LAN server URL (HTTP cleartext allowed for home networks)

---

## "SDK not supported" on a physical phone

This project is **Expo SDK 57**. That message almost always means you opened the project in **Expo Go**, and the Expo Go app on the phone is an **older SDK**.

| Environment | Why it works / fails |
|-------------|----------------------|
| Android emulator | Emulator Expo Go is usually up to date → works |
| Physical phone Expo Go | Play Store Expo Go may lag or be outdated → **SDK not supported** |
| Standalone APK / `expo run:android` | Does **not** use Expo Go → no Expo Go SDK check |

### Fix A — Keep using Expo Go (dev only)
1. Update **Expo Go** from the Play Store on the phone.
2. Or install the SDK 57 build of Expo Go if the store lags.
3. Phone and PC must be on the same Wi‑Fi; use the LAN URL Expo prints.

### Fix B — Install a real app APK (recommended for production)
Standalone APKs bundle their own native runtime. They do **not** depend on Expo Go.

```bash
cd mobile
bun install
eas build --platform android --profile preview
```

Install the downloaded APK (uninstall any old build first).

Local device/emulator build (no Expo Go):

```bash
bun run android
```

---

## Development

```bash
bun install
bun run start
# native build on device/emulator (recommended over Expo Go):
bun run android
```

---

## Build a release APK (EAS)

```bash
bun add -g eas-cli
eas login
eas build --platform android --profile preview
```

```bash
adb install -r path/to/app-release.apk
```

### Local APK (needs Android SDK + JDK 17)

```bash
bun run android:prebuild
cd android
gradlew.bat assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

---

## Device compatibility notes

Current production-oriented settings:

- `minSdkVersion` **24** (Android 7.0+)
- `targetSdkVersion` **34** (Android 14 standard for physical device runtime compatibility like Samsung Galaxy A52)
- `compileSdkVersion` **36** (required by AndroidX 1.18+ libraries)
- **Uncompressed JNI packaging** (`useLegacyPackaging: false`) so native `.so` libraries (`libhermes.so`, `libreactnative.so`) are 16KB/4KB page-aligned and loaded directly by Android 11+ without `UnsatisfiedLinkError` crashes
- **Cleartext HTTP** enabled for LAN media servers
- ABIs: `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64` (phones + emulators)

---

## Project layout

```
mobile/
├── src/app/           # Expo Router screens
├── src/components/    # UI + media preview
├── src/lib/api.ts     # Server URL + session client
├── src/store/         # Zustand store
├── assets/images/     # App icon, adaptive icon, splash
├── app.json           # Expo config (SDK, icons, cleartext, minSdk)
└── eas.json           # EAS Build profiles
```
