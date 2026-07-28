import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Star } from "lucide-react-native";
import { useMobileStore, MediaFile } from "../../store/useMobileStore";
import { MediaCard } from "../../components/preview/MediaCard";
import { FilePreviewModal } from "../../components/preview/FilePreviewModal";

export default function FavoritesScreen() {
  const { favorites, fetchFavorites, viewMode } = useMobileStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFavorites();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Favorites</Text>
        <Text style={styles.subtitle}>{favorites.length} starred items</Text>
      </View>

      <FlatList
        key={viewMode === "grid" ? "fav-grid-2" : "fav-list-1"}
        data={favorites}
        keyExtractor={(item) => item.path}
        numColumns={viewMode === "grid" ? 2 : 1}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#818cf8"
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
            <Star size={48} color="#334155" />
            <Text style={styles.emptyTitle}>No Favorites Yet</Text>
            <Text style={styles.emptySub}>
              Tap the star icon on any media item to add it to your favorites.
            </Text>
          </View>
        }
      />

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
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f8fafc",
  },
  subtitle: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
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
    paddingHorizontal: 36,
  },
});
