import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from "react-native";
import {
  Play,
  Pause,
  Music,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  ExternalLink,
  Zap,
} from "lucide-react-native";

let ExpoAudio: any = null;
try {
  ExpoAudio = require("expo-av").Audio;
} catch {
  // Expo audio missing
}

interface Props {
  uri: string;
  title: string;
  fileSizeText: string;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

export const AudioPlayerView: React.FC<Props> = ({ uri, title, fileSizeText }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const soundRef = useRef<any>(null);

  const rates = [0.75, 1.0, 1.25, 1.5, 2.0];

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const handleTogglePlay = async () => {
    if (!ExpoAudio) {
      Linking.openURL(uri);
      return;
    }

    try {
      if (soundRef.current) {
        if (isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setIsPlaying(true);
        }
      } else {
        setIsLoading(true);
        const { sound } = await ExpoAudio.Sound.createAsync(
          { uri },
          { shouldPlay: true, rate: playbackRate, isMuted }
        );
        soundRef.current = sound;
        setIsPlaying(true);
        setIsLoading(false);

        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis / 1000);
            setDuration(status.durationMillis / 1000);
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
              setIsPlaying(false);
            }
          }
        });
      }
    } catch {
      setIsLoading(false);
      Linking.openURL(uri);
    }
  };

  const handleSkip = async (seconds: number) => {
    if (soundRef.current) {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        const newPos = Math.max(0, Math.min(status.durationMillis, status.positionMillis + seconds * 1000));
        await soundRef.current.setPositionAsync(newPos);
      }
    }
  };

  const handleCycleRate = async () => {
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (soundRef.current) {
      await soundRef.current.setRateAsync(nextRate, true);
    }
  };

  const handleToggleMute = async () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (soundRef.current) {
      await soundRef.current.setIsMutedAsync(nextMute);
    }
  };

  return (
    <View style={styles.container}>
      {/* Album Artwork Disc */}
      <View style={styles.discContainer}>
        <View style={[styles.discCircle, isPlaying && styles.discCirclePlaying]}>
          <Music size={54} color={isPlaying ? "#c084fc" : "#a855f7"} />
        </View>
      </View>

      {/* Metadata */}
      <Text style={styles.titleText} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.sizeText}>{fileSizeText}</Text>

      {/* Seek Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${duration > 0 ? (position / duration) * 100 : 0}%` },
            ]}
          />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* Main Playback Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.skipBtn} onPress={() => handleSkip(-10)}>
          <RotateCcw size={22} color="#cbd5e1" />
          <Text style={styles.skipText}>-10s</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.playBtn} onPress={handleTogglePlay} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : isPlaying ? (
            <Pause size={30} color="#ffffff" fill="#ffffff" />
          ) : (
            <Play size={30} color="#ffffff" fill="#ffffff" style={{ marginLeft: 3 }} />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={() => handleSkip(10)}>
          <RotateCw size={22} color="#cbd5e1" />
          <Text style={styles.skipText}>+10s</Text>
        </TouchableOpacity>
      </View>

      {/* Secondary Controls (Speed & Mute) */}
      <View style={styles.subRow}>
        <TouchableOpacity style={styles.subChip} onPress={handleCycleRate}>
          <Zap size={14} color="#a855f7" />
          <Text style={styles.subChipText}>{playbackRate}x Speed</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.subChip} onPress={handleToggleMute}>
          {isMuted ? (
            <VolumeX size={14} color="#f43f5e" />
          ) : (
            <Volume2 size={14} color="#818cf8" />
          )}
          <Text style={styles.subChipText}>{isMuted ? "Muted" : "Sound On"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.subChip} onPress={() => Linking.openURL(uri)}>
          <ExternalLink size={14} color="#94a3b8" />
          <Text style={styles.subChipText}>Stream URL</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    width: "100%",
  },
  discContainer: {
    marginVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  discCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#2e1065",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#7e22ce",
    elevation: 10,
    shadowColor: "#a855f7",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  discCirclePlaying: {
    borderColor: "#c084fc",
    shadowColor: "#c084fc",
    shadowOpacity: 0.5,
  },
  titleText: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  sizeText: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 20,
  },
  progressContainer: {
    width: "100%",
    marginBottom: 20,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#1e293b",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#a855f7",
    borderRadius: 3,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  timeText: {
    color: "#64748b",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    marginBottom: 24,
  },
  skipBtn: {
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    backgroundColor: "#1e293b",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#334155",
  },
  skipText: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#7e22ce",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#a855f7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  subRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  subChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1e293b",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  subChipText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
  },
});
