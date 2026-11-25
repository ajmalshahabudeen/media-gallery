# lib/

Shared server and utility modules for the Next.js web application.

## Key Saved Media Module

- `saved-media.ts` — Database-only virtual save folder helpers (`ensureDefaultSaveFolder`, `getSavedStateForUser`, `quickSaveToDefaultFolder`, `toggleMediaInSaveFolder`, `setMediaSaveFolders`, `unsaveMedia`) backed by Prisma (`SaveFolder`, `SavedMedia`, `SavedMediaFolder`) with `"Main Save"` default folder and zero filesystem writes.
