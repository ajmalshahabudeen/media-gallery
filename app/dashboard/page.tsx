"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useMediaStore } from "@/store/useMediaStore";
import { MediaGalleryGrid } from "@/components/preview/MediaGalleryGrid";
import { IndexingProgressBanner } from "@/components/IndexingProgressBanner";
import { Button } from "@/components/ui/button";
import { RefreshCw, Settings } from "lucide-react";

export default function DashboardGalleryPage() {
  const { files, isScanning, scanMedia, fetchFolders, fetchFavorites } = useMediaStore();

  useEffect(() => {
    fetchFolders();
    fetchFavorites();
    scanMedia();
  }, [fetchFolders, fetchFavorites, scanMedia]);

  useEffect(() => {
    if (files.length > 0) {
      fetch("/api/media/enqueue-previews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      }).catch(() => {});
    }
  }, [files]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Media Gallery</h1>
          <p className="text-sm text-muted-foreground">
            Browse and view all media files indexed by the scanner ({files.length} items)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => scanMedia(true)}
            disabled={isScanning}
            className="gap-2"
          >
            <RefreshCw className={`size-4 ${isScanning ? "animate-spin" : ""}`} />
            <span>{isScanning ? "Scanning..." : "Scan Media"}</span>
          </Button>

          <Link href="/dashboard/settings">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="size-4" />
              <span>Configure Folders</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Live Indexing Progress Banner */}
      <IndexingProgressBanner />

      {/* Media Gallery Grid with GroupBy, SortBy & ViewModes */}
      <MediaGalleryGrid files={files} showFolders={true} />
    </div>
  );
}
