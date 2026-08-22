import React, { useEffect, useState } from "react";
import { StyleSheet, StatusBar, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useMobileStore, type MediaFile } from "../store/useMobileStore";
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
  const { folders, galleryLayout } = useMobileStore();
  const { chromeVisible, onScroll } = useScrollChrome();
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(200);
  const chrome = useSharedValue(1);

  useEffect(() => {
    chrome.value = withTiming(chromeVisible ? 1 : 0, {
      duration: CHROME_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [chrome, chromeVisible]);

  const headerAnim = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(chrome.value, [0, 1], [-headerHeight, 0]) },
    ],
    opacity: chrome.value,
  }));

  const bodyAnim = useAnimatedStyle(() => ({
    paddingTop: interpolate(chrome.value, [0, 1], [0, headerHeight]),
  }));

  const canUpload = showUpload && folders.length > 0;
  const heading = galleryLayout === "feed" && title === "Media Gallery" ? "Grid" : title;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <Animated.View
        pointerEvents={chromeVisible ? "auto" : "none"}
        style={[styles.chrome, headerAnim]}
        onLayout={(event) => {
          const next = event.nativeEvent.layout.height;
          if (next > 0 && Math.abs(next - headerHeight) > 1) {
            setHeaderHeight(next);
          }
        }}
      >
        <MediaControlsHeader
          title={heading}
          itemCount={files.length}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          onUpload={canUpload ? () => setUploadOpen(true) : undefined}
        />
        {showIndexing ? <IndexingProgressBanner /> : null}
      </Animated.View>

      <Animated.View style={[styles.body, bodyAnim]}>
        {galleryLayout === "feed" ? (
          <InstagramFeed
            files={files}
            onSelectFile={setSelectedFile}
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            onScroll={onScroll}
            emptyTitle={emptyTitle}
            emptySubtitle={emptySubtitle}
          />
        ) : (
          <MediaListRenderer
            files={files}
            onSelectFile={setSelectedFile}
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            onScroll={onScroll}
            emptyTitle={emptyTitle}
            emptySubtitle={emptySubtitle}
            emptyIcon={emptyIcon}
          />
        )}
      </Animated.View>

      <FilePreviewModal file={selectedFile} onClose={() => setSelectedFile(null)} />
      <MediaUploadSheet visible={uploadOpen} onClose={() => setUploadOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  chrome: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    backgroundColor: "#0f172a",
  },
  body: {
    flex: 1,
  },
});
