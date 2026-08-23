import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  ChevronLeft,
  SkipBack,
  SkipForward,
} from "lucide-react-native";

export const YT_RED = "#FF0000";

export function formatPlayerTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function formatSignedSeconds(delta: number): string {
  const sign = delta >= 0 ? "+" : "−";
  const abs = Math.abs(delta);
  if (abs >= 3600) {
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    const s = Math.floor(abs % 60);
    return `${sign}${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  }
  const m = Math.floor(abs / 60);
  const s = Math.floor(abs % 60);
  if (m > 0) return `${sign}${m}:${s < 10 ? "0" : ""}${s}`;
  return `${sign}${s}s`;
}

const SPEED_STEPS = [1, 1.25, 1.5, 2] as const;

interface SeekBarProps {
  progress: number;
  seeking: boolean;
  onSeekStart: () => void;
  onSeekAt: (ratio: number) => void;
  onSeekEnd: (ratio: number) => void;
}

function YoutubeSeekBar({ progress, seeking, onSeekStart, onSeekAt, onSeekEnd }: SeekBarProps) {
  const expand = useSharedValue(seeking ? 1 : 0);
  const widthRef = React.useRef(1);
  const lastRatio = React.useRef(progress);

  useEffect(() => {
    expand.value = withTiming(seeking ? 1 : 0, { duration: 140, easing: Easing.out(Easing.quad) });
  }, [expand, seeking]);

  const ratioFromX = (x: number) => Math.max(0, Math.min(1, x / Math.max(1, widthRef.current)));

  const trackStyle = useAnimatedStyle(() => ({
    height: interpolate(expand.value, [0, 1], [2.5, 5]),
    borderRadius: interpolate(expand.value, [0, 1], [1.25, 2.5]),
  }));

  const thumbScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(expand.value, [0, 1], [1, 1.35]) }],
  }));

  const pct = `${Math.max(0, Math.min(100, progress * 100))}%` as const;

  return (
    <View
      style={styles.seekHit}
      onLayout={(e) => {
        widthRef.current = Math.max(1, e.nativeEvent.layout.width);
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => {
        const ratio = ratioFromX(e.nativeEvent.locationX);
        lastRatio.current = ratio;
        onSeekStart();
        onSeekAt(ratio);
      }}
      onResponderMove={(e) => {
        const ratio = ratioFromX(e.nativeEvent.locationX);
        lastRatio.current = ratio;
        onSeekAt(ratio);
      }}
      onResponderRelease={() => onSeekEnd(lastRatio.current)}
      onResponderTerminate={() => onSeekEnd(lastRatio.current)}
    >
      <Animated.View style={[styles.seekTrack, trackStyle]}>
        <View style={[styles.seekFill, { width: pct }]} />
      </Animated.View>
      <Animated.View style={[styles.seekThumb, { left: pct }, thumbScaleStyle]} />
    </View>
  );
}

interface OverlayProps {
  visible: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  isLoading: boolean;
  isSeeking: boolean;
  position: number;
  duration: number;
  playbackRate?: number;
  title?: string;
  fullscreen?: boolean;
  skipHint?: "back" | "fwd" | null;
  scrub?: { delta: number; target: number } | null;
  onPlayPause: () => void;
  onSkip: (seconds: number) => void;
  onMute: () => void;
  onFullscreen?: () => void;
  onBack?: () => void;
  onCycleSpeed?: () => void;
  onPrevVideo?: () => void;
  onNextVideo?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  onSeekStart: () => void;
  onSeekRatio: (ratio: number) => void;
  onSeekEnd: (ratio: number) => void;
  sideHud?: { kind: "volume" | "brightness"; value: number } | null;
  style?: StyleProp<ViewStyle>;
}

export function YoutubePlayerOverlay({
  visible,
  isPlaying,
  isMuted,
  isLoading,
  isSeeking,
  position,
  duration,
  playbackRate = 1,
  title,
  fullscreen,
  skipHint,
  scrub,
  onPlayPause,
  onSkip,
  onMute,
  onFullscreen,
  onBack,
  onCycleSpeed,
  onPrevVideo,
  onNextVideo,
  hasPrev = false,
  hasNext = false,
  onSeekStart,
  onSeekRatio,
  onSeekEnd,
  sideHud = null,
  style,
}: OverlayProps) {
  const chrome = useSharedValue(visible ? 1 : 0);
  const playPop = useSharedValue(1);
  const skipScale = useSharedValue(0);
  const skipOpacity = useSharedValue(0);
  const skipSide = useSharedValue(skipHint === "back" ? -1 : 1);
  const spin = useSharedValue(0);
  const progress = duration > 0 ? position / duration : 0;

  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.linear }), -1, false);
  }, [spin]);

  useEffect(() => {
    chrome.value = withTiming(visible ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [chrome, visible]);

  useEffect(() => {
    playPop.value = withSequence(
      withTiming(0.88, { duration: 70 }),
      withSpring(1, { damping: 12, stiffness: 280 })
    );
  }, [isPlaying, playPop]);

  useEffect(() => {
    if (!skipHint) return;
    skipSide.value = skipHint === "back" ? -1 : 1;
    skipOpacity.value = 1;
    skipScale.value = 0.55;
    skipScale.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    skipOpacity.value = withTiming(0, { duration: 520, easing: Easing.in(Easing.quad) });
  }, [skipHint, skipOpacity, skipScale, skipSide]);

  const chromeStyle = useAnimatedStyle(() => ({
    opacity: chrome.value,
  }));

  const miniStyle = useAnimatedStyle(() => ({
    opacity: interpolate(chrome.value, [0, 1], [1, 0]),
  }));

  const playStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playPop.value }],
  }));

  const skipBurstStyle = useAnimatedStyle(() => ({
    opacity: skipOpacity.value,
    transform: [{ translateX: skipSide.value * -118 }, { scale: skipScale.value }],
  }));

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  const rateLabel =
    playbackRate === 1 ? "1x" : `${playbackRate.toString().replace(/\.0$/, "")}x`;

  return (
    <View pointerEvents="box-none" style={[styles.root, style]}>
      <Animated.View pointerEvents="none" style={[styles.miniBar, miniStyle]}>
        <View style={[styles.miniFill, { width: `${Math.max(0, Math.min(100, progress * 100))}%` }]} />
      </Animated.View>

      <Animated.View
        pointerEvents={visible ? "box-none" : "none"}
        style={[styles.chrome, chromeStyle]}
      >
        <View pointerEvents="none" style={styles.dim} />

        {fullscreen ? (
          <View style={styles.topBar} pointerEvents="box-none">
            <Pressable onPress={onBack} hitSlop={12} style={styles.iconHit}>
              <ChevronLeft size={28} color="#fff" />
            </Pressable>
            <Text style={styles.title} numberOfLines={1}>
              {title || ""}
            </Text>
            <Pressable onPress={onMute} hitSlop={12} style={styles.iconHit}>
              {isMuted ? <VolumeX size={20} color="#fff" /> : <Volume2 size={20} color="#fff" />}
            </Pressable>
          </View>
        ) : (
          <View style={styles.topPad} />
        )}

        <View style={styles.center} pointerEvents="box-none">
          {onPrevVideo ? (
            <Pressable
              onPress={onPrevVideo}
              disabled={!hasPrev}
              style={[styles.trackHit, !hasPrev && styles.trackDisabled]}
            >
              <SkipBack size={fullscreen ? 26 : 22} color="#fff" fill="#fff" />
            </Pressable>
          ) : null}

          <Pressable onPress={() => onSkip(-10)} style={styles.skipHit}>
            <RotateCcw size={fullscreen ? 26 : 22} color="#fff" />
            <Text style={styles.skipCaption}>10</Text>
          </Pressable>

          <Pressable onPress={onPlayPause}>
            <Animated.View style={[styles.playHit, playStyle]}>
              {isPlaying ? (
                <Pause size={fullscreen ? 40 : 34} color="#fff" fill="#fff" />
              ) : (
                <Play
                  size={fullscreen ? 40 : 34}
                  color="#fff"
                  fill="#fff"
                  style={{ marginLeft: 3 }}
                />
              )}
            </Animated.View>
          </Pressable>

          <Pressable onPress={() => onSkip(10)} style={styles.skipHit}>
            <RotateCw size={fullscreen ? 26 : 22} color="#fff" />
            <Text style={styles.skipCaption}>10</Text>
          </Pressable>

          {onNextVideo ? (
            <Pressable
              onPress={onNextVideo}
              disabled={!hasNext}
              style={[styles.trackHit, !hasNext && styles.trackDisabled]}
            >
              <SkipForward size={fullscreen ? 26 : 22} color="#fff" fill="#fff" />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.bottom} pointerEvents="box-none">
          <Text style={styles.time}>
            {formatPlayerTime(position)} / {formatPlayerTime(duration)}
          </Text>
          <YoutubeSeekBar
            progress={isSeeking || duration <= 0 ? progress : progress}
            seeking={isSeeking}
            onSeekStart={onSeekStart}
            onSeekAt={onSeekRatio}
            onSeekEnd={onSeekEnd}
          />
          {onCycleSpeed ? (
            <Pressable onPress={onCycleSpeed} hitSlop={8} style={styles.speedHit}>
              <Text style={styles.speedText}>{rateLabel}</Text>
            </Pressable>
          ) : null}
          {!fullscreen ? (
            <Pressable onPress={onMute} hitSlop={10} style={styles.iconHit}>
              {isMuted ? <VolumeX size={20} color="#fff" /> : <Volume2 size={20} color="#fff" />}
            </Pressable>
          ) : null}
          {fullscreen ? (
            <Pressable onPress={onBack} hitSlop={10} style={styles.iconHit}>
              <Minimize size={22} color="#fff" />
            </Pressable>
          ) : (
            <Pressable onPress={onFullscreen} hitSlop={10} style={styles.iconHit}>
              <Maximize size={20} color="#fff" />
            </Pressable>
          )}
        </View>
      </Animated.View>

      <Animated.View pointerEvents="none" style={[styles.skipBurst, skipBurstStyle]}>
        {skipHint === "back" ? (
          <RotateCcw size={26} color="#fff" />
        ) : (
          <RotateCw size={26} color="#fff" />
        )}
        <Text style={styles.skipBurstText}>10</Text>
      </Animated.View>

      {scrub ? (
        <View style={styles.scrubHud} pointerEvents="none">
          <Text style={styles.scrubDelta}>{formatSignedSeconds(scrub.delta)}</Text>
          <Text style={styles.scrubTarget}>
            {formatPlayerTime(scrub.target)}
            {duration > 0 ? ` / ${formatPlayerTime(duration)}` : ""}
          </Text>
        </View>
      ) : null}

      {sideHud ? (
        <View style={[styles.sideHud, sideHud.kind === "volume" ? styles.sideHudRight : styles.sideHudLeft]} pointerEvents="none">
          <Text style={styles.sideHudLabel}>{sideHud.kind === "volume" ? "Vol" : "Lum"}</Text>
          <View style={styles.sideHudTrack}>
            <View style={[styles.sideHudFill, { height: `${Math.round(sideHud.value * 100)}%` }]} />
          </View>
          <Text style={styles.sideHudPct}>{Math.round(sideHud.value * 100)}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.loading} pointerEvents="none">
          <Animated.View style={[styles.loadingDot, spinStyle]} />
        </View>
      ) : null}
    </View>
  );
}

export function nextPlaybackRate(current: number): number {
  const i = SPEED_STEPS.findIndex((s) => Math.abs(s - current) < 0.01);
  return SPEED_STEPS[(i + 1) % SPEED_STEPS.length];
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
  },
  miniBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 2.5,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  miniFill: {
    height: "100%",
    backgroundColor: YT_RED,
  },
  chrome: {
    ...StyleSheet.absoluteFill,
    justifyContent: "space-between",
  },
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  topPad: {
    height: 12,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 14,
    paddingHorizontal: 8,
    zIndex: 2,
  },
  title: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginHorizontal: 8,
  },
  center: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    zIndex: 2,
  },
  trackHit: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  trackDisabled: {
    opacity: 0.28,
  },
  skipHit: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(0,0,0,0.38)",
    alignItems: "center",
    justifyContent: "center",
  },
  skipCaption: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 1,
  },
  playHit: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(0,0,0,0.42)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 8,
    zIndex: 2,
  },
  time: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  seekHit: {
    flex: 1,
    height: 28,
    justifyContent: "center",
  },
  seekTrack: {
    backgroundColor: "rgba(255,255,255,0.28)",
    overflow: "hidden",
  },
  seekFill: {
    height: "100%",
    backgroundColor: YT_RED,
  },
  seekThumb: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: YT_RED,
    marginLeft: -6,
    top: 8,
  },
  speedHit: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    minWidth: 32,
    alignItems: "center",
  },
  speedText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  iconHit: {
    padding: 6,
  },
  skipBurst: {
    position: "absolute",
    top: "36%",
    alignSelf: "center",
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "rgba(0,0,0,0.42)",
    alignItems: "center",
    justifyContent: "center",
  },
  skipBurstText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    marginTop: 2,
  },
  scrubHud: {
    position: "absolute",
    top: "34%",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.72)",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 120,
  },
  scrubDelta: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  scrubTarget: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  sideHud: {
    position: "absolute",
    top: "28%",
    width: 44,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.62)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 6,
  },
  sideHudLeft: {
    left: 18,
  },
  sideHudRight: {
    right: 18,
  },
  sideHudLabel: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  sideHudTrack: {
    width: 5,
    height: 88,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  sideHudFill: {
    width: "100%",
    backgroundColor: "#fff",
  },
  sideHudPct: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    borderTopColor: "#fff",
  },
});
