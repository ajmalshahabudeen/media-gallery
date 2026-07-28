import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Search,
  RefreshCw,
  LayoutGrid,
  List,
  Image as ImageIcon,
  Film,
  Music,
  SlidersHorizontal,
} from "lucide-react-native";
import { useMobileStore, MediaFile } from "../../store/useMobileStore";
import { IndexingProgressBanner } from "../../components/IndexingProgressBanner";
import { MediaCard } from "../../components/preview/MediaCard";
import { FilePreviewModal } from "../../components/preview/FilePreviewModal";

export default function GalleryScreen() {
  const {
    files,
    selectedType,
    setSelectedType,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    sortBy,
    sortOrder,
    scanMedia,
    isScanning,
  } = useMobileStore();

  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);

  // Filter files by type and search query
  const filteredFiles = files.filter((file) => {
    if (selectedType !== "all" && file.type !== selectedType) {
      return false;
    }
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      return (
        file.name.toLowerCase().includes(q) ||
        file.folder.toLowerCase().includes(q) ||
        file.extension.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Sort files
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    let comparison = 0;
    if (sortBy === "name") {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === "size") {
      comparison = a.size - b.size;
    } else if (sortBy === "date") {
      comparison =
        new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Top Bar Header */}
      <View style={styles.topHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Media Gallery</Text>
          <Text style={styles.headerSub}>{sortedFiles.length} items</Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => scanMedia(true)}
            disabled={isScanning}
          >
            <RefreshCw size={18} color={isScanning ? "#818cf8" : "#94a3b8"} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            {viewMode === "grid" ? (
              <List size={18} color="#94a3b8" />
            ) : (
              <LayoutGrid size={18} color="#94a3b8" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Indexing Banner */}
      <IndexingProgressBanner />

      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <Search size={16} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search photos, videos, audio..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Type Chips */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, selectedType === "all" && styles.filterChipActive]}
          onPress={() => setSelectedType("all")}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedType === "all" && styles.filterChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, selectedType === "image" && styles.filterChipActive]}
          onPress={() => setSelectedType("image")}
        >
          <ImageIcon size={12} color={selectedType === "image" ? "#ffffff" : "#94a3b8"} />
          <Text
            style={[
              styles.filterChipText,
              selectedType === "image" && styles.filterChipTextActive,
            ]}
          >
            Photos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, selectedType === "video" && styles.filterChipActive]}
          onPress={() => setSelectedType("video")}
        >
          <Film size={12} color={selectedType === "video" ? "#ffffff" : "#94a3b8"} />
          <Text
            style={[
              styles.filterChipText,
              selectedType === "video" && styles.filterChipTextActive,
            ]}
          >
            Videos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, selectedType === "audio" && styles.filterChipActive]}
          onPress={() => setSelectedType("audio")}
        >
          <Music size={12} color={selectedType === "audio" ? "#ffffff" : "#94a3b8"} />
          <Text
            style={[
              styles.filterChipText,
              selectedType === "audio" && styles.filterChipTextActive,
            ]}
          >
            Audio
          </Text>
        </TouchableOpacity>
      </View>

      {/* Media Grid / List */}
      <FlatList
        key={viewMode === "grid" ? "grid-2" : "list-1"}
        data={sortedFiles}
        keyExtractor={(item) => item.path}
        numColumns={viewMode === "grid" ? 2 : 1}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isScanning}
            onRefresh={() => scanMedia(true)}
            tintColor="#818cf8"
            colors={["#818cf8"]}
          />
        }
        renderItem={({ item }) => (
          <MediaCard
            file={item}
            viewMode={viewMode}
            onPress={() => setSelectedFile(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ImageIcon size={48} color="#334155" />
            <Text style={styles.emptyTitle}>No Media Files Found</Text>
            <Text style={styles.emptySub}>
              Make sure your server folders are configured in Settings.
            </Text>
          </View>
        }
      />

      {/* File Preview Drawer / Modal */}
      <FilePreviewModal
        file={selectedFile}
        onClose={() => setSelectedFile(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  titleContainer: {},
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f8fafc",
  },
  headerSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  topActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    backgroundColor: "#1e293b",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 13,
    paddingVertical: 10,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginVertical: 6,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1e293b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  filterChipActive: {
    backgroundColor: "#4f46e5",
    borderColor: "#6366f1",
  },
  filterChipText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#cbd5e1",
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
