"use client";

import { useMediaStore } from "@/store/useMediaStore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Folder, File } from "lucide-react";

export function IndexingProgressBanner() {
  const { isScanning, indexingProgress, unmountedFolders } = useMediaStore();

  return (
    <div className="flex flex-col gap-3">
      {unmountedFolders && unmountedFolders.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <span>⚠️ External Volume / Folder Not Mounted</span>
            </div>
            <p className="text-xs">
              The following configured folder(s) were not found inside the container environment:
            </p>
            <div className="flex flex-col gap-1">
              {unmountedFolders.map((uf, idx) => (
                <div key={idx} className="text-xs font-mono bg-background/50 px-2 py-1 rounded border border-amber-500/30">
                  {uf.path} — <span className="opacity-80">{uf.error}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] opacity-90 mt-1">
              Tip: Set <code className="font-mono bg-background/60 px-1 py-0.5 rounded">HOST_MEDIA_PATH</code> in environment variables or copy media into your project directory.
            </p>
          </CardContent>
        </Card>
      )}

      {(isScanning || indexingProgress.isIndexing) && (
        <Card className="border-primary/30 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
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
                  <span className="font-bold text-foreground text-sm">{indexingProgress.scannedFiles.toLocaleString()}</span>
                </div>
                <div className="h-3 w-px bg-border" />
                <div>
                  <span className="text-muted-foreground">Folders: </span>
                  <span className="font-bold text-foreground text-sm">{indexingProgress.scannedFolders.toLocaleString()}</span>
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
              {indexingProgress.currentFolder && (
                <div className="flex items-center gap-1.5 truncate max-w-md" title={indexingProgress.currentFolder}>
                  <Folder className="size-3.5 text-primary shrink-0" />
                  <span className="truncate">Scanning: <strong className="text-foreground">{indexingProgress.currentFolder}</strong></span>
                </div>
              )}

              {indexingProgress.latestFile && (
                <div className="flex items-center gap-1.5 truncate max-w-sm" title={indexingProgress.latestFile}>
                  <File className="size-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">Latest: <span className="font-mono text-foreground">{indexingProgress.latestFile}</span></span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
