import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import {
  Heart,
  Volume2,
  VolumeX,
  Play,
  ArrowUpRight,
} from "lucide-react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import type { MediaFile } from "../../store/useMobileStore";
import { buildMediaFileUrl } from "../../lib/api";

export interface ReelItemData extends MediaFile {
  isFavorite?: boolean;
}

interface Props {
  reel: ReelItemData;
  isActive: boolean;
  isMuted: boolean;
  serverUrl: string;
  height: number;
  onToggleMute: () => void;
  onToggleFavorite: (reel: ReelItemData) => void;
  onOpenInGallery: (reel: ReelItemData) => void;
}

const DOUBLE_TAP_MS = 300;
const ZONE_LEFT = 0.35;
const ZONE_RIGHT = 0.65;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  }
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

/** Active-only expo-video host (hooks run only when mounted). */
function ActiveExpoVideo({
  uri,
  isMuted,
  onProgress,
  onPlayingChange,
  onBufferingChange,
  playerRef,
}: {
  uri: string;
  isMuted: boolean;
  onProgress: (current: number, duration: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onBufferingChange: (buffering: boolean) => void;
  playerRef: React.MutableRefObject<any>;
}) {
  const player = useVideoPlayer(uri, (p: any) => {
    p.loop = true;
    p.muted = isMuted;
    p.play();
  });

  useEffect(() => {
    playerRef.current = player;
    return () => {
      if (playerRef.current === player) playerRef.current = null;
    };
  }, [player, playerRef]);

  useEffect(() => {
    try {
      player.muted = isMuted;
    } catch {
      // ignore
    }
  }, [player, isMuted]);

  useEffect(() => {
    onBufferingChange(true);
    try {
      player.play();
    } catch {
      // ignore
    }

    const timeSub = player.addListener?.("timeUpdate", (event: any) => {
      const cur = event.currentTime || player.currentTime || 0;
      const d = event.duration || player.duration || 0;
      onProgress(cur, d);
      onBufferingChange(false);
    });
    const playingSub = player.addListener?.("playingChange", (payload: any) => {
      const playing = typeof payload === "boolean" ? payload : !!payload?.isPlaying;
      onPlayingChange(playing);
    });
    const statusSub = player.addListener?.("statusChange", (status: any) => {
      const s = typeof status === "string" ? status : status?.status;
      if (s === "readyToPlay") onBufferingChange(false);
      if (s === "loading") onBufferingChange(true);
    });

    const poll = setInterval(() => {
      try {
        if (player.duration > 0) {
          onProgress(player.currentTime || 0, player.duration);
        }
      } catch {
        // disposed
      }
    }, 400);

    return () => {
      timeSub?.remove?.();
      playingSub?.remove?.();
      statusSub?.remove?.();
      clearInterval(poll);
      try {
        player.pause();
      } catch {
        // ignore
      }
    };
  }, [player, onProgress, onPlayingChange, onBufferingChange]);

  return (
    <VideoView
      style={StyleSheet.absoluteFill}
      player={player}
      contentFit="contain"
      nativeControls={false}
      // Let the gesture overlay own all taps (VideoView otherwise eats them)
      pointerEvents="none"
    />
  );
}

export const ReelItem: React.FC<Props> = ({
  reel,
  isActive,
  isMuted,
  serverUrl,
  height,
  onToggleMute,
  onToggleFavorite,
  onOpenInGallery,
}) => {
  const uri = buildMediaFileUrl(serverUrl, reel.path);
  const avRef = useRef<any>(null);
  const expoPlayerRef = useRef<any>(null);
  const slideWidthRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSkipHint, setShowSkipHint] = useState<"back" | "fwd" | null>(null);
  const heartScale = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onProgress = useCallback((current: number, dur: number) => {
    setCurrentTime(current);
    if (dur > 0) setDuration(dur);
  }, []);

  // Reset progress when leaving
  useEffect(() => {
    if (!isActive) {
      setCurrentTime(0);
      setIsPlaying(false);
      setIsBuffering(false);
      lastTapRef.current = null;
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current);
        singleTapTimer.current = null;
      }
    }
  }, [isActive]);

  useEffect(() => {
    return () => {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
    };
  }, []);

  const burstHeart = useCallback(() => {
    heartScale.setValue(0.3);
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.15,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 0,
        duration: 350,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [heartScale]);

  const seekBy = useCallback(
    async (delta: number) => {
      setShowSkipHint(delta < 0 ? "back" : "fwd");
      setTimeout(() => setShowSkipHint(null), 600);

      const p = expoPlayerRef.current;
      if (p) {
        try {
          const d = p.duration || 0;
          const cur = p.currentTime || 0;
          const next =
            d > 0 ? Math.max(0, Math.min(d, cur + delta)) : Math.max(0, cur + delta);
          // Prefer seekBy when available; fall back to absolute currentTime
          if (typeof p.seekBy === "function") {
            p.seekBy(delta);
          } else {
            p.currentTime = next;
          }
          onProgress(typeof p.currentTime === "number" ? p.currentTime : next, d || 0);
          return;
        } catch {
          // fall through
        }
      }

      if (avRef.current) {
        try {
          const status = await avRef.current.getStatusAsync?.();
          if (!status?.isLoaded) return;
          const cur = (status.positionMillis || 0) / 1000;
          const d = (status.durationMillis || 0) / 1000;
          const next = Math.max(0, Math.min(d || Infinity, cur + delta));
          await avRef.current.setPositionAsync?.(next * 1000);
          onProgress(next, d || 0);
        } catch {
          // ignore
        }
      }
    },
    [onProgress]
  );

  const togglePlay = useCallback(async () => {
    const p = expoPlayerRef.current;
    if (p) {
      try {
        if (p.playing) p.pause();
        else p.play();
        return;
      } catch {
        // fall through
      }
    }
    if (avRef.current) {
      try {
        const status = await avRef.current.getStatusAsync?.();
        if (!status?.isLoaded) return;
        if (status.isPlaying) await avRef.current.pauseAsync?.();
        else await avRef.current.playAsync?.();
      } catch {
        // ignore
      }
    }
  }, []);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) slideWidthRef.current = w;
  };

  /**
   * Web-parity gestures:
   * - single tap → play/pause
   * - double-tap left 35% → −10s
   * - double-tap right 35% → +10s
   * - double-tap center → like + heart burst
   */
  const handlePress = (evt: GestureResponderEvent) => {
    const x = evt.nativeEvent.locationX ?? 0;
    const width = slideWidthRef.current || 1;
    const now = Date.now();
    const last = lastTapRef.current;

    if (last && now - last.time < DOUBLE_TAP_MS) {
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current);
        singleTapTimer.current = null;
      }
      lastTapRef.current = null;

      const zone =
        x < width * ZONE_LEFT ? "left" : x > width * ZONE_RIGHT ? "right" : "center";

      if (zone === "left") {
        void seekBy(-10);
        return;
      }
      if (zone === "right") {
        void seekBy(10);
        return;
      }
      // Center double-tap → like (Instagram style)
      if (!reel.isFavorite) onToggleFavorite(reel);
      burstHeart();
      return;
    }

    lastTapRef.current = { time: now, x };
    if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
    singleTapTimer.current = setTimeout(() => {
      if (lastTapRef.current && lastTapRef.current.time === now) {
        lastTapRef.current = null;
        void togglePlay();
      }
      singleTapTimer.current = null;
    }, DOUBLE_TAP_MS);
  };

  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  return (
    <View style={[styles.slide, { height }]} onLayout={handleLayout}>
      {/* Video layer (non-interactive) */}
      {isActive ? (
        <ActiveExpoVideo
          uri={uri}
          isMuted={isMuted}
          onProgress={onProgress}
          onPlayingChange={setIsPlaying}
          onBufferingChange={setIsBuffering}
          playerRef={expoPlayerRef}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]} />
      )}

      <View pointerEvents="none" style={styles.topGradient} />
      <View pointerEvents="none" style={styles.bottomGradient} />

      {isBuffering && isActive ? (
        <View style={styles.centerOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      ) : null}

      {!isPlaying && !isBuffering && isActive ? (
        <View style={styles.centerOverlay} pointerEvents="none">
          <View style={styles.playBadge}>
            <Play size={40} color="#fff" fill="#fff" />
          </View>
        </View>
      ) : null}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.heartBurst,
          { transform: [{ scale: heartScale }], opacity: heartScale },
        ]}
      >
        <Heart size={110} color="#fff" fill="#fff" />
      </Animated.View>

      {showSkipHint ? (
        <View
          style={[
            styles.skipHint,
            showSkipHint === "back" ? { left: 24 } : { right: 24 },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.skipHintText}>
            {showSkipHint === "back" ? "−10s" : "+10s"}
          </Text>
        </View>
      ) : null}

      {/* Full-bleed gesture surface ABOVE video so double-tap always works */}
      <Pressable
        style={styles.gestureLayer}
        onPress={handlePress}
        // Don't steal vertical FlatList swipes — Pressable only claims taps
      />

      <View style={styles.actionRail} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            onToggleFavorite(reel);
            if (!reel.isFavorite) burstHeart();
          }}
          activeOpacity={0.75}
        >
          <View style={styles.actionCircle}>
            <Heart
              size={28}
              color={reel.isFavorite ? "#ef4444" : "#fff"}
              fill={reel.isFavorite ? "#ef4444" : "transparent"}
            />
          </View>
          <Text style={styles.actionLabel}>{reel.isFavorite ? "Liked" : "Like"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onToggleMute} activeOpacity={0.75}>
          <View style={styles.actionCircle}>
            {isMuted ? <VolumeX size={24} color="#fff" /> : <Volume2 size={24} color="#fff" />}
          </View>
          <Text style={styles.actionLabel}>{isMuted ? "Sound" : "Mute"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onOpenInGallery(reel)}
          activeOpacity={0.75}
        >
          <View style={styles.actionCircle}>
            <ArrowUpRight size={24} color="#fff" />
          </View>
          <Text style={styles.actionLabel}>Open</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.meta} pointerEvents="none">
        <Text style={styles.title} numberOfLines={2}>
          {reel.name}
        </Text>
        {reel.folder ? (
          <Text style={styles.folder} numberOfLines={1}>
            {reel.folder}
          </Text>
        ) : null}
        {duration > 0 ? (
          <Text style={styles.time}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Text>
        ) : null}
      </View>

      <View style={styles.progressTrack} pointerEvents="none">
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  slide: {
    width: "100%",
    backgroundColor: "#000",
    overflow: "hidden",
  },
  placeholder: {
    backgroundColor: "#000",
  },
  gestureLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 5,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 5,
  },
  centerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 6,
  },
  playBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  heartBurst: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 12,
  },
  skipHint: {
    position: "absolute",
    top: "45%",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    zIndex: 12,
  },
  skipHintText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  actionRail: {
    position: "absolute",
    right: 12,
    bottom: 120,
    alignItems: "center",
    gap: 18,
    zIndex: 20,
  },
  actionBtn: {
    alignItems: "center",
    gap: 4,
  },
  actionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  meta: {
    position: "absolute",
    left: 16,
    right: 72,
    bottom: 48,
    zIndex: 15,
  },
  title: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  folder: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 4,
  },
  time: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    marginTop: 6,
    fontVariant: ["tabular-nums"],
  },
  progressTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    zIndex: 25,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#fff",
  },
});
