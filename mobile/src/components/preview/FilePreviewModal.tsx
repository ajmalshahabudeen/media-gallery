import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Share,
  Linking,
} from "react-native";
import {
  X,
  Star,
  Play,
  Pause,
  Music,
  FileText,
  Share2,
  Folder,
  Calendar,
  HardDrive,
  ExternalLink,
  Film,
} from "lucide-react-native";
import { MediaFile, useMobileStore } from "../../store/useMobileStore";
import { buildMediaFileUrl, buildThumbnailUrl } from "../../lib/api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Safely attempt to load expo-av if available natively
let ExpoVideo: any = null;
let ExpoAudio: any = null;
let ExpoResizeMode: any = null;

try {
  const expoAv = require("expo-av");
  ExpoVideo = expoAv.Video;
  ExpoAudio = expoAv.Audio;
  ExpoResizeMode = expoAv.ResizeMode;
} catch {
  // ExponentAV native module not available in Expo Go client
}

interface Props {
  file: MediaFile | null;
  onClose: () => void;
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const FilePreviewModal: React.FC<Props> = ({ file, onClose }) => {
  const { serverUrl, favorites, toggleFavorite, logMediaView } = useMobileStore();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [soundObject, setSoundObject] = useState<any>(null);

  const isFavorite = file ? favorites.some((f) => f.path === file.path) : false;
  const mediaUrl = file ? buildMediaFileUrl(serverUrl, file.path) : "";
  const thumbnailUrl = file ? buildThumbnailUrl(serverUrl, file.path) : "";

  useEffect(() => {
    if (file) {
      logMediaView(file.path);
    }
    return () => {
      if (soundObject && typeof soundObject.unloadAsync === "function") {
        soundObject.unloadAsync();
      }
    };
  }, [file]);

  if (!file) return null;

  const handleToggleAudio = async () => {
    if (!mediaUrl) return;
    if (!ExpoAudio) {
      // Fallback: Open in browser/external player if native module missing
      Linking.openURL(mediaUrl);
      return;
    }

    try {
      if (soundObject) {
        if (isPlayingAudio) {
          await soundObject.pauseAsync();
          setIsPlayingAudio(false);
        } else {
          await soundObject.playAsync();
          setIsPlayingAudio(true);
        }
      } else {
        const { sound } = await ExpoAudio.Sound.createAsync(
          { uri: mediaUrl },
          { shouldPlay: true }
        );
        setSoundObject(sound);
        setIsPlayingAudio(true);
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlayingAudio(false);
          }
        });
      }
    } catch {
      Linking.openURL(mediaUrl);
    }
  };

  const handleOpenExternal = () => {
    if (mediaUrl) {
      Linking.openURL(mediaUrl);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: file.name,
        url: mediaUrl,
        message: `Check out ${file.name} on Media Gallery: ${mediaUrl}`,
      });
    } catch {
      // ignore
    }
  };

  return (
    <Modal visible={!!file} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <X size={22} color="#f8fafc" />
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {file.name}
          </Text>

          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => toggleFavorite(file)} style={styles.iconBtn}>
              <Star
                size={20}
                color={isFavorite ? "#eab308" : "#94a3b8"}
                fill={isFavorite ? "#eab308" : "transparent"}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
              <Share2 size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Media Viewer Area */}
        <View style={styles.mediaArea}>
          {file.type === "image" && (
            <Image
              source={{ uri: mediaUrl }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}

          {file.type === "video" && (
            ExpoVideo ? (
              <ExpoVideo
                source={{ uri: mediaUrl }}
                style={styles.fullVideo}
                useNativeControls
                resizeMode={ExpoResizeMode ? ExpoResizeMode.CONTAIN : "contain"}
                isLooping={false}
                shouldPlay
              />
            ) : (
              <View style={styles.fallbackMediaCard}>
                <Image
                  source={{ uri: thumbnailUrl }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
                <TouchableOpacity style={styles.openStreamBtn} onPress={handleOpenExternal}>
                  <Play size={24} color="#ffffff" fill="#ffffff" />
                  <Text style={styles.openStreamText}>Play Video Stream</Text>
                </TouchableOpacity>
              </View>
            )
          )}

          {file.type === "audio" && (
            <View style={styles.audioPlayerCard}>
              <View style={styles.albumArtCircle}>
                <Music size={54} color="#a855f7" />
              </View>

              <Text style={styles.audioTitle} numberOfLines={2}>
                {file.name}
              </Text>
              <Text style={styles.audioMeta}>{formatFileSize(file.size)}</Text>

              <TouchableOpacity style={styles.playAudioBtn} onPress={handleToggleAudio}>
                {isPlayingAudio ? (
                  <Pause size={28} color="#ffffff" />
                ) : (
                  <Play size={28} color="#ffffff" style={{ marginLeft: 3 }} />
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.externalLinkBtn} onPress={handleOpenExternal}>
                <ExternalLink size={14} color="#94a3b8" />
                <Text style={styles.externalLinkText}>Open Stream URL</Text>
              </TouchableOpacity>
            </View>
          )}

          {file.type === "other" && (
            <View style={styles.docCard}>
              <FileText size={64} color="#64748b" />
              <Text style={styles.docName} numberOfLines={2}>
                {file.name}
              </Text>
              <Text style={styles.docMeta}>{file.extension.toUpperCase()} File</Text>

              <TouchableOpacity style={styles.externalLinkBtn} onPress={handleOpenExternal}>
                <ExternalLink size={14} color="#818cf8" />
                <Text style={[styles.externalLinkText, { color: "#818cf8" }]}>
                  Open / Download File
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Details Footer */}
        <View style={styles.footer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metaRow}>
            <View style={styles.metaChip}>
              <HardDrive size={14} color="#6366f1" />
              <Text style={styles.metaText}>{formatFileSize(file.size)}</Text>
            </View>

            <View style={styles.metaChip}>
              <Folder size={14} color="#818cf8" />
              <Text style={styles.metaText}>{file.folder || "Root Folder"}</Text>
            </View>

            <View style={styles.metaChip}>
              <Calendar size={14} color="#a855f7" />
              <Text style={styles.metaText}>
                {new Date(file.modifiedAt || Date.now()).toLocaleDateString()}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
  },
  headerTitle: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "600",
    marginHorizontal: 12,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: {
    padding: 6,
  },
  mediaArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
  },
  fullVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
  },
  fallbackMediaCard: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  openStreamBtn: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#4f46e5",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  openStreamText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  audioPlayerCard: {
    alignItems: "center",
    padding: 24,
  },
  albumArtCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#2e1065",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#7e22ce",
  },
  audioTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  audioMeta: {
    color: "#94a3b8",
    fontSize: 13,
    marginBottom: 24,
  },
  playAudioBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#7e22ce",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  externalLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    padding: 8,
  },
  externalLinkText: {
    color: "#94a3b8",
    fontSize: 12,
  },
  docCard: {
    alignItems: "center",
    padding: 24,
  },
  docName: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  docMeta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 6,
  },
  footer: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#0f172a",
    borderTopWidth: 1,
    borderColor: "#1e293b",
  },
  metaRow: {
    flexDirection: "row",
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1e293b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
  },
  metaText: {
    color: "#cbd5e1",
    fontSize: 12,
  },
});
