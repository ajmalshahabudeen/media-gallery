import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import {
  Play,
  Music,
  FileText,
  Image as ImageIcon,
  Star,
} from "lucide-react-native";
import { MediaFile, useMobileStore } from "../../store/useMobileStore";
import { buildThumbnailUrl } from "../../lib/api";

interface Props {
  file: MediaFile;
  onPress: () => void;
  viewMode?: "grid" | "list" | "cards";
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const MediaCard: React.FC<Props> = ({ file, onPress, viewMode = "grid" }) => {
  const { serverUrl, sessionToken, favorites, toggleFavorite } = useMobileStore();
  const isFavorite = favorites.some((f) => f.path === file.path);
  const thumbnailUrl = buildThumbnailUrl(serverUrl, file.path, sessionToken);

  const handleFavoritePress = (e: any) => {
    e.stopPropagation();
    toggleFavorite(file);
  };

  if (viewMode === "list") {
    return (
      <TouchableOpacity style={styles.listCard} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.listThumbContainer}>
          {file.type === "image" || file.type === "video" ? (
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.listThumb}
              resizeMode="cover"
            />
          ) : file.type === "audio" ? (
            <View style={[styles.listThumb, styles.iconContainerAudio]}>
              <Music size={20} color="#c084fc" />
            </View>
          ) : (
            <View style={[styles.listThumb, styles.iconContainerDoc]}>
              <FileText size={20} color="#a3a3a3" />
            </View>
          )}
          {file.type === "video" && (
            <View style={styles.smallPlayBadge}>
              <Play size={10} color="#ffffff" fill="#ffffff" />
            </View>
          )}
        </View>

        <View style={styles.listDetails}>
          <Text style={styles.listTitle} numberOfLines={1}>
            {file.name}
          </Text>
          <Text style={styles.listSubtitle}>
            {formatFileSize(file.size)} • {file.extension.toUpperCase()}
          </Text>
        </View>

        <TouchableOpacity onPress={handleFavoritePress} style={styles.starBtn}>
          <Star
            size={18}
            color={isFavorite ? "#eab308" : "#525252"}
            fill={isFavorite ? "#eab308" : "transparent"}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  // Default Grid Card
  return (
    <TouchableOpacity style={styles.gridCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.mediaContainer}>
        {file.type === "image" || file.type === "video" ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.gridThumb}
            resizeMode="cover"
          />
        ) : file.type === "audio" ? (
          <View style={[styles.gridThumb, styles.iconContainerAudio]}>
            <Music size={32} color="#c084fc" />
          </View>
        ) : (
          <View style={[styles.gridThumb, styles.iconContainerDoc]}>
            <FileText size={32} color="#a3a3a3" />
          </View>
        )}

        {file.type === "video" && (
          <View style={styles.videoOverlay}>
            <View style={styles.playIconCircle}>
              <Play size={14} color="#ffffff" fill="#ffffff" />
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.gridStarBtn} onPress={handleFavoritePress}>
          <Star
            size={16}
            color={isFavorite ? "#eab308" : "rgba(255,255,255,0.7)"}
            fill={isFavorite ? "#eab308" : "rgba(0,0,0,0.3)"}
          />
        </TouchableOpacity>

        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{file.extension.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.gridDetails}>
        <Text style={styles.gridTitle} numberOfLines={1}>
          {file.name}
        </Text>
        <Text style={styles.gridSize}>{formatFileSize(file.size)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gridCard: {
    flex: 1,
    margin: 6,
    backgroundColor: "#171717",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#262626",
  },
  mediaContainer: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#000000",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  gridThumb: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainerAudio: {
    backgroundColor: "#2e1065",
  },
  iconContainerDoc: {
    backgroundColor: "#171717",
  },
  videoOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  playIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  gridStarBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    padding: 5,
    borderRadius: 14,
  },
  typeBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fafafa",
  },
  gridDetails: {
    padding: 8,
  },
  gridTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f1f5f9",
  },
  gridSize: {
    fontSize: 10,
    color: "#a3a3a3",
    marginTop: 2,
  },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171717",
    padding: 10,
    marginVertical: 4,
    marginHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262626",
  },
  listThumbContainer: {
    position: "relative",
  },
  listThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  smallPlayBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: 6,
    padding: 2,
  },
  listDetails: {
    flex: 1,
    marginLeft: 12,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fafafa",
  },
  listSubtitle: {
    fontSize: 11,
    color: "#a3a3a3",
    marginTop: 2,
  },
  starBtn: {
    padding: 6,
  },
});
