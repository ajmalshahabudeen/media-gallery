import React, { useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Linking,
  StatusBar,
} from "react-native";
import {
  X,
  Star,
  FileText,
  Share2,
  Folder,
  Calendar,
  HardDrive,
  ExternalLink,
} from "lucide-react-native";
import { MediaFile, useMobileStore } from "../../store/useMobileStore";
import { buildMediaFileUrl } from "../../lib/api";
import { VideoPlayerView } from "./VideoPlayerView";
import { AudioPlayerView } from "./AudioPlayerView";
import { ImageViewerView } from "./ImageViewerView";

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
  const { serverUrl, sessionToken, favorites, toggleFavorite, logMediaView } = useMobileStore();

  const isFavorite = file ? favorites.some((f) => f.path === file.path) : false;
  const mediaUrl = file ? buildMediaFileUrl(serverUrl, file.path, sessionToken) : "";

  useEffect(() => {
    if (file) {
      logMediaView(file.path);
    }
  }, [file]);

  if (!file) return null;

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

  const isVideo = file.type === "video";

  return (
    <Modal visible={!!file} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, isVideo && styles.containerVideo]}>
        <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />

        {!isVideo ? (
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
        ) : null}

        <View style={[styles.mediaArea, isVideo && styles.mediaAreaVideo]}>
          {file.type === "image" && <ImageViewerView uri={mediaUrl} />}
          {isVideo && (
            <VideoPlayerView uri={mediaUrl} onOpenExternal={handleOpenExternal} title={file.name} />
          )}
          {file.type === "audio" && (
            <AudioPlayerView
              uri={mediaUrl}
              title={file.name}
              fileSizeText={formatFileSize(file.size)}
            />
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

        {isVideo ? (
          <View style={styles.watchInfo}>
            <View style={styles.watchTitleRow}>
              <TouchableOpacity onPress={onClose} style={styles.watchBack}>
                <X size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.watchTitle} numberOfLines={2}>
                {file.name}
              </Text>
            </View>
            <View style={styles.watchActions}>
              <TouchableOpacity style={styles.watchAction} onPress={() => toggleFavorite(file)}>
                <Star
                  size={22}
                  color={isFavorite ? "#FF0000" : "#fff"}
                  fill={isFavorite ? "#FF0000" : "transparent"}
                />
                <Text style={styles.watchActionLabel}>{isFavorite ? "Liked" : "Like"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.watchAction} onPress={handleShare}>
                <Share2 size={20} color="#fff" />
                <Text style={styles.watchActionLabel}>Share</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metaRow}>
              <View style={styles.metaChip}>
                <HardDrive size={14} color="#aaa" />
                <Text style={styles.metaText}>{formatFileSize(file.size)}</Text>
              </View>
              <View style={styles.metaChip}>
                <Folder size={14} color="#aaa" />
                <Text style={styles.metaText}>{file.folder || "Root Folder"}</Text>
              </View>
              <View style={styles.metaChip}>
                <Calendar size={14} color="#aaa" />
                <Text style={styles.metaText}>
                  {new Date(file.modifiedAt || Date.now()).toLocaleDateString()}
                </Text>
              </View>
            </ScrollView>
          </View>
        ) : (
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
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  containerVideo: {
    backgroundColor: "#0f0f0f",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "#0f172a",
    borderBottomWidth: 1,
    borderColor: "#1e293b",
    zIndex: 10,
  },
  headerTitle: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
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
    backgroundColor: "#000000",
  },
  mediaAreaVideo: {
    flex: 0,
    width: "100%",
    backgroundColor: "#000",
  },
  watchInfo: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    backgroundColor: "#0f0f0f",
  },
  watchTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  watchBack: {
    paddingTop: 2,
    paddingRight: 4,
  },
  watchTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  watchActions: {
    flexDirection: "row",
    gap: 22,
    marginTop: 16,
    marginBottom: 14,
  },
  watchAction: {
    alignItems: "center",
    gap: 4,
  },
  watchActionLabel: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
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
  externalLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    padding: 10,
    backgroundColor: "#1e293b",
    borderRadius: 12,
  },
  externalLinkText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
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
    backgroundColor: "#272727",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
  },
  metaText: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "500",
  },
});
