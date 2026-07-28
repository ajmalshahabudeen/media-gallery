import React, { useState } from "react";
import { StyleSheet, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMobileStore, MediaFile } from "../../store/useMobileStore";
import { IndexingProgressBanner } from "../../components/IndexingProgressBanner";
import { MediaControlsHeader } from "../../components/MediaControlsHeader";
import { MediaListRenderer } from "../../components/MediaListRenderer";
import { FilePreviewModal } from "../../components/preview/FilePreviewModal";

export default function GalleryScreen() {
  const { files, scanMedia, isScanning } = useMobileStore();
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Top Header & Search/Filter/Group Controls */}
      <MediaControlsHeader
        title="Media Gallery"
        itemCount={files.length}
        onRefresh={() => scanMedia(true)}
        isRefreshing={isScanning}
      />

      {/* Real-time Indexing Banner */}
      <IndexingProgressBanner />

      {/* Sectioned or Flat Media Grid/List */}
      <MediaListRenderer
        files={files}
        onSelectFile={setSelectedFile}
        refreshing={isScanning}
        onRefresh={() => scanMedia(true)}
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
