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
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Play, Image as ImageIcon } from "lucide-react-native";
import { MediaFile, useMobileStore } from "../store/useMobileStore";
import { buildThumbnailUrl } from "../lib/api";

interface Props {
  files: MediaFile[];
  onSelectFile: (file: MediaFile) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  emptyTitle?: string;
  emptySubtitle?: string;
}

const COLS = 3;
const GAP = 1;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CELL = (SCREEN_WIDTH - GAP * (COLS - 1)) / COLS;

function GridCell({
  file,
  index,
  onOpen,
}: {
  file: MediaFile;
  index: number;
  onOpen: () => void;
}) {
  const { serverUrl, sessionToken } = useMobileStore();
  const thumb = buildThumbnailUrl(serverUrl, file.path, sessionToken);
  const isEndOfRow = (index + 1) % COLS === 0;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onOpen}
      style={[
        styles.cell,
        { marginRight: isEndOfRow ? 0 : GAP, marginBottom: GAP },
      ]}
    >
      {file.type === "image" || file.type === "video" ? (
        <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.fallback]}>
          <ImageIcon size={22} color="#737373" />
        </View>
      )}
      {file.type === "video" && (
        <View style={styles.videoMark}>
          <Play size={11} color="#fff" fill="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

export function InstagramFeed({
  files,
  onSelectFile,
  refreshing = false,
  onRefresh,
  onScroll,
  emptyTitle = "No photos or videos",
  emptySubtitle = "Your library will show here as a tight square grid, like an Instagram profile.",
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
      numColumns={COLS}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      alwaysBounceVertical
      overScrollMode="always"
      scrollEventThrottle={16}
      onScroll={onScroll}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fafafa"
            colors={["#fafafa"]}
          />
        ) : undefined
      }
      renderItem={({ item, index }) => (
        <GridCell file={item} index={index} onOpen={() => onSelectFile(item)} />
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <ImageIcon size={48} color="#262626" />
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptySub}>{emptySubtitle}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 140,
    paddingHorizontal: 0,
    flexGrow: 1,
  },
  cell: {
    width: CELL,
    height: CELL,
    backgroundColor: "#000000",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  videoMark: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  empty: {
    width: SCREEN_WIDTH,
    alignItems: "center",
    paddingVertical: 70,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: "#d4d4d4",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  emptySub: {
    color: "#737373",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
  },
});
