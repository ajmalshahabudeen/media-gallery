import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
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
} from "lucide-react-native";
import { useVideoPlayer } from "expo-video";

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
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });

  const rates = [0.75, 1.0, 1.25, 1.5, 2.0];

  useEffect(() => {
    if (!player) return;

    const subscription = player.addListener("statusChange", () => {
      setIsPlaying(player.playing);
    });

    const timeSub = player.addListener("timeUpdate", (event: any) => {
      setPosition(event.currentTime);
      if (player.duration > 0) {
        setDuration(player.duration);
      }
    });

    return () => {
      subscription.remove();
      timeSub.remove();
    };
  }, [player]);

  const handleTogglePlay = () => {
    if (!player) return;
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleSeekDelta = (delta: number) => {
    if (!player) return;
    player.seekBy(delta);
  };

  const handleCycleRate = () => {
    if (!player) return;
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setPlaybackRate(nextRate);
    player.playbackRate = nextRate;
  };

  const handleToggleMute = () => {
    if (!player) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    player.muted = nextMute;
  };

  const progressPercent = duration > 0 ? `${Math.min(100, (position / duration) * 100)}%` : "0%";

  return (
    <View style={styles.container}>
      {/* Vinyl Disc Container */}
      <View style={styles.artworkContainer}>
        <View style={styles.disc}>
          <View style={styles.discInner}>
            <Music size={28} color="#fafafa" />
          </View>
        </View>
      </View>

      {/* Metadata */}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.subtext}>{fileSizeText}</Text>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: progressPercent as any }]} />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleToggleMute}>
          {isMuted ? <VolumeX size={20} color="#f43f5e" /> : <Volume2 size={20} color="#a3a3a3" />}
        </TouchableOpacity>

        <TouchableOpacity style={styles.seekBtn} onPress={() => handleSeekDelta(-10)}>
          <RotateCcw size={20} color="#d4d4d4" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.playBtn} onPress={handleTogglePlay}>
          {isPlaying ? (
            <Pause size={28} color="#000000" />
          ) : (
            <Play size={28} color="#000000" style={{ marginLeft: 3 }} />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.seekBtn} onPress={() => handleSeekDelta(10)}>
          <RotateCw size={20} color="#d4d4d4" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleCycleRate}>
          <Text style={styles.rateText}>{playbackRate}x</Text>
        </TouchableOpacity>
      </View>

      {/* External Player Backup */}
      <TouchableOpacity style={styles.externalBtn} onPress={() => Linking.openURL(uri)}>
        <ExternalLink size={14} color="#fafafa" />
        <Text style={styles.externalBtnText}>Open in External Media Player</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: "center",
    backgroundColor: "#000000",
    borderRadius: 16,
  },
  artworkContainer: {
    marginVertical: 20,
    alignItems: "center",
  },
  disc: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#171717",
    borderColor: "#262626",
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  discInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#171717",
    borderColor: "#262626",
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "#fafafa",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    width: "100%",
  },
  subtext: {
    color: "#a3a3a3",
    fontSize: 13,
    marginTop: 4,
  },
  progressContainer: {
    width: "100%",
    marginTop: 24,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#262626",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#fafafa",
    borderRadius: 3,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  timeText: {
    color: "#737373",
    fontSize: 12,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 24,
    paddingHorizontal: 8,
  },
  playBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#ffffff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  seekBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#171717",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  rateText: {
    color: "#fafafa",
    fontSize: 13,
    fontWeight: "700",
  },
  externalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#171717",
    borderRadius: 20,
    borderColor: "#262626",
    borderWidth: 1,
  },
  externalBtnText: {
    color: "#fafafa",
    fontSize: 12,
    fontWeight: "600",
  },
});
