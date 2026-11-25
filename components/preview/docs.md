# components/preview/

Web media preview, gallery grid, and Reels components (using shadcn UI).

## Reels & Saved Components

- `ReelItem.tsx` — Vertical Reel player slide with like, mute, gallery preview (`ArrowUpRight`), and Save (`Bookmark`) action rail buttons (click to quick-save/pick folders, hold or right-click to open `/dashboard/saved`).
- `ReelsFeed.tsx` — Vertical snap Reels feed (`All` / `Favorites` or scoped folder playback) with Save toast banner and folder picker dialog.
- `SaveFolderDialog.tsx` — Shadcn UI `Dialog` and `SaveToastBanner` for managing virtual database save folders (`Main Save` + custom folders) and creating new folders inline.
