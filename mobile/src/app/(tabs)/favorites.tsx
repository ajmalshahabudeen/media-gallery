import React, { useEffect, useState } from "react";
import { Star } from "lucide-react-native";
import { useMobileStore } from "../../store/useMobileStore";
import { MediaLibraryScreen } from "../../components/MediaLibraryScreen";

export default function FavoritesScreen() {
  const { favorites, fetchFavorites } = useMobileStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void fetchFavorites();
  }, [fetchFavorites]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFavorites();
    setRefreshing(false);
  };

  return (
    <MediaLibraryScreen
      title="Favorites"
      files={favorites}
      onRefresh={handleRefresh}
      isRefreshing={refreshing}
      showUpload
      emptyTitle="No Favorites Yet"
      emptySubtitle="Tap the star icon on any photo, video, or audio file to add it to your favorites."
      emptyIcon={<Star size={48} color="#262626" />}
    />
  );
}
