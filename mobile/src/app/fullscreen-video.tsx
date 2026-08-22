import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  BackHandler,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  LayoutChangeEvent,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Minimize,
  Volume2,
  VolumeX,
  ChevronLeft,
} from "lucide-react-native";

import { useVideoPlayer, VideoView } from "expo-video";

let ScreenOrientation: any = null;
try {
  ScreenOrientation = require("expo-screen-orientation");
} catch {
  // not available
}

const DOUBLE_TAP_MS = 300;
const ZONE_LEFT = 0.35;
const ZONE_RIGHT = 0.65;
const SCRUB_DX_THRESHOLD = 14;
const SCRUB_AXIS_RATIO = 1.15;

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  }
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

function formatSignedSeconds(delta: number): string {
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

/* ---------- Custom Seek Bar Component ---------- */
interface SeekBarProps {
  position: number;
  duration: number;
  onSeekStart: () => void;
  onSeekEnd: (value: number) => void;
}

const SeekBar: React.FC<SeekBarProps> = ({ position, duration, onSeekStart, onSeekEnd }) => {
  const barWidth = useRef(0);
  const seekingValue = useRef<number | null>(null);
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (seekingValue.current === null) {
      setDisplayProgress(duration > 0 ? position / duration : 0);
    }
  }, [position, duration]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        onSeekStart();
        const locationX = evt.nativeEvent.locationX;
        const ratio = Math.max(0, Math.min(1, locationX / Math.max(1, barWidth.current)));
        seekingValue.current = ratio * duration;
        setDisplayProgress(ratio);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const locationX = evt.nativeEvent.locationX;
        const ratio = Math.max(0, Math.min(1, locationX / Math.max(1, barWidth.current)));
        seekingValue.current = ratio * duration;
        setDisplayProgress(ratio);
      },
      onPanResponderRelease: () => {
        if (seekingValue.current !== null) {
          onSeekEnd(seekingValue.current);
        }
        seekingValue.current = null;
      },
      onPanResponderTerminate: () => {
        seekingValue.current = null;
      },
    })
  ).current;

  const handleLayout = (e: LayoutChangeEvent) => {
    barWidth.current = e.nativeEvent.layout.width;
  };

  const progressPercent = `${Math.max(0, Math.min(100, displayProgress * 100))}%`;

  return (
    <View
      style={seekStyles.container}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      <View style={seekStyles.track}>
        <View style={[seekStyles.trackFill, { width: progressPercent as any }]} />
      </View>
      <View style={[seekStyles.thumb, { left: progressPercent as any }]} />
    </View>
  );
};

const seekStyles = StyleSheet.create({
  container: {
    flex: 1,
    height: 40,
    justifyContent: "center",
    paddingVertical: 12,
  },
  track: {
    height: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
    overflow: "hidden",
  },
  trackFill: {
    height: "100%",
    backgroundColor: "#818cf8",
    borderRadius: 3,
  },
  thumb: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#a5b4fc",
    marginLeft: -9,
    top: 11,
    elevation: 3,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
});

/* ---------- Fullscreen Video Screen ---------- */
export default function FullscreenVideoScreen() {
  const params = useLocalSearchParams<{ uri: string; title?: string }>();
  const router = useRouter();
  const uri = params.uri || "";
  const title = params.title || "Video";

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showSkipHint, setShowSkipHint] = useState<"back" | "fwd" | null>(null);
  const [scrubOverlay, setScrubOverlay] = useState<{
    delta: number;
    target: number;
  } | null>(null);

  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avVideoRef = useRef<any>(null);
  const durationPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const skipHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenDims = Dimensions.get("screen");

  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const isSeekingRef = useRef(false);
  const containerWidthRef = useRef(screenDims.width);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  const scrubActiveRef = useRef(false);
  const scrubStartPosRef = useRef(0);
  const scrubTargetRef = useRef(0);
  const grantXRef = useRef(0);

  const expoPlayer = useVideoPlayer(uri, (player: any) => {
    player.loop = false;
    player.play();
  });

  useEffect(() => {
    if (expoPlayer && uri) {
      const swap = async () => {
        try {
          if (typeof expoPlayer.replaceAsync === "function") {
            await expoPlayer.replaceAsync(uri);
          } else {
            expoPlayer.replace(uri);
          }
          expoPlayer.play();
        } catch {
          // ignore
        }
      };
      void swap();
    }
  }, [expoPlayer, uri]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);
  useEffect(() => {
    isSeekingRef.current = isSeeking;
  }, [isSeeking]);

  // Lock to landscape on mount, restore on unmount
  useEffect(() => {
    if (ScreenOrientation) {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      ).catch(() => {});
    }
    return () => {
      if (ScreenOrientation) {
        ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP
        ).catch(() => {});
      }
    };
  }, []);

  const handleExit = useCallback(() => {
    if (expoPlayer) {
      try {
        expoPlayer.pause();
      } catch {
        // ignore
      }
    }
    router.back();
  }, [expoPlayer, router]);

  // Hardware back button exits fullscreen
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      handleExit();
      return true;
    });
    return () => backHandler.remove();
  }, [handleExit]);

  // Poll for duration
  useEffect(() => {
    if (expoPlayer) {
      durationPollRef.current = setInterval(() => {
        try {
          const d = expoPlayer.duration;
          if (d && d > 0 && isFinite(d)) {
            setDuration(d);
            if (durationPollRef.current) {
              clearInterval(durationPollRef.current);
              durationPollRef.current = null;
            }
          }
        } catch {
          // player might be disposed
        }
      }, 250);

      return () => {
        if (durationPollRef.current) {
          clearInterval(durationPollRef.current);
          durationPollRef.current = null;
        }
      };
    }
  }, [expoPlayer]);

  // expo-video event listeners
  useEffect(() => {
    if (expoPlayer) {
      const timeSub = expoPlayer.addListener("timeUpdate", (event: any) => {
        if (!isSeekingRef.current) {
          setPosition(event.currentTime || 0);
        }
        const d = event.duration || expoPlayer.duration;
        if (d && d > 0 && isFinite(d)) {
          setDuration(d);
        }
        setIsLoading(false);
      });
      const statusSub = expoPlayer.addListener("statusChange", (status: any) => {
        const statusStr = typeof status === "string" ? status : status?.status;
        if (statusStr === "readyToPlay") {
          setIsLoading(false);
          try {
            const d = expoPlayer.duration;
            if (d && d > 0 && isFinite(d)) {
              setDuration(d);
            }
          } catch {
            // ignore
          }
        }
      });
      const playingSub = expoPlayer.addListener("playingChange", (event: any) => {
        setIsPlaying(event.isPlaying);
      });

      return () => {
        timeSub?.remove();
        statusSub?.remove();
        playingSub?.remove();
      };
    }
  }, [expoPlayer]);

  // Auto-hide controls
  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [showControls, isPlaying]);

  useEffect(() => {
    return () => {
      if (skipHintTimer.current) clearTimeout(skipHintTimer.current);
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
    };
  }, []);

  const resetHideTimer = useCallback(() => {
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (isPlaying && showControls) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  }, [isPlaying, showControls]);

  const flashSkipHint = useCallback((dir: "back" | "fwd") => {
    setShowSkipHint(dir);
    if (skipHintTimer.current) clearTimeout(skipHintTimer.current);
    skipHintTimer.current = setTimeout(() => setShowSkipHint(null), 600);
  }, []);

  const seekAbsolute = useCallback(
    (value: number) => {
      const d = durationRef.current;
      const next = d > 0 ? Math.max(0, Math.min(d, value)) : Math.max(0, value);
      if (expoPlayer) {
        try {
          expoPlayer.currentTime = next;
        } catch {
          // ignore
        }
      } else if (avVideoRef.current) {
        avVideoRef.current.setPositionAsync?.(next * 1000);
      }
      setPosition(next);
      positionRef.current = next;
    },
    [expoPlayer]
  );

  const handlePlayPause = useCallback(() => {
    if (expoPlayer) {
      if (expoPlayer.playing) {
        expoPlayer.pause();
      } else {
        expoPlayer.play();
      }
    } else if (avVideoRef.current) {
      if (isPlaying) {
        avVideoRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        avVideoRef.current.playAsync();
        setIsPlaying(true);
      }
    }
    resetHideTimer();
  }, [expoPlayer, isPlaying, resetHideTimer]);

  const handleSkip = useCallback(
    (seconds: number) => {
      if (expoPlayer) {
        try {
          if (typeof expoPlayer.seekBy === "function") {
            expoPlayer.seekBy(seconds);
          } else {
            const d = expoPlayer.duration || durationRef.current || 0;
            const cur = expoPlayer.currentTime || positionRef.current || 0;
            expoPlayer.currentTime =
              d > 0 ? Math.max(0, Math.min(d, cur + seconds)) : Math.max(0, cur + seconds);
          }
          const cur = expoPlayer.currentTime;
          if (typeof cur === "number") {
            setPosition(cur);
            positionRef.current = cur;
          }
        } catch {
          // ignore
        }
      } else if (avVideoRef.current) {
        avVideoRef.current.getStatusAsync().then((status: any) => {
          if (status.isLoaded) {
            const newPos = Math.max(
              0,
              Math.min(status.durationMillis, status.positionMillis + seconds * 1000)
            );
            avVideoRef.current.setPositionAsync(newPos);
            setPosition(newPos / 1000);
          }
        });
      }
      flashSkipHint(seconds < 0 ? "back" : "fwd");
      resetHideTimer();
    },
    [expoPlayer, flashSkipHint, resetHideTimer]
  );

  const handleMuteToggle = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (expoPlayer) {
      expoPlayer.muted = next;
    } else if (avVideoRef.current) {
      avVideoRef.current.setIsMutedAsync(next);
    }
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
    isSeekingRef.current = true;
  };

  const handleSeekComplete = (value: number) => {
    seekAbsolute(value);
    setIsSeeking(false);
    isSeekingRef.current = false;
    resetHideTimer();
  };

  const handleSurfaceTap = useCallback(
    (x: number) => {
      const width = containerWidthRef.current || 1;
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
          handleSkip(-10);
          return;
        }
        if (zone === "right") {
          handleSkip(10);
          return;
        }
        handlePlayPause();
        return;
      }

      lastTapRef.current = { time: now, x };
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
      singleTapTimer.current = setTimeout(() => {
        if (lastTapRef.current && lastTapRef.current.time === now) {
          lastTapRef.current = null;
          setShowControls((prev) => !prev);
        }
        singleTapTimer.current = null;
      }, DOUBLE_TAP_MS);
    },
    [handlePlayPause, handleSkip]
  );

  const seekAbsoluteRef = useRef(seekAbsolute);
  const handleSurfaceTapRef = useRef(handleSurfaceTap);
  const resetHideTimerRef = useRef(resetHideTimer);
  useEffect(() => {
    seekAbsoluteRef.current = seekAbsolute;
    handleSurfaceTapRef.current = handleSurfaceTap;
    resetHideTimerRef.current = resetHideTimer;
  }, [seekAbsolute, handleSurfaceTap, resetHideTimer]);

  const stablePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g: PanResponderGestureState) => {
        return (
          Math.abs(g.dx) > SCRUB_DX_THRESHOLD &&
          Math.abs(g.dx) > Math.abs(g.dy) * SCRUB_AXIS_RATIO
        );
      },
      onPanResponderTerminationRequest: () => !scrubActiveRef.current,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        scrubActiveRef.current = false;
        scrubStartPosRef.current = positionRef.current;
        scrubTargetRef.current = positionRef.current;
        grantXRef.current = e.nativeEvent.locationX ?? 0;
      },
      onPanResponderMove: (_e, g: PanResponderGestureState) => {
        const horizontal =
          Math.abs(g.dx) > SCRUB_DX_THRESHOLD &&
          Math.abs(g.dx) > Math.abs(g.dy) * SCRUB_AXIS_RATIO;
        if (!horizontal && !scrubActiveRef.current) return;

        const width = Math.max(1, containerWidthRef.current);
        const d = durationRef.current;
        const windowSec = d > 0 ? d : 30;
        const delta = (g.dx / width) * windowSec;
        const target =
          d > 0
            ? Math.max(0, Math.min(d, scrubStartPosRef.current + delta))
            : Math.max(0, scrubStartPosRef.current + delta);

        if (!scrubActiveRef.current) {
          scrubActiveRef.current = true;
          if (singleTapTimer.current) {
            clearTimeout(singleTapTimer.current);
            singleTapTimer.current = null;
          }
          lastTapRef.current = null;
          setIsSeeking(true);
          isSeekingRef.current = true;
          // Keep controls as-is — mounting overlay mid-gesture can cancel the pan
        }

        scrubTargetRef.current = target;
        setPosition(target);
        setScrubOverlay({ delta: target - scrubStartPosRef.current, target });
      },
      onPanResponderRelease: (e: GestureResponderEvent) => {
        if (scrubActiveRef.current) {
          const target = scrubTargetRef.current;
          scrubActiveRef.current = false;
          setScrubOverlay(null);
          seekAbsoluteRef.current(target);
          setIsSeeking(false);
          isSeekingRef.current = false;
          resetHideTimerRef.current();
          return;
        }
        const x = e.nativeEvent.locationX ?? grantXRef.current;
        handleSurfaceTapRef.current(x);
      },
      onPanResponderTerminate: () => {
        if (scrubActiveRef.current) {
          scrubActiveRef.current = false;
          setScrubOverlay(null);
          seekAbsoluteRef.current(scrubTargetRef.current);
          setIsSeeking(false);
          isSeekingRef.current = false;
        }
      },
    })
  ).current;

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) containerWidthRef.current = w;
      }}
    >
      <StatusBar hidden />

      {/* Video Layer */}
      <VideoView
        style={[styles.video, { width: screenDims.width, height: screenDims.height }]}
        player={expoPlayer}
        contentFit="contain"
        nativeControls={false}
        pointerEvents="none"
      />

      {/* Loading Spinner */}
      {isLoading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#818cf8" />
        </View>
      )}

      {/* Gesture surface: double-tap ±10s, drag L/R scrub (VLC) */}
      <View style={styles.gestureLayer} {...stablePan.panHandlers} />

      {showSkipHint ? (
        <View
          style={[
            styles.skipHint,
            showSkipHint === "back" ? { left: 32 } : { right: 32 },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.skipHintText}>
            {showSkipHint === "back" ? "−10s" : "+10s"}
          </Text>
        </View>
      ) : null}

      {scrubOverlay ? (
        <View style={styles.scrubHud} pointerEvents="none">
          <Text style={styles.scrubDelta}>{formatSignedSeconds(scrubOverlay.delta)}</Text>
          <Text style={styles.scrubTarget}>
            {formatTime(scrubOverlay.target)}
            {duration > 0 ? ` / ${formatTime(duration)}` : ""}
          </Text>
        </View>
      ) : null}

      {/* Controls Overlay */}
      {showControls && (
        <View style={styles.controlsOverlay} pointerEvents="box-none">
          {/* Top bar */}
          <View style={styles.topBar} pointerEvents="box-none">
            <TouchableOpacity style={styles.exitBtn} onPress={handleExit}>
              <ChevronLeft size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.topTitle} numberOfLines={1}>
              {title}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Center playback controls */}
          <View style={styles.centerControls} pointerEvents="box-none">
            <TouchableOpacity style={styles.controlCircleSmall} onPress={() => handleSkip(-10)}>
              <RotateCcw size={22} color="#ffffff" />
              <Text style={styles.skipTag}>-10s</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlCircleLarge} onPress={handlePlayPause}>
              {isPlaying ? (
                <Pause size={34} color="#ffffff" fill="#ffffff" />
              ) : (
                <Play size={34} color="#ffffff" fill="#ffffff" style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlCircleSmall} onPress={() => handleSkip(10)}>
              <RotateCw size={22} color="#ffffff" />
              <Text style={styles.skipTag}>+10s</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom bar with seek slider */}
          <View style={styles.bottomBar}>
            <Text style={styles.timerText}>{formatTime(position)}</Text>

            <SeekBar
              position={position}
              duration={duration}
              onSeekStart={handleSeekStart}
              onSeekEnd={handleSeekComplete}
            />

            <Text style={styles.timerText}>{formatTime(duration)}</Text>

            <TouchableOpacity style={styles.barIconBtn} onPress={handleMuteToggle}>
              {isMuted ? (
                <VolumeX size={20} color="#f43f5e" />
              ) : (
                <Volume2 size={20} color="#ffffff" />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.barIconBtn} onPress={handleExit}>
              <Minimize size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  gestureLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 4,
  },
  skipHint: {
    position: "absolute",
    top: "42%",
    zIndex: 30,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  skipHintText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  scrubHud: {
    position: "absolute",
    top: "36%",
    alignSelf: "center",
    zIndex: 30,
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(129, 140, 248, 0.45)",
    alignItems: "center",
    minWidth: 140,
  },
  scrubDelta: {
    color: "#c7d2fe",
    fontSize: 26,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  scrubTarget: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },
  controlsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "space-between",
    zIndex: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  exitBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  topTitle: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginHorizontal: 12,
  },
  centerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
  },
  controlCircleSmall: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  controlCircleLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#4f46e5",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  skipTag: {
    color: "#cbd5e1",
    fontSize: 9,
    fontWeight: "700",
    marginTop: 1,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  timerText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    minWidth: 42,
  },
  barIconBtn: {
    padding: 6,
  },
});
