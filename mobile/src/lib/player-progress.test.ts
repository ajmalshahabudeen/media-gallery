import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const playerSources = [
  ["inline video", "../components/preview/VideoPlayerView.tsx"],
  ["fullscreen video", "../app/fullscreen-video.tsx"],
  ["audio preview", "../components/preview/AudioPlayerView.tsx"],
  ["Reels", "../components/preview/ReelItem.tsx"],
] as const;

// Exercise the actual SDK setup callbacks without loading React Native in Bun.
// Expo defaults timeUpdateEventInterval to 0, which disables timeUpdate events.
function loadPlayerSetup(relativePath: string) {
  const url = new URL(relativePath, import.meta.url);
  const source = ts.createSourceFile(
    url.pathname,
    readFileSync(url, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  let setup: ts.ArrowFunction | undefined;

  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "useVideoPlayer"
    ) {
      const callback = node.arguments[1];
      if (callback && ts.isArrowFunction(callback)) setup = callback;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!setup) throw new Error(`Missing useVideoPlayer setup in ${relativePath}`);

  const { outputText } = ts.transpileModule(`(${setup.getText(source)});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  });
  return runInNewContext(outputText, { initialSession: null, isMuted: false });
}

describe("Expo player progress events", () => {
  test.each(playerSources)("%s enables regular playback time updates", (_name, path) => {
    const player = {
      timeUpdateEventInterval: 0,
      loop: false,
      muted: false,
      volume: 1,
      playbackRate: 1,
      play() {},
    };

    loadPlayerSetup(path)(player);

    expect(Number.isFinite(player.timeUpdateEventInterval)).toBe(true);
    expect(player.timeUpdateEventInterval).toBeGreaterThan(0);
    expect(player.timeUpdateEventInterval).toBeLessThanOrEqual(1);
  });
});
