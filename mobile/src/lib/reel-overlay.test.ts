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
  expect(reelSource).toContain("toleranceBefore");
  expect(reelSource).toContain("toleranceAfter");
  expect(reelSource).not.toContain("replaceAsync");
  expect(reelSource).not.toContain("ReelCacheManager");
  expect(feedSource).not.toContain("ReelCacheManager");
});
