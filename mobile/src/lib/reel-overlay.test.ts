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
