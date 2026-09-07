import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, StatusBar, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useMobileStore, type MediaFile } from "../store/useMobileStore";
import { applyFolderFilter } from "../lib/folder-filter";
import { useScrollChrome } from "../hooks/useScrollChrome";
import { IndexingProgressBanner } from "./IndexingProgressBanner";
import { MediaControlsHeader } from "./MediaControlsHeader";
import { MediaListRenderer } from "./MediaListRenderer";
import { InstagramFeed } from "./InstagramFeed";
import { FilePreviewModal } from "./preview/FilePreviewModal";
import { MediaUploadSheet } from "./MediaUploadSheet";

interface Props {
  title: string;
  files: MediaFile[];
  onRefresh: () => void;
  isRefreshing: boolean;
  showUpload?: boolean;
  showIndexing?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyIcon?: React.ReactNode;
}

const CHROME_MS = 220;

export function MediaLibraryScreen({
  title,
  files,
  onRefresh,
  isRefreshing,
  showUpload = false,
  showIndexing = false,
  emptyTitle,
  emptySubtitle,
  emptyIcon,
}: Props) {
  const { folders, galleryLayout, folderFilterEnabled, selectedFolders } = useMobileStore();
  const { chromeVisible, onScroll } = useScrollChrome();
  const insets = useSafeAreaInsets();
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const estimatedHeaderHeight = Math.max(insets.top, 8) + 160;
  const headerHeight = useSharedValue(estimatedHeaderHeight);
  const [staticHeaderHeight, setStaticHeaderHeight] = useState(estimatedHeaderHeight);
  const chrome = useSharedValue(1);
  const visibleFiles = useMemo(
    () => applyFolderFilter(files, folderFilterEnabled, selectedFolders),
    [files, folderFilterEnabled, selectedFolders]
  );

  useEffect(() => {
    chrome.value = withTiming(chromeVisible ? 1 : 0, {
      duration: CHROME_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [chrome, chromeVisible]);

  const headerAnim = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(chrome.value, [0, 1], [-headerHeight.value - 30, 0]) },
    ],
    opacity: chrome.value,
  }));

  const canUpload = showUpload && folders.length > 0;
  const heading = galleryLayout === "feed" && title === "Media Gallery" ? "Grid" : title;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <Animated.View
        pointerEvents={chromeVisible ? "auto" : "none"}
        style={[styles.chrome, headerAnim]}
        onLayout={(event) => {
          const next = Math.round(event.nativeEvent.layout.height);
          if (next > 0) {
            headerHeight.value = next;
            if (Math.abs(next - staticHeaderHeight) > 1) {
              setStaticHeaderHeight(next);
            }
          }
        }}
      >
        <MediaControlsHeader
          title={heading}
          itemCount={visibleFiles.length}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          onUpload={canUpload ? () => setUploadOpen(true) : undefined}
        />
        {showIndexing ? <IndexingProgressBanner /> : null}
      </Animated.View>

      <View style={styles.body}>
        {galleryLayout === "feed" ? (
          <InstagramFeed
            files={visibleFiles}
            onSelectFile={setSelectedFile}
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            onScroll={onScroll}
            emptyTitle={emptyTitle}
            emptySubtitle={emptySubtitle}
            topInset={staticHeaderHeight}
          />
        ) : (
          <MediaListRenderer
            files={visibleFiles}
            onSelectFile={setSelectedFile}
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            onScroll={onScroll}
            emptyTitle={emptyTitle}
            emptySubtitle={emptySubtitle}
            emptyIcon={emptyIcon}
            topInset={staticHeaderHeight}
          />
        )}
      </View>

      <FilePreviewModal
        file={selectedFile}
        onClose={() => setSelectedFile(null)}
        playlist={visibleFiles}
      />
      <MediaUploadSheet visible={uploadOpen} onClose={() => setUploadOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  chrome: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    backgroundColor: "transparent",
  },
  body: {
    flex: 1,
  },
});
