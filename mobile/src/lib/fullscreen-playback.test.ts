import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Execute the real component with native rendering/navigation replaced by a
// small lifecycle harness. No device or React Native runtime is needed.
function mountInline(fullscreen = false) {
  let session: unknown = fullscreen ? {} : null;
  const focusEffects: Array<() => void | (() => void)> = [];
  const effects: Array<() => void | (() => void)> = [];
  const listeners = new Map<string, (event: { isPlaying: boolean }) => void>();
  const player = {
    playing: false, muted: false, currentTime: 12, duration: 100,
    play() { this.playing = true; },
    pause() { this.playing = false; },
    addListener(name: string, callback: (event: { isPlaying: boolean }) => void) {
      listeners.set(name, callback);
      return { remove() { listeners.delete(name); } };
    },
  };
  const react = {
    useState: (value: unknown) => [value, () => {}],
    useRef: (value: unknown) => ({ current: value }),
    useCallback: (callback: unknown) => callback,
    useEffect: (effect: () => void) => effects.push(effect),
    createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({ type, props, children }),
  };
  const modules: Record<string, unknown> = {
    react,
    "react-native": {
      View: "View", StyleSheet: { create: (styles: unknown) => styles },
      Dimensions: { get: () => ({ width: 400 }), addEventListener: () => ({ remove() {} }) },
      PanResponder: { create: () => ({ panHandlers: {} }) },
    },
    "expo-router": {
      useRouter: () => ({ push() {} }),
      useFocusEffect: (effect: () => void) => focusEffects.push(effect),
    },
    "expo-video": { useVideoPlayer: (_uri: string, setup: (p: typeof player) => void) => { setup(player); return player; }, VideoView: "VideoView" },
    "./youtube-player-overlay": { YoutubePlayerOverlay: "Overlay", nextPlaybackRate: () => 1 },
    "../../lib/playback-session": {
      getPlaybackSession: () => session,
      setPlaybackSession: (value: unknown) => { session = value; },
      shouldIgnoreLandscapeOpen: () => !!session,
      takePlaybackResume: () => null,
    },
  };
  const source = readFileSync(new URL("../components/preview/VideoPlayerView.tsx", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const exports: Record<string, (props: unknown) => unknown> = {};
  runInNewContext(outputText, {
    exports, require: (name: string) => {
      if (!(name in modules)) throw new Error(`Unexpected import ${name}`);
      return modules[name];
    },
    setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
  });
  exports.VideoPlayerView({ uri: "video-a" });
  return { player, focusEffects, effects, listeners };
}

describe("inline/fullscreen playback ownership", () => {
  test("a hidden inline remount never autoplays while fullscreen owns playback", () => {
    const { player } = mountInline(true);
    expect(player.playing).toBe(false);
  });

  test("inline playback starts on focus and stops on blur", () => {
    const { player, focusEffects } = mountInline();
    expect(focusEffects.length).toBe(1);
    const blur = focusEffects[0]();
    expect(player.playing).toBe(true);
    if (typeof blur === "function") blur();
    expect(player.playing).toBe(false);
  });

  test("a focus callback cannot start inline playback during fullscreen handoff", () => {
    const { player, focusEffects } = mountInline(true);
    for (const effect of focusEffects) effect();
    expect(player.playing).toBe(false);
  });

  test("a late native playing event is stopped after the inline screen blurs", () => {
    const { player, focusEffects, effects, listeners } = mountInline();
    for (const effect of effects) effect();
    const blur = focusEffects[0]();
    if (typeof blur === "function") blur();
    player.playing = true;
    listeners.get("playingChange")?.({ isPlaying: true });
    expect(player.playing).toBe(false);
  });
});
