"use client";

import React, { useState, useEffect } from "react";
import { MediaFile, useMediaStore } from "@/store/useMediaStore";
import { formatFileSize } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Play,
  Image as ImageIcon,
  Video as VideoIcon,
  Music as AudioIcon,
  FileText,
  Eye,
  Star,
} from "lucide-react";

interface MediaCardProps {
  file: MediaFile;
  viewMode: "list" | "small-cards" | "big-cards" | "detailed-cards" | "detailed-list";
  onClick: () => void;
}

export function MediaCard({ file, viewMode, onClick }: MediaCardProps) {
  const { favorites, toggleFavorite } = useMediaStore();
  const isFavorite = favorites.some((f) => f.path === file.path);

  const [isHovered, setIsHovered] = useState(false);
  const [isPcScreen, setIsPcScreen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(pointer: fine)").matches;
  });
  const [hoverImageLoaded, setHoverImageLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(pointer: fine)");
    const handler = (e: MediaQueryListEvent) => setIsPcScreen(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const thumbnailUrl = `/api/media/thumbnail?path=${encodeURIComponent(file.path)}`;
  const hoverUrl = `/api/media/hover?path=${encodeURIComponent(file.path)}`;

  const getMediaIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="size-5 text-blue-500" />;
      case "video":
        return <VideoIcon className="size-5 text-purple-500" />;
      case "audio":
        return <AudioIcon className="size-5 text-emerald-500" />;
      default:
        return <FileText className="size-5 text-gray-500" />;
    }
  };

  const renderFavoriteButton = (customClass = "absolute top-2 right-2 z-20") => (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(file);
      }}
      className={`size-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 hover:bg-black/80 hover:scale-110 transition-all ${customClass}`}
      title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
    >
      <Star
        className={`size-3.5 transition-colors ${
          isFavorite ? "fill-amber-400 text-amber-400" : "text-white/80 hover:text-white"
        }`}
      />
    </Button>
  );

  const renderCardThumbnail = (aspectClass: string = "aspect-video") => {
    if (file.type === "image") {
      return (
        <div className={`relative w-full ${aspectClass} overflow-hidden bg-muted/40 group-hover:brightness-95 transition-all`}>
          {renderFavoriteButton()}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailUrl}
            alt={file.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      );
    }

    if (file.type === "video") {
      return (
        <div className={`relative w-full ${aspectClass} overflow-hidden bg-slate-950 flex items-center justify-center border-b border-purple-500/10`}>
          {renderFavoriteButton()}
          {/* Base Poster Thumbnail (from Redis thumbnail cache) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailUrl}
            alt={file.name}
            loading="lazy"
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isHovered && isPcScreen && hoverImageLoaded ? "opacity-0" : "opacity-100"
            }`}
          />

          {/* PC Desktop Hover Sneak Peek: Instant Video Stream + WebP Overlay */}
          {isPcScreen && isHovered && (
            <>
              {/* Instant Video Stream Preview */}
              <video
                src={`/api/media/file?path=${encodeURIComponent(file.path)}`}
                muted
                loop
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover z-0"
              />

              {/* High-speed WebP Hover Preview Overlay */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hoverUrl}
                alt={`${file.name} hover preview`}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                    setHoverImageLoaded(true);
                  } else {
                    setHoverImageLoaded(false);
                  }
                }}
                onError={() => setHoverImageLoaded(false)}
                className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300 ${
                  hoverImageLoaded ? "opacity-100" : "opacity-0"
                }`}
              />
            </>
          )}

          {/* Centered Play Indicator Badge */}
          <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
            <div className="size-10 rounded-full bg-purple-600/80 text-white flex items-center justify-center border border-white/20 group-hover:scale-110 group-hover:bg-purple-500 transition-all shadow-lg backdrop-blur-xs">
              <Play className="size-4 fill-current ml-0.5" />
            </div>
            {isHovered && isPcScreen && hoverImageLoaded && (
              <span className="text-[9px] font-mono bg-black/70 text-purple-300 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold animate-pulse">
                Sneak Peek
              </span>
            )}
          </div>
        </div>
      );
    }

    if (file.type === "audio") {
      return (
        <div className={`relative w-full ${aspectClass} overflow-hidden bg-linear-to-br from-emerald-950/60 via-slate-900 to-black flex flex-col items-center justify-center gap-2 p-4 border-b border-emerald-500/10`}>
          {renderFavoriteButton()}
          <div className="size-11 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-md">
            <AudioIcon className="size-5" />
          </div>
          <span className="text-[10px] font-mono text-emerald-300 uppercase tracking-widest font-semibold">
            Audio File
          </span>
        </div>
      );
    }

    return (
      <div className={`relative w-full ${aspectClass} overflow-hidden bg-muted/40 flex flex-col items-center justify-center gap-2 p-4`}>
        {renderFavoriteButton("absolute top-2 right-2 z-20 bg-muted/80 text-foreground")}
        <FileText className="size-8 text-muted-foreground" />
        <span className="text-[10px] font-mono text-muted-foreground uppercase font-semibold">
          {file.extension.replace(".", "") || "Document"}
        </span>
      </div>
    );
  };

  // VIEW 1: Compact List View
  if (viewMode === "list") {
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex items-center justify-between p-3 hover:bg-muted/40 cursor-pointer transition-colors group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-9 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0 border relative">
            {file.type === "image" || file.type === "video" ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={isHovered && isPcScreen && file.type === "video" ? hoverUrl : thumbnailUrl}
                alt={file.name}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            ) : (
              getMediaIcon(file.type)
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate group-hover:text-primary transition-colors" title={file.name}>
              {file.name}
            </span>
            <span className="text-xs text-muted-foreground truncate" title={file.path}>
              {file.folder}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
          <span className="font-mono font-medium">{formatFileSize(file.size)}</span>
          <Badge variant="outline" className="uppercase text-[10px]">
            {file.extension.replace(".", "") || file.type}
          </Badge>
          <Button variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Eye className="size-3.5 text-primary" />
          </Button>
        </div>
      </div>
    );
  }

  // VIEW 2: Small Cards
  if (viewMode === "small-cards") {
    return (
      <Card
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="cursor-pointer hover:shadow-md transition-shadow group overflow-hidden border"
      >
        {renderCardThumbnail("aspect-square")}
        <div className="p-2 flex flex-col gap-0.5">
          <span className="text-xs font-medium truncate" title={file.name}>
            {file.name}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {formatFileSize(file.size)}
          </span>
        </div>
      </Card>
    );
  }

  // VIEW 3: Big Cards
  if (viewMode === "big-cards") {
    return (
      <Card
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="cursor-pointer hover:shadow-lg transition-all group overflow-hidden border"
      >
        {renderCardThumbnail("aspect-video")}
        <CardContent className="p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-base truncate group-hover:text-primary transition-colors" title={file.name}>
              {file.name}
            </span>
            <Badge variant="secondary" className="uppercase text-xs shrink-0 font-mono">
              {file.extension.replace(".", "") || file.type}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate" title={file.path}>
            {file.path}
          </p>
          <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
            <span className="font-mono font-semibold text-foreground">
              {formatFileSize(file.size)}
            </span>
            <span>{new Date(file.modifiedAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // VIEW 4: Detailed Cards (Default Grid)
  if (viewMode === "detailed-cards") {
    return (
      <Card
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="cursor-pointer hover:shadow-md transition-all group overflow-hidden flex flex-col justify-between border"
      >
        <div>
          {renderCardThumbnail("aspect-video")}
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-sm truncate group-hover:text-primary transition-colors" title={file.name}>
                {file.name}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase shrink-0 font-mono">
                {file.extension.replace(".", "") || file.type}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground truncate" title={file.path}>
              {file.path}
            </span>
          </CardContent>
        </div>

        <div className="px-4 py-3 bg-muted/20 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono font-medium text-foreground">
            {formatFileSize(file.size)}
          </span>
          <span className="capitalize text-[11px] bg-muted px-2 py-0.5 rounded font-medium">
            {file.type}
          </span>
        </div>
      </Card>
    );
  }

  // VIEW 5: Detailed List View (Table Row)
  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="hover:bg-muted/40 cursor-pointer transition-colors group"
    >
      <td className="p-2">
        <div className="size-10 rounded overflow-hidden bg-muted flex items-center justify-center border relative">
          {file.type === "image" || file.type === "video" ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={isHovered && isPcScreen && file.type === "video" ? hoverUrl : thumbnailUrl}
              alt={file.name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            getMediaIcon(file.type)
          )}
        </div>
      </td>
      <td className="p-3 font-semibold text-sm truncate max-w-xs group-hover:text-primary transition-colors" title={file.name}>
        {file.name}
      </td>
      <td className="p-3 text-muted-foreground truncate max-w-xs hidden md:table-cell" title={file.path}>
        {file.path}
      </td>
      <td className="p-3">
        <Badge variant="outline" className="uppercase text-[10px] font-mono">
          {file.extension.replace(".", "") || file.type}
        </Badge>
      </td>
      <td className="p-3 font-mono font-medium">
        {formatFileSize(file.size)}
      </td>
      <td className="p-3 text-muted-foreground hidden sm:table-cell">
        {new Date(file.modifiedAt).toLocaleDateString()}
      </td>
      <td className="p-3 text-right">
        <Button variant="outline" size="xs" className="gap-1">
          <Eye className="size-3" />
          <span>Preview</span>
        </Button>
      </td>
    </tr>
  );
}
