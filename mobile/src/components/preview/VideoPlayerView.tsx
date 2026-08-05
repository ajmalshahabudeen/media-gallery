import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Dimensions,
  ActivityIndicator,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  LayoutChangeEvent,
} from "react-native";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize,
  Volume2,
  VolumeX,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Props {
  uri: string;
  posterUri?: string;
  onOpenExternal?: () => void;
  title?: string;
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
      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
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
      {/* Track background */}
      <View style={seekStyles.track}>
        <View style={[seekStyles.trackFill, { width: progressPercent as any }]} />
      </View>
      {/* Thumb */}
      <View
        style={[
          seekStyles.thumb,
          { left: progressPercent as any },
        ]}
      />
    </View>
  );
};

const seekStyles = StyleSheet.create({
  container: {
    flex: 1,
    height: 36,
    justifyContent: "center",
    paddingVertical: 10,
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
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#a5b4fc",
    marginLeft: -8,
    top: 10,
    elevation: 3,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
});

/* ---------- Video Player View ---------- */
export const VideoPlayerView: React.FC<Props> = ({ uri, posterUri, onOpenExternal, title }) => {
  const router = useRouter();

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

  const expoPlayer = useVideoPlayer(uri, (player: any) => {
    player.loop = false;
    player.play();
  });

  // Poll for duration since events may not report it reliably
  useEffect(() => {
    if (expoPlayer) {
      durationPollRef.current = setInterval(() => {
        try {
          const d = expoPlayer.duration;
          if (d && d > 0 && isFinite(d)) {
            setDuration(d);
            // Stop polling once we have a valid duration
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
        // Try grabbing duration from event or player
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
  }, [expoPlayer, isSeeking]);

  // Auto-hide controls timer
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
          const newPos = Math.max(0, Math.min(status.durationMillis, status.positionMillis + seconds * 1000));
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

  const handleFullscreen = () => {
    // Pause current playback before navigating
    if (expoPlayer) {
      expoPlayer.pause();
    } else if (avVideoRef.current) {
      avVideoRef.current.pauseAsync();
    }
    router.push({
      pathname: "/fullscreen-video",
      params: { uri, title: title || "Video" },
    } as any);
  };

  const playerHeight = SCREEN_HEIGHT * 0.36;

  return (
    <View style={[styles.container, { width: SCREEN_WIDTH, height: playerHeight }]}>
      {/* Video Render Layer */}
      <VideoView
        style={styles.media}
        player={expoPlayer}
        contentFit="contain"
        nativeControls={false}
      />

      {/* Loading Spinner */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#818cf8" />
        </View>
      )}

      {/* Touch target - toggles controls visibility */}
      <Pressable style={StyleSheet.absoluteFill} onPress={toggleControls} />

      {/* Custom Video Controls Overlay */}
      {showControls && (
        <View style={styles.controlsOverlay} pointerEvents="box-none">
          {/* Center Controls (Skip Back 10s, Play/Pause, Skip Forward 10s) */}
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

          {/* Bottom Bar: Timer, Seek Bar, Duration, Mute & Fullscreen */}
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
              {isMuted ? <VolumeX size={18} color="#f43f5e" /> : <Volume2 size={18} color="#ffffff" />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.barIconBtn} onPress={handleFullscreen}>
              <Maximize size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000000",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  fallbackContainer: {
    padding: 24,
    alignItems: "center",
  },
  fallbackText: {
    color: "#94a3b8",
    fontSize: 14,
    marginBottom: 16,
  },
  streamBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#4f46e5",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  streamBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
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
    padding: 12,
  },
  centerControls: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },
  controlCircleSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  controlCircleLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
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
    gap: 6,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  timerText: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    minWidth: 38,
  },
  barIconBtn: {
    padding: 4,
  },
});
