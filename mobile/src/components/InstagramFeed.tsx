import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from "react-native";
import { Heart, Play, Image as ImageIcon } from "lucide-react-native";
import { MediaFile, useMobileStore } from "../store/useMobileStore";
import { buildThumbnailUrl } from "../lib/api";

interface Props {
  files: MediaFile[];
  onSelectFile: (file: MediaFile) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

const SCREEN_WIDTH = Dimensions.get("window").width;

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

function folderLabel(file: MediaFile): string {
  if (!file.folder || file.folder === "/" || file.folder === ".") return "Library";
  const parts = file.folder.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts[parts.length - 1] || "Library";
}

function FeedPost({
  file,
  onOpen,
}: {
  file: MediaFile;
  onOpen: () => void;
}) {
  const { serverUrl, sessionToken, favorites, toggleFavorite } = useMobileStore();
  const liked = favorites.some((f) => f.path === file.path);
  const thumb = buildThumbnailUrl(serverUrl, file.path, sessionToken);
  const initial = (folderLabel(file)[0] || "M").toUpperCase();

  return (
    <View style={styles.post}>
      <View style={styles.postHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.folderName} numberOfLines={1}>
            {folderLabel(file)}
          </Text>
          <Text style={styles.timeLabel}>{formatRelative(file.modifiedAt)}</Text>
        </View>
      </View>

      <TouchableOpacity activeOpacity={0.92} onPress={onOpen}>
        <View style={styles.mediaWrap}>
          {file.type === "image" || file.type === "video" ? (
            <Image source={{ uri: thumb }} style={styles.media} resizeMode="cover" />
          ) : (
            <View style={[styles.media, styles.mediaFallback]}>
              <ImageIcon size={36} color="#64748b" />
            </View>
          )}
          {file.type === "video" && (
            <View style={styles.playBadge}>
              <Play size={18} color="#fff" fill="#fff" />
            </View>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => toggleFavorite(file)}
          hitSlop={10}
          style={styles.likeBtn}
        >
          <Heart
            size={26}
            color={liked ? "#fb7185" : "#f8fafc"}
            fill={liked ? "#fb7185" : "transparent"}
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.caption} numberOfLines={2}>
        <Text style={styles.captionFolder}>{folderLabel(file)} </Text>
        {file.name}
      </Text>
    </View>
  );
}

export function InstagramFeed({
  files,
  onSelectFile,
  refreshing = false,
  onRefresh,
}: Props) {
  const { selectedType, searchQuery, sortBy, sortOrder } = useMobileStore();

  const posts = useMemo(() => {
    const filtered = files.filter((file) => {
      if (file.type !== "image" && file.type !== "video") return false;
      if (selectedType !== "all" && file.type !== selectedType) return false;
      const terms = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
      if (terms.length === 0) return true;
      return terms.every(
        (term) =>
          file.name.toLowerCase().includes(term) ||
          file.folder.toLowerCase().includes(term)
      );
    });
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") comparison = a.name.localeCompare(b.name);
      else if (sortBy === "size") comparison = a.size - b.size;
      else comparison = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [files, selectedType, searchQuery, sortBy, sortOrder]);

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.path}
      contentContainerStyle={styles.list}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#818cf8"
            colors={["#818cf8"]}
          />
        ) : undefined
      }
      renderItem={({ item }) => (
        <FeedPost file={item} onOpen={() => onSelectFile(item)} />
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <ImageIcon size={48} color="#334155" />
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptySub}>
            Photos and videos from your library will appear here like an Instagram feed.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 120,
  },
  post: {
    backgroundColor: "#0f172a",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(148,163,184,0.18)",
    paddingBottom: 14,
    marginBottom: 6,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1e1b4b",
    borderWidth: 1.5,
    borderColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#c7d2fe",
    fontWeight: "800",
    fontSize: 13,
  },
  headerMeta: {
    flex: 1,
  },
  folderName: {
    color: "#f8fafc",
    fontWeight: "700",
    fontSize: 14,
  },
  timeLabel: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 1,
  },
  mediaWrap: {
    width: SCREEN_WIDTH,
    aspectRatio: 4 / 5,
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  mediaFallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  playBadge: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  likeBtn: {
    padding: 2,
  },
  caption: {
    paddingHorizontal: 14,
    paddingTop: 6,
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 18,
  },
  captionFolder: {
    color: "#f8fafc",
    fontWeight: "700",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 70,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: "#cbd5e1",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  emptySub: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
  },
});
