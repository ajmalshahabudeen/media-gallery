import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from "react-native";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
} from "lucide-react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Safely require expo-video and expo-av
let ExpoVideoModule: any = null;
let ExpoAvVideo: any = null;
let ExpoAvResizeMode: any = null;

try {
  ExpoVideoModule = require("expo-video");
} catch {
  // expo-video missing or unlinked
}

try {
  const av = require("expo-av");
  ExpoAvVideo = av.Video;
  ExpoAvResizeMode = av.ResizeMode;
} catch {
  // expo-av missing
}

interface Props {
  uri: string;
  posterUri?: string;
  onOpenExternal?: () => void;
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

export const VideoPlayerView: React.FC<Props> = ({ uri, posterUri, onOpenExternal }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avVideoRef = useRef<any>(null);

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

  useEffect(() => {
    if (expoPlayer) {
      const timeSub = expoPlayer.addListener("timeUpdate", (event: any) => {
        setPosition(event.currentTime || 0);
        setDuration(expoPlayer.duration || 0);
        setIsLoading(false);
      });
      const statusSub = expoPlayer.addListener("statusChange", (status: any) => {
        if (status === "readyToPlay") setIsLoading(false);
      });
      const playingSub = expoPlayer.addListener("playingChange", (isPlaying: boolean) => {
        setIsPlaying(isPlaying);
      });

      return () => {
        timeSub?.remove();
        statusSub?.remove();
        playingSub?.remove();
      };
    }
  }, [expoPlayer]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [showControls, isPlaying]);

  const resetHideTimer = () => {
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  };

  const toggleControls = () => {
    setShowControls((prev) => !prev);
    resetHideTimer();
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

  const playerWidth = isFullscreen ? SCREEN_WIDTH : SCREEN_WIDTH;
  const playerHeight = isFullscreen ? SCREEN_HEIGHT : SCREEN_HEIGHT * 0.58;

  return (
    <TouchableWithoutFeedback onPress={toggleControls}>
      <View style={[styles.container, { width: playerWidth, height: playerHeight }]}>
        {/* Video Render Layer */}
        {ExpoVideoModule?.VideoView && expoPlayer ? (
          <ExpoVideoModule.VideoView
            style={styles.media}
            player={expoPlayer}
            allowsFullscreen
            showsTimecodes={false}
            contentFit="contain"
            nativeControls={false}
          />
        ) : ExpoAvVideo ? (
          <ExpoAvVideo
            ref={avVideoRef}
            source={{ uri }}
            style={styles.media}
            resizeMode={ExpoAvResizeMode ? ExpoAvResizeMode.CONTAIN : "contain"}
            shouldPlay={isPlaying}
            isMuted={isMuted}
            useNativeControls={false}
            onPlaybackStatusUpdate={(status: any) => {
              if (status.isLoaded) {
                setIsLoading(false);
                setPosition(status.positionMillis / 1000);
                setDuration(status.durationMillis / 1000);
                setIsPlaying(status.isPlaying);
              }
            }}
          />
        ) : (
          <View style={styles.fallbackContainer}>
            <Text style={styles.fallbackText}>Native Video Player Not Available</Text>
            {onOpenExternal && (
              <TouchableOpacity style={styles.streamBtn} onPress={onOpenExternal}>
                <Play size={18} color="#ffffff" fill="#ffffff" />
                <Text style={styles.streamBtnText}>Play Stream Externally</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#818cf8" />
          </View>
        )}

        {/* Custom Video Controls Overlay */}
        {showControls && (
          <View style={styles.controlsOverlay}>
            {/* Center Controls (Skip Back 10s, Play/Pause, Skip Forward 10s) */}
            <View style={styles.centerControls}>
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

            {/* Bottom Bar: Position Timer, Progress Bar, Mute & Fullscreen Toggle */}
            <View style={styles.bottomBar}>
              <Text style={styles.timerText}>
                {formatTime(position)} / {formatTime(duration)}
              </Text>

              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${duration > 0 ? (position / duration) * 100 : 0}%` },
                  ]}
                />
              </View>

              <TouchableOpacity style={styles.barIconBtn} onPress={handleMuteToggle}>
                {isMuted ? <VolumeX size={18} color="#f43f5e" /> : <Volume2 size={18} color="#ffffff" />}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.barIconBtn}
                onPress={() => setIsFullscreen((prev) => !prev)}
              >
                {isFullscreen ? <Minimize size={18} color="#ffffff" /> : <Maximize size={18} color="#ffffff" />}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
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
    padding: 16,
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
    gap: 10,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  timerText: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#818cf8",
    borderRadius: 3,
  },
  barIconBtn: {
    padding: 4,
  },
});
