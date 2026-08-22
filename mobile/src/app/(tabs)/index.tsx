import React from "react";
import { useMobileStore } from "../../store/useMobileStore";
import { MediaLibraryScreen } from "../../components/MediaLibraryScreen";

export default function GalleryScreen() {
  const { files, scanMedia, isScanning } = useMobileStore();

  return (
    <MediaLibraryScreen
      title="Media Gallery"
      files={files}
      onRefresh={() => scanMedia(true)}
      isRefreshing={isScanning}
      showUpload
      showIndexing
    />
  );
}
