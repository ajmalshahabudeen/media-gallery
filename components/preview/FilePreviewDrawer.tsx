"use client";

import React, { useEffect } from "react";
import { MediaFile, useMediaStore } from "@/store/useMediaStore";
import { formatFileSize } from "@/lib/formatSize";
import { VideoPreview } from "./VideoPreview";
import { PhotoPreview } from "./PhotoPreview";
import { AudioPreview } from "./AudioPreview";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Calendar,
  HardDrive,
  Folder,
  Info,
  X,
  Star,
} from "lucide-react";

interface FilePreviewDrawerProps {
  file: MediaFile | null;
  onClose: () => void;
}

export function FilePreviewDrawer({ file, onClose }: FilePreviewDrawerProps) {
  const { favorites, toggleFavorite } = useMediaStore();

  useEffect(() => {
    if (file) {
      fetch("/api/media/log-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          path: file.path,
          type: file.type,
        }),
      }).catch(() => {});
    }
  }, [file]);

  if (!file) return null;

  const isFavorite = favorites.some((f) => f.path === file.path);
  const fileUrl = `/api/media/file?path=${encodeURIComponent(file.path)}`;

  const renderMediaContent = () => {
    switch (file.type) {
      case "video":
        return <VideoPreview src={fileUrl} title={file.name} />;
      case "image":
        return <PhotoPreview src={fileUrl} title={file.name} />;
      case "audio":
        return <AudioPreview src={fileUrl} title={file.name} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center p-12 bg-muted/20 border rounded-2xl gap-4 text-center my-auto">
            <div className="size-20 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground shadow-sm">
              <FileText className="size-10" />
            </div>
            <div>
              <h4 className="font-bold text-lg">{file.name}</h4>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                Document / Binary File ({file.extension || "unknown"})
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <Drawer open={!!file} onOpenChange={(open) => !open && onClose()} showSwipeHandle={true}>
      <DrawerContent className="h-dvh max-h-dvh w-full rounded-t-2xl sm:rounded-t-3xl flex flex-col bg-background p-0 border-t shadow-2xl overflow-hidden">
        {/* Sticky Mobile-Friendly Header */}
        <DrawerHeader className="flex flex-row items-center justify-between gap-4 p-4 border-b bg-card shrink-0">
          <div className="flex flex-col gap-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="uppercase text-[10px] shrink-0 font-mono">
                {file.extension.replace(".", "") || file.type}
              </Badge>
              <DrawerTitle className="text-base sm:text-lg font-bold truncate tracking-normal normal-case" title={file.name}>
                {file.name}
              </DrawerTitle>
            </div>
            <DrawerDescription className="text-xs truncate font-mono text-muted-foreground text-left" title={file.path}>
              {file.path}
            </DrawerDescription>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleFavorite(file)}
              className="gap-1.5 rounded-full border shadow-xs"
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            >
              <Star
                className={`size-4 transition-colors ${
                  isFavorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                }`}
              />
              <span className="text-xs font-semibold hidden sm:inline">
                {isFavorite ? "Favorited" : "Favorite"}
              </span>
            </Button>

            <DrawerClose render={
              <Button variant="ghost" size="icon-sm" onClick={onClose} className="rounded-full">
                <X className="size-5" />
              </Button>
            } />
          </div>
        </DrawerHeader>

        {/* Main Media Preview Area */}
        {file.type === "video" ? (
          /* Immersive full-height video player — no scroll, no padding */
          <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
            {renderMediaContent()}
          </div>
        ) : (
          /* Standard scrollable centered layout for images, audio, docs */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col justify-center items-center bg-muted/10">
            <div className="w-full max-w-5xl my-auto">
              {renderMediaContent()}
            </div>
          </div>
        )}

        {/* Bottom Details Drawer / Footer Panel */}
        <div className="border-t bg-card p-4 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border">
              <HardDrive className="size-4 text-primary shrink-0" />
              <div className="flex flex-col truncate">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Size</span>
                <span className="font-bold text-xs">{formatFileSize(file.size)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border">
              <Info className="size-4 text-primary shrink-0" />
              <div className="flex flex-col truncate">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Type</span>
                <span className="font-bold text-xs truncate">{file.mimeType}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border">
              <Folder className="size-4 text-primary shrink-0" />
              <div className="flex flex-col truncate">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Folder</span>
                <span className="font-bold text-xs truncate">{file.folder}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border">
              <Calendar className="size-4 text-primary shrink-0" />
              <div className="flex flex-col truncate">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Modified</span>
                <span className="font-bold text-xs">
                  {new Date(file.modifiedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
