import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { RefreshCw, FolderSearch } from "lucide-react-native";
import { useMobileStore } from "../store/useMobileStore";

export const IndexingProgressBanner: React.FC = () => {
  const { indexingProgress, isScanning } = useMobileStore();

  if (!isScanning && !indexingProgress.isIndexing) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color="#818cf8" />
          <Text style={styles.title}>Indexing Media Library...</Text>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {indexingProgress.scannedFiles} Files
          </Text>
        </View>
      </View>

      {indexingProgress.currentFolder ? (
        <View style={styles.pathRow}>
          <FolderSearch size={14} color="#94a3b8" />
          <Text style={styles.pathText} numberOfLines={1} ellipsizeMode="middle">
            {indexingProgress.currentFolder}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1e1b4b",
    borderColor: "#4338ca",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: "#c7d2fe",
  },
  badge: {
    backgroundColor: "#3730a3",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#e0e7ff",
  },
  pathRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  pathText: {
    fontSize: 11,
    color: "#94a3b8",
    flex: 1,
  },
});
