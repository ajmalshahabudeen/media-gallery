import React, { useState } from "react";
import { StyleSheet, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMobileStore, MediaFile } from "../../store/useMobileStore";
import { IndexingProgressBanner } from "../../components/IndexingProgressBanner";
import { MediaControlsHeader } from "../../components/MediaControlsHeader";
import { MediaListRenderer } from "../../components/MediaListRenderer";
import { InstagramFeed } from "../../components/InstagramFeed";
import { FilePreviewModal } from "../../components/preview/FilePreviewModal";
import { MediaUploadSheet } from "../../components/MediaUploadSheet";

export default function GalleryScreen() {
  const { files, folders, scanMedia, isScanning, galleryLayout } = useMobileStore();
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const canUpload = folders.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <MediaControlsHeader
        title={galleryLayout === "feed" ? "Grid" : "Media Gallery"}
        itemCount={files.length}
        onRefresh={() => scanMedia(true)}
        isRefreshing={isScanning}
        onUpload={canUpload ? () => setUploadOpen(true) : undefined}
      />

      <IndexingProgressBanner />

      {galleryLayout === "feed" ? (
        <InstagramFeed
          files={files}
          onSelectFile={setSelectedFile}
          refreshing={isScanning}
          onRefresh={() => scanMedia(true)}
        />
      ) : (
        <MediaListRenderer
          files={files}
          onSelectFile={setSelectedFile}
          refreshing={isScanning}
          onRefresh={() => scanMedia(true)}
        />
      )}

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
});
