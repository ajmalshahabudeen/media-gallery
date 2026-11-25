# mobile/src/components/preview/

Media preview and playback components for the mobile Expo app.

## Files

- `ReelItem.tsx` — Vertical reel video slide using `expo-video` (`useVideoPlayer` + `VideoView`) with native `useCaching` playback (auto-fallback to uncached streaming on error), tap/double-tap gestures (play/pause, ±10s skip, heart like), mute toggle, and custom scrub bar (`ReelSeekBar`). Updated to use native `expo-video` caching and valid `{ toleranceBefore, toleranceAfter }` seek tolerance without mid-playback `replaceAsync` source swaps.
- `ReelsFeed.tsx` — Vertical paging `FlatList` for the Reels tab (`All` / `Favorites` filter, shuffle, pagination, viewability-driven active reel playback, and modal gallery preview handoff). Updated to remove custom `ReelCacheManager` feed/scroll hooks.
- `FilePreviewModal.tsx` — Full-screen modal viewer for images, videos, audio, and documents with drag-to-close gesture and YouTube-style Up Next list.
- `VideoPlayerView.tsx` — 16:9 inline video player using `expo-video` and `YoutubePlayerOverlay` with fullscreen handoff.
- `AudioPlayerView.tsx` — Audio player component using `expo-video`.
- `ImageViewerView.tsx` — Zoomable/pannable image viewer.
- `MediaCard.tsx` — Grid/list card renderer for media items and thumbnails.
- `useDragToClose.ts` — Reanimated drag-to-close gesture hook for preview modals.
- `youtube-player-overlay.tsx` — Shared player chrome overlay (seek bar, skip hints, speed toggle, volume/brightness HUD).
