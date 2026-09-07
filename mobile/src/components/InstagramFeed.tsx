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
  topInset?: number;
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
  const isVideo = file.type === "video";
  const isMiddle = index % COLS === 1;
  const thumbUri = buildThumbnailUrl(serverUrl, file.path, sessionToken);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onOpen}
      style={[
        styles.cell,
        isMiddle && { marginHorizontal: GAP },
        { marginBottom: GAP },
      ]}
    >
      <Image
        source={{ uri: thumbUri }}
        style={styles.thumb}
        resizeMode="cover"
      />
      {isVideo ? (
        <View style={styles.videoMark}>
          <Play size={14} color="#fafafa" fill="#fafafa" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export function InstagramFeed({
  files,
  onSelectFile,
  refreshing = false,
  onRefresh,
  onScroll,
  emptyTitle = "No Posts Yet",
  emptySubtitle = "Photos and videos from your folders will appear here.",
  topInset,
}: Props) {
  const { selectedType, searchQuery, sortBy, sortOrder } = useMobileStore();

  const posts = useMemo(() => {
    return files.filter((file) => {
      if (selectedType !== "all" && file.type !== selectedType) return false;
      const terms = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
      if (terms.length > 0) {
        return terms.every(
          (t) =>
            file.name.toLowerCase().includes(t) ||
            file.folder.toLowerCase().includes(t)
        );
      }
      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") comparison = a.name.localeCompare(b.name);
      else if (sortBy === "size") comparison = a.size - b.size;
      else comparison = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [files, selectedType, searchQuery, sortBy, sortOrder]);

  const containerPadding = topInset !== undefined ? { paddingTop: topInset + 8 } : null;

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.path}
      numColumns={COLS}
      contentContainerStyle={[styles.list, containerPadding]}
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
            tintColor="#818cf8"
            colors={["#818cf8", "#6366f1"]}
            progressBackgroundColor="#1e293b"
            progressViewOffset={topInset ? topInset + 8 : 0}
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
