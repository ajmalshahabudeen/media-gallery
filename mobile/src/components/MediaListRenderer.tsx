import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SectionList,
  RefreshControl,
} from "react-native";
import { Image as ImageIcon } from "lucide-react-native";
import { MediaFile, useMobileStore } from "../store/useMobileStore";
import { groupMediaFiles, MediaSection } from "../lib/groupMedia";
import { MediaCard } from "./preview/MediaCard";

interface Props {
  files: MediaFile[];
  onSelectFile: (file: MediaFile) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyIcon?: React.ReactNode;
}

export const MediaListRenderer: React.FC<Props> = ({
  files,
  onSelectFile,
  refreshing = false,
  onRefresh,
  emptyTitle = "No Media Files Found",
  emptySubtitle = "Make sure your server folders are configured in Settings.",
  emptyIcon,
}) => {
  const {
    selectedType,
    searchQuery,
    sortBy,
    sortOrder,
    groupBy,
    viewMode,
  } = useMobileStore();

  // Filter files by selected type and search query
  const filteredFiles = files.filter((file) => {
    if (selectedType !== "all" && file.type !== selectedType) {
      return false;
    }
    const terms = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length > 0) {
      return terms.every(
        (term) =>
          file.name.toLowerCase().includes(term) ||
          file.folder.toLowerCase().includes(term) ||
          (file.extension && file.extension.toLowerCase().includes(term)) ||
          (file.type && file.type.toLowerCase().includes(term))
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

  // Group files into sections
  const sections = groupMediaFiles(sortedFiles, groupBy);

  // If groupBy is "none", render standard FlatList
  if (groupBy === "none") {
    return (
      <FlatList
        key={viewMode === "grid" ? "grid-2" : "list-1"}
        data={sortedFiles}
        keyExtractor={(item) => item.path}
        numColumns={viewMode === "grid" ? 2 : 1}
        contentContainerStyle={styles.listContent}
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
          <MediaCard
            file={item}
            viewMode={viewMode}
            onPress={() => onSelectFile(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {emptyIcon || <ImageIcon size={48} color="#334155" />}
            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
            <Text style={styles.emptySub}>{emptySubtitle}</Text>
          </View>
        }
      />
    );
  }

  // Helper to chunk grid items for section list rows if in grid view
  const renderSection = ({ section }: { section: MediaSection }) => {
    return null; // Handled via SectionList
  };

  return (
    <SectionList
      key={viewMode === "grid" ? "section-grid-2" : "section-list-1"}
      sections={sections}
      keyExtractor={(item) => item.path}
      contentContainerStyle={styles.listContent}
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
      renderSectionHeader={({ section: { title, data } }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionBadge}>{data.length}</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <MediaCard
          file={item}
          viewMode={viewMode}
          onPress={() => onSelectFile(item)}
        />
      )}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          {emptyIcon || <ImageIcon size={48} color="#334155" />}
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptySub}>{emptySubtitle}</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1e293b",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 14,
    marginBottom: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#334155",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#818cf8",
  },
  sectionBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    backgroundColor: "#0f172a",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
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
