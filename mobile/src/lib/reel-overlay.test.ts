import { expect, test } from "bun:test";

test("Reels keeps metadata and controls without the bottom dimming overlay", async () => {
  const source = await Bun.file(
    new URL("../components/preview/ReelItem.tsx", import.meta.url)
  ).text();

  expect(source).not.toContain("bottomGradient");
  expect(source).toContain("style={styles.meta}");
  expect(source).toContain("style={styles.actionRail}");
  expect(source).toContain("<ReelSeekBar");
});

test("Reels uses native expo-video caching without mid-playback replaceAsync hot-swaps", async () => {
  const reelSource = await Bun.file(
    new URL("../components/preview/ReelItem.tsx", import.meta.url)
  ).text();
  const feedSource = await Bun.file(
    new URL("../components/preview/ReelsFeed.tsx", import.meta.url)
  ).text();

  expect(reelSource).toContain("useCaching");
  expect(reelSource).toContain("&full=1");
  expect(reelSource).toContain("toleranceBefore");
  expect(reelSource).toContain("toleranceAfter");
  expect(reelSource).toContain("}, [player]);");
  expect(reelSource).not.toContain("[player, onProgress");
  expect(reelSource).not.toContain("replaceAsync");
  expect(reelSource).not.toContain("ReelCacheManager");
  expect(feedSource).not.toContain("ReelCacheManager");
});

test("ReelItem renders Save bookmark below ArrowUpRight with press and long-press handlers", async () => {
  const reelSource = await Bun.file(
    new URL("../components/preview/ReelItem.tsx", import.meta.url)
  ).text();
  const arrowIdx = reelSource.indexOf("<ArrowUpRight");
  const bookmarkIdx = reelSource.indexOf("<Bookmark");

  expect(arrowIdx).toBeGreaterThan(-1);
  expect(bookmarkIdx).toBeGreaterThan(arrowIdx);
  expect(reelSource).toContain("onPressSave");
  expect(reelSource).toContain("onLongPressSave");
});
