import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  FlatList,
  Image,
  type ViewToken,
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
  Play,
} from "lucide-react-native";
import { MediaFile, useMobileStore } from "../../store/useMobileStore";
import { buildMediaFileUrl, buildThumbnailUrl } from "../../lib/api";
import { VideoPlayerView } from "./VideoPlayerView";
import { AudioPlayerView } from "./AudioPlayerView";
import { ImageViewerView } from "./ImageViewerView";

const UP_NEXT_LIMIT = 20;

interface Props {
  file: MediaFile | null;
  onClose: () => void;
  playlist?: MediaFile[];
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function pickPlaylist(current: MediaFile, explicit: MediaFile[] | undefined, library: MediaFile[], favorites: MediaFile[]) {
  if (explicit && explicit.length > 0) return explicit;
  if (library.some((f) => f.path === current.path)) return library;
  if (favorites.some((f) => f.path === current.path)) return favorites;
  return library.length > 0 ? library : favorites;
}

function UpNextRow({
  item,
  visible,
  onPress,
}: {
  item: MediaFile;
  visible: boolean;
  onPress: () => void;
}) {
  const { serverUrl, sessionToken } = useMobileStore();
  const thumb = visible ? buildThumbnailUrl(serverUrl, item.path, sessionToken) : null;

  return (
    <TouchableOpacity style={styles.upNextRow} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.upNextThumbWrap}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.upNextThumb} resizeMode="cover" />
        ) : (
          <View style={styles.upNextThumb} />
        )}
        <View style={styles.upNextPlay}>
          <Play size={10} color="#fff" fill="#fff" />
        </View>
      </View>
      <View style={styles.upNextMeta}>
        <Text style={styles.upNextTitle} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.upNextSub} numberOfLines={1}>
          {item.folder || "Library"} · {formatFileSize(item.size)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export const FilePreviewModal: React.FC<Props> = ({ file, onClose, playlist }) => {
  const { serverUrl, sessionToken, favorites, files, toggleFavorite, logMediaView } =
    useMobileStore();
  const [current, setCurrent] = useState<MediaFile | null>(file);
  const [visiblePaths, setVisiblePaths] = useState<Record<string, true>>({});

  useEffect(() => {
    setCurrent(file);
  }, [file]);

  const active = current || file;
  const isFavorite = active ? favorites.some((f) => f.path === active.path) : false;
  const mediaUrl = active ? buildMediaFileUrl(serverUrl, active.path, sessionToken) : "";

  useEffect(() => {
    if (active) logMediaView(active.path);
  }, [active]);

  const upNext = useMemo(() => {
    if (!active || active.type !== "video") return [];
    const source = pickPlaylist(active, playlist, files, favorites);
    const videos = source.filter((f) => f.type === "video" && f.path !== active.path);
    const idx = source.findIndex((f) => f.path === active.path);
    const after = idx >= 0 ? videos.filter((f) => source.indexOf(f) > idx) : videos;
    const before = idx >= 0 ? videos.filter((f) => source.indexOf(f) < idx) : [];
    return [...after, ...(after.length < UP_NEXT_LIMIT ? before : [])].slice(0, UP_NEXT_LIMIT);
  }, [active, playlist, files, favorites]);

  useEffect(() => {
    if (!active || active.type !== "video") {
      setVisiblePaths({});
      return;
    }
    const seed: Record<string, true> = {};
    for (const item of upNext.slice(0, 5)) seed[item.path] = true;
    setVisiblePaths(seed);
  }, [active?.path]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    setVisiblePaths((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const token of viewableItems) {
        const path = (token.item as MediaFile | undefined)?.path;
        if (path && !next[path]) {
          next[path] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 35,
    minimumViewTime: 80,
  }).current;

  const handleSelectNext = useCallback((next: MediaFile) => {
    setCurrent(next);
  }, []);

  if (!active) return null;

  const handleOpenExternal = () => {
    if (mediaUrl) Linking.openURL(mediaUrl);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: active.name,
        url: mediaUrl,
        message: `Check out ${active.name} on Media Gallery: ${mediaUrl}`,
      });
    } catch {
      // ignore
    }
  };

  const isVideo = active.type === "video";

  return (
    <Modal visible={!!file} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, isVideo && styles.containerVideo]}>
        <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />

        {!isVideo ? (
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <X size={22} color="#fafafa" />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {active.name}
            </Text>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={() => toggleFavorite(active)} style={styles.iconBtn}>
                <Star
                  size={20}
                  color={isFavorite ? "#eab308" : "#a3a3a3"}
                  fill={isFavorite ? "#eab308" : "transparent"}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
                <Share2 size={20} color="#a3a3a3" />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={[styles.mediaArea, isVideo && styles.mediaAreaVideo]}>
          {active.type === "image" && <ImageViewerView uri={mediaUrl} />}
          {isVideo && (
            <VideoPlayerView
              key={active.path}
              uri={mediaUrl}
              onOpenExternal={handleOpenExternal}
              title={active.name}
            />
          )}
          {active.type === "audio" && (
            <AudioPlayerView
              uri={mediaUrl}
              title={active.name}
              fileSizeText={formatFileSize(active.size)}
            />
          )}
          {active.type === "other" && (
            <View style={styles.docCard}>
              <FileText size={64} color="#737373" />
              <Text style={styles.docName} numberOfLines={2}>
                {active.name}
              </Text>
              <Text style={styles.docMeta}>{active.extension.toUpperCase()} File</Text>
              <TouchableOpacity style={styles.externalLinkBtn} onPress={handleOpenExternal}>
                <ExternalLink size={14} color="#fafafa" />
                <Text style={[styles.externalLinkText, { color: "#fafafa" }]}>
                  Open / Download File
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isVideo ? (
          <View style={styles.watchPane}>
            <View style={styles.watchInfo}>
              <View style={styles.watchTitleRow}>
                <TouchableOpacity onPress={onClose} style={styles.watchBack}>
                  <X size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.watchTitle} numberOfLines={2}>
                  {active.name}
                </Text>
              </View>
              <View style={styles.watchActions}>
                <TouchableOpacity style={styles.watchAction} onPress={() => toggleFavorite(active)}>
                  <Star
                    size={20}
                    color={isFavorite ? "#FF0000" : "#fff"}
                    fill={isFavorite ? "#FF0000" : "transparent"}
                  />
                  <Text style={styles.watchActionLabel}>{isFavorite ? "Liked" : "Like"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.watchAction} onPress={handleShare}>
                  <Share2 size={18} color="#fff" />
                  <Text style={styles.watchActionLabel}>Share</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.metaRow}
                contentContainerStyle={styles.metaRowContent}
              >
                <View style={styles.metaChip}>
                  <HardDrive size={12} color="#aaa" />
                  <Text style={styles.metaText}>{formatFileSize(active.size)}</Text>
                </View>
                <View style={styles.metaChip}>
                  <Folder size={12} color="#aaa" />
                  <Text style={styles.metaText}>{active.folder || "Root Folder"}</Text>
                </View>
                <View style={styles.metaChip}>
                  <Calendar size={12} color="#aaa" />
                  <Text style={styles.metaText}>
                    {new Date(active.modifiedAt || Date.now()).toLocaleDateString()}
                  </Text>
                </View>
              </ScrollView>
            </View>

            {upNext.length > 0 ? (
              <FlatList
                data={upNext}
                keyExtractor={(item) => item.path}
                style={styles.upNextList}
                contentContainerStyle={styles.upNextContent}
                initialNumToRender={5}
                maxToRenderPerBatch={6}
                windowSize={5}
                removeClippedSubviews
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                ListHeaderComponent={<Text style={styles.upNextHeading}>Up next</Text>}
                renderItem={({ item }) => (
                  <UpNextRow
                    item={item}
                    visible={!!visiblePaths[item.path]}
                    onPress={() => handleSelectNext(item)}
                  />
                )}
              />
            ) : (
              <View style={styles.upNextEmpty}>
                <Text style={styles.upNextEmptyText}>No more videos in this library</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.footer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metaRow}>
              <View style={styles.metaChip}>
                <HardDrive size={14} color="#ffffff" />
                <Text style={styles.metaText}>{formatFileSize(active.size)}</Text>
              </View>
              <View style={styles.metaChip}>
                <Folder size={14} color="#fafafa" />
                <Text style={styles.metaText}>{active.folder || "Root Folder"}</Text>
              </View>
              <View style={styles.metaChip}>
                <Calendar size={14} color="#a855f7" />
                <Text style={styles.metaText}>
                  {new Date(active.modifiedAt || Date.now()).toLocaleDateString()}
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
    backgroundColor: "#000000",
    borderBottomWidth: 1,
    borderColor: "#171717",
    zIndex: 10,
  },
  headerTitle: {
    flex: 1,
    color: "#fafafa",
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
  watchPane: {
    flex: 1,
    backgroundColor: "#0f0f0f",
  },
  watchInfo: {
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
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
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  watchActions: {
    flexDirection: "row",
    gap: 20,
    marginTop: 10,
    marginBottom: 8,
  },
  watchAction: {
    alignItems: "center",
    gap: 3,
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
    color: "#fafafa",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  docMeta: {
    color: "#737373",
    fontSize: 13,
    marginTop: 6,
  },
  externalLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    padding: 10,
    backgroundColor: "#171717",
    borderRadius: 12,
  },
  externalLinkText: {
    color: "#a3a3a3",
    fontSize: 13,
    fontWeight: "600",
  },
  footer: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#000000",
    borderTopWidth: 1,
    borderColor: "#171717",
  },
  metaRow: {
    flexGrow: 0,
    flexShrink: 0,
  },
  metaRowContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#272727",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    marginRight: 8,
  },
  metaText: {
    color: "#aaa",
    fontSize: 11,
    fontWeight: "500",
  },
  upNextList: {
    flex: 1,
  },
  upNextContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  upNextHeading: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 4,
  },
  upNextRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  upNextThumbWrap: {
    width: 168,
    height: 94,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
  },
  upNextThumb: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1a1a1a",
  },
  upNextPlay: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  upNextMeta: {
    flex: 1,
    paddingTop: 2,
  },
  upNextTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  upNextSub: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 4,
  },
  upNextEmpty: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  upNextEmptyText: {
    color: "#737373",
    fontSize: 13,
  },
});
