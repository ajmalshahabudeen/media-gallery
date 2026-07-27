"use client";

import { useMediaStore } from "@/store/useMediaStore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Folder, File } from "lucide-react";

export function IndexingProgressBanner() {
  const { isScanning, indexingProgress } = useMediaStore();

  if (!isScanning && !indexingProgress.isIndexing) {
    return null;
  }

  const { scannedFiles, scannedFolders, currentFolder, latestFile } = indexingProgress;

  return (
    <Card className="border-primary/30 bg-linear-to-r from-primary/5 via-background to-primary/10 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="rounded-full p-2 bg-primary/15 text-primary animate-pulse">
              <RefreshCw className="size-4 animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Indexing Media Library...</span>
                <Badge variant="secondary" className="font-mono text-xs animate-pulse">
                  Live
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Scanning configured directories for images, videos, and audio files
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono bg-muted/40 rounded-lg px-3 py-1.5 border">
            <div>
              <span className="text-muted-foreground">Files: </span>
              <span className="font-bold text-foreground text-sm">{scannedFiles.toLocaleString()}</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <div>
              <span className="text-muted-foreground">Folders: </span>
              <span className="font-bold text-foreground text-sm">{scannedFolders.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Animated shimmer progress line */}
        <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden relative">
          <div className="absolute inset-0 bg-primary/80 animate-pulse rounded-full w-full" />
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        </div>

        {/* Live Detail info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-muted-foreground gap-1.5 pt-1">
          {currentFolder && (
            <div className="flex items-center gap-1.5 truncate max-w-md" title={currentFolder}>
              <Folder className="size-3.5 text-primary shrink-0" />
              <span className="truncate">Scanning: <strong className="text-foreground">{currentFolder}</strong></span>
            </div>
          )}

          {latestFile && (
            <div className="flex items-center gap-1.5 truncate max-w-sm" title={latestFile}>
              <File className="size-3.5 text-blue-500 shrink-0" />
              <span className="truncate">Latest: <span className="font-mono text-foreground">{latestFile}</span></span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
