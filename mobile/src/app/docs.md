# mobile/src/app/

Expo Router entry routes and root navigation layouts for the mobile app.

## Files

- `_layout.tsx` — Root layout configuring `SafeAreaProvider`, `GestureHandlerRootView`, `AppLockGate`, `RootErrorBoundary`, splashscreen bootstrap, and cleanup of any legacy `reels/` cache directory on startup.
- `index.tsx` — Initial auth redirect route (`/(tabs)` vs `/(auth)/sign-in`).
- `fullscreen-video.tsx` — Dedicated landscape-capable fullscreen video screen using `expo-video` and `YoutubePlayerOverlay`.
- `(auth)/` — Authentication screens (`sign-in`, `sign-up`).
- `(tabs)/` — Bottom tab screens (`index`, `reels`, `favorites`, `settings`, `admin`).
