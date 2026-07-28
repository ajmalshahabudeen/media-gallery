import React, { useState, useEffect } from "react";
import { StyleSheet, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Star } from "lucide-react-native";
import { useMobileStore, MediaFile } from "../../store/useMobileStore";
import { MediaControlsHeader } from "../../components/MediaControlsHeader";
import { MediaListRenderer } from "../../components/MediaListRenderer";
import { FilePreviewModal } from "../../components/preview/FilePreviewModal";

export default function FavoritesScreen() {
  const { favorites, fetchFavorites } = useMobileStore();
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
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Top Header & Search/Filter/Group Controls */}
      <MediaControlsHeader
        title="Favorites"
        itemCount={favorites.length}
        onRefresh={handleRefresh}
        isRefreshing={refreshing}
      />

      {/* Sectioned or Flat Media Grid/List */}
      <MediaListRenderer
        files={favorites}
        onSelectFile={setSelectedFile}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        emptyTitle="No Favorites Yet"
        emptySubtitle="Tap the star icon on any photo, video, or audio file to add it to your favorites."
        emptyIcon={<Star size={48} color="#334155" />}
      />

      {/* Full-Screen Media Player & Viewer Modal */}
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
});
