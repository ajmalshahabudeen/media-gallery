# mobile/src/lib/

Mobile client utilities, API/auth helpers, playback state helpers, and Bun unit tests.

## Files

- `api.ts` — Server URL & Better-Auth session token persistence, `apiFetch`, `pingServer`, and media/thumbnail URL builders.
- `app-lock.ts` — Biometric/device app-lock utilities.
- `auth-session.ts` / `auth-session.test.ts` — Session token helpers and tests.
- `folder-filter.ts` — Client-side folder filtering helper for media lists.
- `groupMedia.ts` — Media grouping/sorting helpers.
- `network-scan.ts` — LAN subnet discovery helper for locating the media server.
- `playback-session.ts` / `playback-session.test.ts` — Shared inline-to-fullscreen playback handoff state and tests.
- `fullscreen-playback.test.ts` — Unit tests for fullscreen video playback behavior.
- `player-progress.test.ts` — AST/VM tests verifying `timeUpdateEventInterval` setup across `expo-video` players.
- `reel-overlay.test.ts` — Source-level regression tests for `ReelItem` overlay, native `useCaching`, `seekTolerance`, and absence of `replaceAsync` / `ReelCacheManager`.
- `saved-login.ts` — Saved credential helper for sign-in convenience.
- `upload-form.ts` / `upload-form.test.ts` — Upload form validation helpers and tests.
- `upload-media.ts` — Multipart media upload helper.

*(Legacy `cache.ts` / `ReelCacheManager` was removed in favor of `expo-video` native `useCaching`.)*
