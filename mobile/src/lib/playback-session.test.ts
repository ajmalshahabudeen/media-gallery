import { afterEach, expect, test } from "bun:test";
import * as playback from "./playback-session";

afterEach(() => playback.setPlaybackSession(null));

test("fullscreen returns its final position to the current URI, not an old player callback", () => {
  playback.setPlaybackSession({
    items: [{ uri: "a", title: "A" }, { uri: "b", title: "B" }],
    index: 1, startAt: 0, muted: false, rate: 1,
  });
  playback.finishPlaybackSession(42, 1);
  expect(playback.getPlaybackSession()).toBeNull();
  expect(playback.takePlaybackResume("a")).toBeNull();
  expect(playback.takePlaybackResume("b")).toEqual({ uri: "b", position: 42 });
  expect(playback.takePlaybackResume("b")).toBeNull();
});
