# mobile/src/app/

Expo Router entry routes and root navigation layouts for the mobile app.

## Files

- `_layout.tsx` — Root layout configuring `SafeAreaProvider`, `GestureHandlerRootView`, `AppLockGate`, `RootErrorBoundary`, splashscreen bootstrap, cleanup of any legacy `reels/` cache directory on startup, and Stack registration for `saved` and `fullscreen-video`.
- `index.tsx` — Initial auth redirect route (`/(tabs)` vs `/(auth)/sign-in`).
- `saved.tsx` — Instagram Collections-style Saved screen displaying virtual DB save folders (`All Saved`, `Main Save`, and custom folders) with 2x2 thumbnail collages, folder CRUD modals, 3-column saved reel grid, and folder-scoped vertical Reels playback.
- `fullscreen-video.tsx` — Dedicated landscape-capable fullscreen video screen using `expo-video` and `YoutubePlayerOverlay`.
- `(auth)/` — Authentication screens (`sign-in`, `sign-up`).
- `(tabs)/` — Bottom tab screens (`index`, `reels`, `favorites`, `settings`, `admin`).
