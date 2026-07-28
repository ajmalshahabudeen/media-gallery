import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
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

let ScreenOrientation: any = null;
try {
  ScreenOrientation = require("expo-screen-orientation");
} catch {
  // not available
}

let ExpoVideoModule: any = null;
try {
  ExpoVideoModule = require("expo-video");
} catch {
  // expo-video missing
}

let ExpoAvVideo: any = null;
let ExpoAvResizeMode: any = null;
try {
  const av = require("expo-av");
  ExpoAvVideo = av.Video;
  ExpoAvResizeMode = av.ResizeMode;
} catch {
  // expo-av missing
}

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
        const ratio = Math.max(0, Math.min(1, locationX / barWidth.current));
        seekingValue.current = ratio * duration;
        setDisplayProgress(ratio);
      },
      onPanResponderMove: (evt: GestureResponderEvent, _gestureState: PanResponderGestureState) => {
        const locationX = evt.nativeEvent.locationX;
        const ratio = Math.max(0, Math.min(1, locationX / barWidth.current));
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

  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avVideoRef = useRef<any>(null);
  const durationPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const screenDims = Dimensions.get("screen");

  // expo-video player
  let expoPlayer: any = null;
  if (ExpoVideoModule && typeof ExpoVideoModule.useVideoPlayer === "function") {
    try {
      expoPlayer = ExpoVideoModule.useVideoPlayer(uri, (player: any) => {
        player.loop = false;
        player.play();
      });
    } catch {
      expoPlayer = null;
    }
  }

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

  // Hardware back button exits fullscreen
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      handleExit();
      return true;
    });
    return () => backHandler.remove();
  }, []);

  // Poll for duration since events may not report it reliably
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
        if (!isSeeking) {
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
      const playingSub = expoPlayer.addListener("playingChange", (playing: boolean) => {
        setIsPlaying(playing);
      });

      return () => {
        timeSub?.remove();
        statusSub?.remove();
        playingSub?.remove();
      };
    }
  }, [expoPlayer, isSeeking]);

  // Auto-hide controls
  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [showControls, isPlaying]);

  const resetHideTimer = useCallback(() => {
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (isPlaying && showControls) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  }, [isPlaying, showControls]);

  const toggleControls = () => {
    setShowControls((prev) => !prev);
  };

  const handlePlayPause = () => {
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
  };

  const handleSkip = (seconds: number) => {
    if (expoPlayer) {
      expoPlayer.seekBy(seconds);
    } else if (avVideoRef.current) {
      avVideoRef.current.getStatusAsync().then((status: any) => {
        if (status.isLoaded) {
          const newPos = Math.max(
            0,
            Math.min(status.durationMillis, status.positionMillis + seconds * 1000)
          );
          avVideoRef.current.setPositionAsync(newPos);
        }
      });
    }
    resetHideTimer();
  };

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
  };

  const handleSeekComplete = (value: number) => {
    if (expoPlayer) {
      expoPlayer.currentTime = value;
    } else if (avVideoRef.current) {
      avVideoRef.current.setPositionAsync(value * 1000);
    }
    setPosition(value);
    setIsSeeking(false);
    resetHideTimer();
  };

  const handleExit = () => {
    if (expoPlayer) {
      expoPlayer.pause();
    }
    router.back();
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Video Layer */}
      {ExpoVideoModule?.VideoView && expoPlayer ? (
        <ExpoVideoModule.VideoView
          style={[styles.video, { width: screenDims.width, height: screenDims.height }]}
          player={expoPlayer}
          allowsFullscreen={false}
          showsTimecodes={false}
          contentFit="contain"
          nativeControls={false}
        />
      ) : ExpoAvVideo ? (
        <ExpoAvVideo
          ref={avVideoRef}
          source={{ uri }}
          style={[styles.video, { width: screenDims.width, height: screenDims.height }]}
          resizeMode={ExpoAvResizeMode ? ExpoAvResizeMode.CONTAIN : "contain"}
          shouldPlay={isPlaying}
          isMuted={isMuted}
          useNativeControls={false}
          onPlaybackStatusUpdate={(status: any) => {
            if (status.isLoaded) {
              setIsLoading(false);
              if (!isSeeking) {
                setPosition(status.positionMillis / 1000);
              }
              if (status.durationMillis && status.durationMillis > 0) {
                setDuration(status.durationMillis / 1000);
              }
              setIsPlaying(status.isPlaying);
            }
          }}
        />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>Video player not available</Text>
        </View>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#818cf8" />
        </View>
      )}

      {/* Touch target to toggle controls */}
      <Pressable style={StyleSheet.absoluteFill} onPress={toggleControls} />

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
  fallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackText: {
    color: "#94a3b8",
    fontSize: 16,
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
  },
  controlsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "space-between",
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
