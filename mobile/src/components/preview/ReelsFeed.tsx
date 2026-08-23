import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  ViewToken,
  StatusBar,
  Platform,
} from "react-native";
import { useNavigation, useFocusEffect } from "expo-router";
import { Clapperboard, RefreshCw } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch } from "../../lib/api";
import { useMobileStore, type MediaFile } from "../../store/useMobileStore";
import { ReelItem, type ReelItemData } from "./ReelItem";
import { FilePreviewModal } from "./FilePreviewModal";
import { instagramTabBarStyle } from "../tab-bar-style";

type ReelsFilter = "all" | "favorites";

interface ReelsResponse {
  videos: ReelItemData[];
  total: number;
  hasMore: boolean;
  filter: string;
}

const WINDOW = Dimensions.get("window");

export function ReelsFeed() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {
    serverUrl,
    favorites,
    toggleFavorite,
    fetchFavorites,
  } = useMobileStore();

  const listRef = useRef<FlatList<ReelItemData>>(null);
  const [filter, setFilter] = useState<ReelsFilter>("all");
  const [videos, setVideos] = useState<ReelItemData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [pageHeight, setPageHeight] = useState(WINDOW.height);
  const [isFocused, setIsFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => setIsFocused(true), 40);
      return () => {
        clearTimeout(timer);
        setIsFocused(false);
      };
    }, [])
  );

  const lastOffsetY = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const favoritePaths = useRef(new Set<string>());
  const loadingMoreLock = useRef(false);
  const filterRef = useRef<ReelsFilter>(filter);

  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  const setTabBarHidden = useMobileStore((s) => s.setTabBarHidden);

  useEffect(() => {
    if (!isFocused) return;
    setTabBarHidden(!chromeVisible);
    navigation.setOptions({
      tabBarStyle: instagramTabBarStyle(chromeVisible, insets.bottom),
    });
  }, [chromeVisible, isFocused, insets.bottom, navigation, setTabBarHidden]);

  useEffect(() => {
    return () => {
      setTabBarHidden(false);
      try {
        navigation.setOptions({ tabBarStyle: instagramTabBarStyle(true, insets.bottom) });
      } catch {
        // ignore
      }
    };
  }, [navigation, setTabBarHidden]);

  useEffect(() => {
    void fetchFavorites();
  }, [fetchFavorites]);

  useEffect(() => {
    favoritePaths.current = new Set(
      favorites.filter((f) => f.type === "video").map((f) => f.path)
    );
    setVideos((prev) =>
      prev.map((v) => ({
        ...v,
        isFavorite: favoritePaths.current.has(v.path),
      }))
    );
  }, [favorites]);

  const loadReels = useCallback(
    async (opts: {
      filter: ReelsFilter;
      offset?: number;
      append?: boolean;
      reshuffle?: boolean;
    }) => {
      const { filter: f, offset = 0, append = false, reshuffle = false } = opts;
      if (append) {
        if (loadingMoreLock.current) return;
        loadingMoreLock.current = true;
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
      }

      try {
        const params = new URLSearchParams({
          filter: f,
          limit: "30",
          offset: String(offset),
        });
        if (reshuffle) params.set("reshuffle", "true");

        const res = await apiFetch(`/api/media/reels?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load reels");
        const data = (await res.json()) as ReelsResponse;

        const mapped = (data.videos || []).map((v) => ({
          ...v,
          type: "video" as const,
          isFavorite: favoritePaths.current.has(v.path) || !!v.isFavorite,
        }));

        setVideos((prev) => (append ? [...prev, ...mapped] : mapped));
        setHasMore(!!data.hasMore);
        setTotal(data.total || mapped.length);
        if (!append) {
          setActiveIndex(0);
          requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: false });
          });
        }
      } catch {
        if (!append) {
          setError("Could not load reels. Scan your media library first.");
          setVideos([]);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        loadingMoreLock.current = false;
      }
    },
    []
  );

  useEffect(() => {
    void loadReels({ filter, reshuffle: false });
  }, [filter, loadReels]);

  // Prefetch near end
  useEffect(() => {
    if (!hasMore || isLoadingMore || isLoading) return;
    if (activeIndex < videos.length - 4) return;
    if (loadingMoreLock.current) return;
    void loadReels({
      filter: filterRef.current,
      offset: videos.length,
      append: true,
    });
  }, [activeIndex, videos.length, hasMore, isLoadingMore, isLoading, loadReels]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!viewableItems?.length) return;
      const top = viewableItems.find((v) => v.isViewable && v.index != null);
      if (top?.index != null) {
        setActiveIndex(top.index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70,
  }).current;

  const handleScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y as number;
    const delta = y - lastOffsetY.current;

    if (Math.abs(delta) > 8) {
      if (delta > 0 && y > 40) {
        setChromeVisible(false);
      } else if (delta < 0) {
        setChromeVisible(true);
      }
      lastOffsetY.current = y;
    }

    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (y > 40) {
      hideTimer.current = setTimeout(() => setChromeVisible(false), 1600);
    } else {
      setChromeVisible(true);
    }
  };

  const handleToggleFavorite = async (reel: ReelItemData) => {
    const file: MediaFile = {
      id: reel.id,
      name: reel.name,
      path: reel.path,
      folder: reel.folder,
      size: reel.size,
      extension: reel.extension,
      type: "video",
      mimeType: reel.mimeType || "video/mp4",
      modifiedAt: reel.modifiedAt,
    };

    setVideos((prev) =>
      prev.map((v) =>
        v.path === reel.path ? { ...v, isFavorite: !v.isFavorite } : v
      )
    );

    const ok = await toggleFavorite(file);
    if (!ok) {
      setVideos((prev) =>
        prev.map((v) =>
          v.path === reel.path ? { ...v, isFavorite: !!reel.isFavorite } : v
        )
      );
    } else if (filter === "favorites" && reel.isFavorite) {
      setVideos((prev) => prev.filter((v) => v.path !== reel.path));
    }
  };

  const handleOpenInGallery = (reel: ReelItemData) => {
    setPreviewFile({
      id: reel.id,
      name: reel.name,
      path: reel.path,
      folder: reel.folder,
      size: reel.size,
      extension: reel.extension,
      type: "video",
      mimeType: reel.mimeType || "video/mp4",
      modifiedAt: reel.modifiedAt,
    });
  };

  const handleFilterChange = (next: ReelsFilter) => {
    if (next === filter) return;
    setFilter(next);
    setChromeVisible(true);
  };

  const renderItem = useCallback(
    ({ item, index }: { item: ReelItemData; index: number }) => (
      <ReelItem
        reel={item}
        isActive={isFocused && !previewFile && index === activeIndex}
        isMuted={isMuted}
        serverUrl={serverUrl}
        height={pageHeight}
        onToggleMute={() => setIsMuted((m) => !m)}
        onToggleFavorite={handleToggleFavorite}
        onOpenInGallery={handleOpenInGallery}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeIndex, isFocused, previewFile, isMuted, serverUrl, pageHeight]
  );

  const keyExtractor = useCallback(
    (item: ReelItemData, index: number) => `${item.path}-${index}`,
    []
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: pageHeight,
      offset: pageHeight * index,
      index,
    }),
    [pageHeight]
  );

  return (
    <View
      style={styles.root}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0 && Math.abs(h - pageHeight) > 2) setPageHeight(h);
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Top filter chrome — auto-hides on scroll */}
      <View
        pointerEvents={chromeVisible ? "box-none" : "none"}
        style={[
          styles.chrome,
          {
            paddingTop: Math.max(insets.top, Platform.OS === "android" ? 12 : 8) + 4,
            opacity: chromeVisible ? 1 : 0,
            transform: [{ translateY: chromeVisible ? 0 : -80 }],
          },
        ]}
      >
        <View style={styles.chromeRow}>
          <View style={styles.segment}>
            <TouchableOpacity
              onPress={() => handleFilterChange("all")}
              style={[styles.segmentBtn, filter === "all" && styles.segmentBtnActive]}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.segmentText,
                  filter === "all" && styles.segmentTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleFilterChange("favorites")}
              style={[
                styles.segmentBtn,
                filter === "favorites" && styles.segmentBtnActive,
              ]}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.segmentText,
                  filter === "favorites" && styles.segmentTextActive,
                ]}
              >
                Favorites
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chromeRight}>
            {total > 0 ? (
              <Text style={styles.counter}>
                {Math.min(activeIndex + 1, total)}/{total}
              </Text>
            ) : null}
            <TouchableOpacity
              style={styles.shuffleBtn}
              onPress={() => void loadReels({ filter, reshuffle: true })}
              activeOpacity={0.85}
            >
              <RefreshCw size={14} color="#fff" />
              <Text style={styles.shuffleText}>Shuffle</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading reels…</Text>
        </View>
      ) : null}

      {!isLoading && videos.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Clapperboard size={48} color="rgba(255,255,255,0.5)" />
          </View>
          <Text style={styles.emptyTitle}>
            {filter === "favorites" ? "No favorite videos yet" : "No videos found"}
          </Text>
          <Text style={styles.emptyBody}>
            {error ||
              (filter === "favorites"
                ? "Like videos from All reels or the gallery to see them here."
                : "Add media folders in Settings and scan your library first.")}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => void loadReels({ filter, reshuffle: true })}
          >
            <RefreshCw size={16} color="#000000" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!isLoading && videos.length > 0 ? (
        <FlatList
          ref={listRef}
          data={videos}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          pagingEnabled
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          snapToInterval={pageHeight}
          snapToAlignment="start"
          disableIntervalMomentum
          getItemLayout={getItemLayout}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          windowSize={3}
          maxToRenderPerBatch={2}
          initialNumToRender={1}
          removeClippedSubviews
          ListFooterComponent={
            isLoadingMore ? (
              <View style={{ height: 64, justifyContent: "center" }}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : null
          }
        />
      ) : null}

      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        playlist={videos}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  chrome: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    paddingHorizontal: 12,
    paddingBottom: 28,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  chromeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 4,
  },
  segmentBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
  },
  segmentBtnActive: {
    backgroundColor: "#fff",
  },
  segmentText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "700",
  },
  segmentTextActive: {
    color: "#000",
  },
  chromeRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  counter: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  shuffleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  shuffleText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    gap: 10,
  },
  loadingText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    marginTop: 8,
  },
  emptyIcon: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 6,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyBody: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 320,
  },
  retryBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#e5e5e5",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: "#000000",
    fontWeight: "700",
    fontSize: 13,
  },
});
