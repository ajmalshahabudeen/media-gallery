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
import { useMobileStore, type MediaFile } from "../../store/useMobileStore";
import { buildMediaFileUrl } from "../../lib/api";
import { ReelCacheManager } from "../../lib/cache";

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

function ReelSeekBar({
  progress,
  seeking,
  onSeekStart,
  onSeekAt,
  onSeekEnd,
}: {
  progress: number;
  seeking: boolean;
  onSeekStart: () => void;
  onSeekAt: (ratio: number) => void;
  onSeekEnd: (ratio: number) => void;
}) {
  const barRef = useRef<View>(null);
  const widthRef = useRef(1);
  const originXRef = useRef(0);
  const lastRatio = useRef(progress);
  const pct = `${Math.max(0, Math.min(100, progress * 100))}%` as const;

  const measureBar = () => {
    barRef.current?.measureInWindow((x, _y, w) => {
      originXRef.current = x;
      if (w > 1) widthRef.current = w;
    });
  };

  const ratioFromEvent = (e: GestureResponderEvent) => {
    const pageX = e.nativeEvent.pageX;
    if (Number.isFinite(pageX)) {
      return Math.max(0, Math.min(1, (pageX - originXRef.current) / Math.max(1, widthRef.current)));
    }
    return Math.max(0, Math.min(1, e.nativeEvent.locationX / Math.max(1, widthRef.current)));
  };

  return (
    <View
      ref={barRef}
      collapsable={false}
      style={styles.seekHit}
      onLayout={(e) => {
        widthRef.current = Math.max(1, e.nativeEvent.layout.width);
        measureBar();
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => {
        measureBar();
        const ratio = ratioFromEvent(e);
        lastRatio.current = ratio;
        onSeekStart();
        onSeekAt(ratio);
      }}
      onResponderMove={(e) => {
        const ratio = ratioFromEvent(e);
        lastRatio.current = ratio;
        onSeekAt(ratio);
      }}
      onResponderRelease={() => onSeekEnd(lastRatio.current)}
      onResponderTerminate={() => onSeekEnd(lastRatio.current)}
    >
      <View pointerEvents="none" style={[styles.progressTrack, seeking && styles.progressTrackActive]}>
        <View pointerEvents="none" style={[styles.progressFill, { width: pct }]} />
      </View>
      {seeking ? <View pointerEvents="none" style={[styles.seekThumb, { left: pct }]} /> : null}
    </View>
  );
}

/** Active-only expo-video host (hooks run only when mounted). */
function ActiveExpoVideo({
  initialUri,
  activeUri,
  isMuted,
  onProgress,
  onPlayingChange,
  onBufferingChange,
  onError,
  playerRef,
}: {
  initialUri: string;
  activeUri: string;
  isMuted: boolean;
  onProgress: (current: number, duration: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onBufferingChange: (buffering: boolean) => void;
  onError?: (error: any) => void;
  playerRef: React.MutableRefObject<any>;
}) {
  // Use stable initialUri so useVideoPlayer NEVER destroys/recreates the native player instance on re-renders
  const initialUriRef = useRef(initialUri);
  const player = useVideoPlayer(initialUriRef.current, (p: any) => {
    p.loop = true;
    // Expo disables timeUpdate events until a positive interval is set (seconds).
    p.timeUpdateEventInterval = 0.25;
    p.muted = isMuted;
    try {
      p.seekTolerance = { before: 0.5, after: 0.5 };
    } catch {
      // ignore
    }
    p.play();
  });

  const currentUriRef = useRef(initialUri);
  const lastTimeRef = useRef(0);

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

  // Seamless source swap (Stream <-> Cache) without rebuilding native player
  useEffect(() => {
    if (player && activeUri && activeUri !== currentUriRef.current) {
      const lastTime = player.currentTime || lastTimeRef.current || 0;
      currentUriRef.current = activeUri;
      try {
        if (typeof player.replaceAsync === "function") {
          player
            .replaceAsync(activeUri)
            .then(() => {
              if (lastTime > 0.2) {
                try {
                  player.currentTime = lastTime;
                } catch {}
              }
              player.play();
            })
            .catch((err: any) => {
              console.warn("[ActiveExpoVideo] replaceAsync error:", err);
            });
        } else if (typeof player.replace === "function") {
          player.replace(activeUri);
          if (lastTime > 0.2) {
            try {
              player.currentTime = lastTime;
            } catch {}
          }
          player.play();
        }
      } catch (err) {
        console.warn("[ActiveExpoVideo] Source replacement error:", err);
      }
    }
  }, [player, activeUri]);

  useEffect(() => {
    // Check immediate status on mount/ready
    if (player.status === "readyToPlay" || player.playing) {
      onBufferingChange(false);
    } else if (player.status === "loading") {
      onBufferingChange(true);
    }
    if (player.playing) {
      onPlayingChange(true);
    }

    try {
      player.play();
    } catch {
      // ignore
    }

    const timeSub = player.addListener?.("timeUpdate", (event: any) => {
      const cur = event.currentTime ?? player.currentTime ?? 0;
      const d = event.duration ?? player.duration ?? 0;
      lastTimeRef.current = cur;
      onProgress(cur, d);
      // If time is advancing or player is playing, definitely playing and not buffering
      if (player.playing || cur > 0) {
        onPlayingChange(true);
        onBufferingChange(false);
      }
    });

    const playingSub = player.addListener?.("playingChange", (payload: any) => {
      const playing = typeof payload === "boolean" ? payload : !!payload?.isPlaying;
      onPlayingChange(playing);
      // When playing is true, buffering MUST be false
      if (playing) {
        onBufferingChange(false);
      }
    });

    const statusSub = player.addListener?.("statusChange", (status: any) => {
      const s = typeof status === "string" ? status : status?.status;
      if (s === "readyToPlay") {
        onBufferingChange(false);
      } else if (s === "loading") {
        // Only report buffering if NOT actively playing
        if (!player.playing) {
          onBufferingChange(true);
        }
      } else if (s === "error") {
        onBufferingChange(false);
        onError?.(status?.error || new Error("Video playback error"));
      }
    });

    const poll = setInterval(() => {
      try {
        if (player.playing) {
          onPlayingChange(true);
          onBufferingChange(false);
        }
        if (player.duration > 0) {
          const cur = player.currentTime || 0;
          lastTimeRef.current = cur;
          onProgress(cur, player.duration);
          if (cur > 0) {
            onPlayingChange(true);
            onBufferingChange(false);
          }
        }
      } catch {
        // disposed
      }
    }, 300);

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
  }, [player, onProgress, onPlayingChange, onBufferingChange, onError]);

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
  const { sessionToken } = useMobileStore();

  // Always start with streaming directly from the server
  const serverStreamUrl = buildMediaFileUrl(serverUrl, reel.path, sessionToken);
  const [activeVideoUri, setActiveVideoUri] = useState<string>(serverStreamUrl);
  const activeModeRef = useRef<"streaming" | "cached">("streaming");
  const cachedUriRef = useRef<string | null>(null);
  const lastPathRef = useRef(reel.path);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isUserPaused, setIsUserPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSkipHint, setShowSkipHint] = useState<"back" | "fwd" | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);

  const isPlayingRef = useRef(false);
  const isBufferingRef = useRef(false);
  const isSeekingRef = useRef(false);
  const durationRef = useRef(0);
  const lastPlaybackPositionRef = useRef(0);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const expoPlayerRef = useRef<any>(null);
  const avRef = useRef<any>(null);
  const slideWidthRef = useRef(0);
  const heartScale = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep ref in sync
  useEffect(() => {
    isBufferingRef.current = isBuffering;
  }, [isBuffering]);

  // When switching reels, reset to direct server stream
  useEffect(() => {
    if (reel.path !== lastPathRef.current) {
      lastPathRef.current = reel.path;
      activeModeRef.current = "streaming";
      cachedUriRef.current = null;
      lastPlaybackPositionRef.current = 0;
      setIsUserPaused(false);
      setActiveVideoUri(serverStreamUrl);
    }
  }, [reel.path, serverStreamUrl]);

  // Seamless failover: Switch from server stream to local disk cache in millisecond time
  const switchToCache = useCallback(() => {
    const cachedUri = cachedUriRef.current || ReelCacheManager.getInstance().getCachedUri(reel.path);
    if (!cachedUri) return false;
    if (activeModeRef.current === "cached" && activeVideoUri === cachedUri) return false;

    activeModeRef.current = "cached";
    cachedUriRef.current = cachedUri;
    setActiveVideoUri(cachedUri);
    setIsBuffering(false);
    return true;
  }, [reel.path, activeVideoUri]);

  // Seamless fallback: Switch from local disk cache to server stream in millisecond time
  const switchToStream = useCallback(() => {
    if (activeModeRef.current === "streaming" && activeVideoUri === serverStreamUrl) return;

    activeModeRef.current = "streaming";
    setActiveVideoUri(serverStreamUrl);
    setIsBuffering(false);
  }, [activeVideoUri, serverStreamUrl]);

  // Ensure active reel is prioritized for background caching
  useEffect(() => {
    if (isActive && serverUrl) {
      ReelCacheManager.getInstance().prioritizeActiveReel(reel, serverUrl, sessionToken);
    }
  }, [isActive, reel, serverUrl, sessionToken]);

  // Subscribe to cache updates
  useEffect(() => {
    const readyUri = ReelCacheManager.getInstance().getCachedUri(reel.path);
    if (readyUri) {
      cachedUriRef.current = readyUri;
    }

    const unsub = ReelCacheManager.getInstance().subscribe(reel.path, (entry) => {
      if (entry.status === "ready" && !entry.isPartial) {
        cachedUriRef.current = entry.localUri;
        // If stream is currently stalled or buffering, immediately hot-swap to cache!
        if (activeModeRef.current === "streaming" && isBufferingRef.current && !isPlayingRef.current) {
          switchToCache();
        }
      }
    });
    return unsub;
  }, [reel.path, switchToCache]);

  // Stall detector & watchdog:
  // If streaming and buffering persists for > 1200ms, seamlessly hot-swap to cache if ready!
  useEffect(() => {
    if (!isActive) {
      if (stallTimerRef.current) {
        clearTimeout(stallTimerRef.current);
        stallTimerRef.current = null;
      }
      return;
    }

    if (isBuffering && activeModeRef.current === "streaming") {
      stallTimerRef.current = setTimeout(() => {
        if (isBufferingRef.current && !isPlayingRef.current) {
          switchToCache();
        }
      }, 1200);
    } else {
      if (stallTimerRef.current) {
        clearTimeout(stallTimerRef.current);
        stallTimerRef.current = null;
      }
    }

    return () => {
      if (stallTimerRef.current) {
        clearTimeout(stallTimerRef.current);
        stallTimerRef.current = null;
      }
    };
  }, [isBuffering, isActive, switchToCache]);

  // Zero-friction error recovery:
  // If stream fails -> failover to cache.
  // If cache fails -> mark corrupted & fallback to server stream.
  const handlePlayerError = useCallback(
    (err: any) => {
      console.warn(`[ReelItem] Player error (${activeModeRef.current}):`, err?.message || err);
      if (activeModeRef.current === "streaming") {
        const switched = switchToCache();
        if (!switched) {
          // If cache not yet available, retry stream with timestamp
          setTimeout(() => {
            setActiveVideoUri(`${serverStreamUrl}&_retry=${Date.now()}`);
          }, 600);
        }
      } else {
        ReelCacheManager.getInstance().markCorrupted(reel.path);
        cachedUriRef.current = null;
        switchToStream();
      }
    },
    [switchToCache, switchToStream, reel.path, serverStreamUrl]
  );

  const onProgress = useCallback((current: number, dur: number) => {
    if (dur > 0) {
      durationRef.current = dur;
      setDuration(dur);
    }
    if (!isSeekingRef.current) {
      lastPlaybackPositionRef.current = current;
      setCurrentTime(current);
    }
  }, []);

  // Reset progress when leaving
  useEffect(() => {
    if (!isActive) {
      setCurrentTime(0);
      setIsPlaying(false);
      setIsBuffering(false);
      setIsSeeking(false);
      setIsUserPaused(false);
      isPlayingRef.current = false;
      isBufferingRef.current = false;
      isSeekingRef.current = false;
      lastTapRef.current = null;
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current);
        singleTapTimer.current = null;
      }
      if (stallTimerRef.current) {
        clearTimeout(stallTimerRef.current);
        stallTimerRef.current = null;
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

  const seekToRatio = useCallback((ratio: number) => {
    const d = durationRef.current;
    if (!(d > 0) || !Number.isFinite(ratio)) return;
    const next = Math.max(0, Math.min(d, ratio * d));
    const p = expoPlayerRef.current;
    if (p) {
      try {
        ReelCacheManager.getInstance().pauseForSeek(1200);
        p.currentTime = next;
        p.play();
      } catch {
        // ignore
      }
    }
    setCurrentTime(next);
  }, []);

  const handleSeekStart = useCallback(() => {
    isSeekingRef.current = true;
    setIsSeeking(true);
  }, []);

  const handleSeekAt = useCallback((ratio: number) => {
    const d = durationRef.current;
    if (!(d > 0) || !Number.isFinite(ratio)) return;
    setCurrentTime(ratio * d);
  }, []);

  const handleSeekEnd = useCallback(
    (ratio: number) => {
      if (durationRef.current > 0 && Number.isFinite(ratio)) {
        seekToRatio(ratio);
      }
      setTimeout(() => {
        isSeekingRef.current = false;
        setIsSeeking(false);
      }, 150);
    },
    [seekToRatio]
  );

  const togglePlay = useCallback(async () => {
    const p = expoPlayerRef.current;
    if (p) {
      try {
        const currentlyPlaying = p.playing || isPlayingRef.current;
        if (currentlyPlaying) {
          p.pause();
          setIsUserPaused(true);
          setIsPlaying(false);
          isPlayingRef.current = false;
        } else {
          p.play();
          setIsUserPaused(false);
          setIsPlaying(true);
          isPlayingRef.current = true;
        }
        return;
      } catch {
        // fall through
      }
    }
    if (avRef.current) {
      try {
        const status = await avRef.current.getStatusAsync?.();
        if (!status?.isLoaded) return;
        if (status.isPlaying) {
          await avRef.current.pauseAsync?.();
          setIsUserPaused(true);
        } else {
          await avRef.current.playAsync?.();
          setIsUserPaused(false);
        }
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
          initialUri={serverStreamUrl}
          activeUri={activeVideoUri}
          isMuted={isMuted}
          onProgress={onProgress}
          onPlayingChange={(playing) => {
            isPlayingRef.current = playing;
            setIsPlaying(playing);
            if (playing) {
              setIsUserPaused(false);
            }
          }}
          onBufferingChange={setIsBuffering}
          onError={handlePlayerError}
          playerRef={expoPlayerRef}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]} />
      )}

      {isBuffering && !isPlaying && !isSeeking && !isUserPaused && isActive ? (
        <View style={styles.centerOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      ) : null}

      {isUserPaused && isActive ? (
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
          activeOpacity={0.7}
          hitSlop={12}
        >
          <Heart
            size={26}
            color={reel.isFavorite ? "#ef4444" : "#fff"}
            fill={reel.isFavorite ? "#ef4444" : "transparent"}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onToggleMute} activeOpacity={0.7} hitSlop={12}>
          {isMuted ? <VolumeX size={24} color="#fff" /> : <Volume2 size={24} color="#fff" />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onOpenInGallery(reel)}
          activeOpacity={0.7}
          hitSlop={12}
        >
          <ArrowUpRight size={24} color="#fff" />
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

      <ReelSeekBar
        progress={progress}
        seeking={isSeeking}
        onSeekStart={handleSeekStart}
        onSeekAt={handleSeekAt}
        onSeekEnd={handleSeekEnd}
      />
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
    right: 10,
    bottom: 56,
    alignItems: "center",
    gap: 18,
    zIndex: 20,
  },
  actionBtn: {
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
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
  seekHit: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 28,
    justifyContent: "flex-end",
    zIndex: 30,
  },
  progressTrack: {
    height: 2.5,
    backgroundColor: "rgba(255,255,255,0.28)",
    overflow: "hidden",
  },
  progressTrackActive: {
    height: 5,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#fff",
  },
  seekThumb: {
    position: "absolute",
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
    marginLeft: -6,
  },
});
