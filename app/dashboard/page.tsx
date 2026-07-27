"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMediaStore, MediaFile } from "@/store/useMediaStore";
import { formatFileSize } from "@/lib/utils";
import { FilePreviewModal } from "@/components/preview/FilePreviewModal";
import { IndexingProgressBanner } from "@/components/IndexingProgressBanner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Search,
  Folder,
  Image as ImageIcon,
  Video as VideoIcon,
  Music as AudioIcon,
  FileText,
  Settings,
  List,
  LayoutGrid,
  Grid3x3,
  Grid,
  Table,
  Play,
  Eye,
} from "lucide-react";

export type ViewMode =
  | "list"
  | "small-cards"
  | "big-cards"
  | "detailed-cards"
  | "detailed-list";

export default function DashboardGalleryPage() {
  const {
    files,
    folders,
    isScanning,
    searchQuery,
    selectedType,
    activeFolder,
    setSearchQuery,
    setSelectedType,
    setActiveFolder,
    scanMedia,
    fetchFolders,
  } = useMediaStore();

  const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("detailed-cards");

  useEffect(() => {
    fetchFolders();
    scanMedia();
  }, [fetchFolders, scanMedia]);

  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      searchQuery === "" ||
      file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      selectedType === "all" || file.type === selectedType;
    const matchesFolder =
      activeFolder === null || file.folder === activeFolder;

    return matchesSearch && matchesType && matchesFolder;
  });

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

  /**
   * Helper to render real thumbnails for card views
   */
  const renderThumbnail = (file: MediaFile, aspectClass: string = "aspect-video") => {
    const fileUrl = `/api/media/file?path=${encodeURIComponent(file.path)}`;

    if (file.type === "image") {
      return (
        <div className={`relative w-full ${aspectClass} overflow-hidden bg-muted/40 group-hover:brightness-95 transition-all`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileUrl}
            alt={file.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      );
    }

    if (file.type === "video") {
      return (
        <div className={`relative w-full ${aspectClass} overflow-hidden bg-black flex items-center justify-center`}>
          <video
            src={`${fileUrl}#t=0.5`}
            preload="metadata"
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all">
            <div className="size-10 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg">
              <Play className="size-5 fill-current ml-0.5" />
            </div>
          </div>
        </div>
      );
    }

    if (file.type === "audio") {
      return (
        <div className={`relative w-full ${aspectClass} overflow-hidden bg-gradient-to-br from-emerald-950/60 to-emerald-900/20 flex flex-col items-center justify-center gap-2 p-4 border-b border-emerald-500/10`}>
          <div className="size-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <AudioIcon className="size-5" />
          </div>
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-semibold">
            Audio File
          </span>
        </div>
      );
    }

    return (
      <div className={`relative w-full ${aspectClass} overflow-hidden bg-muted/40 flex flex-col items-center justify-center gap-2 p-4`}>
        <FileText className="size-8 text-muted-foreground" />
        <span className="text-[10px] font-mono text-muted-foreground uppercase">
          {file.extension || "Document"}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Media Gallery</h1>
          <p className="text-sm text-muted-foreground">
            Browse and view all media files indexed by the scanner ({filteredFiles.length} items)
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

      {/* Filters, Search & Viewing Type Switcher */}
      <Card>
        <CardContent className="p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 w-full lg:w-auto">
            {/* File Type Filter */}
            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border">
              {(["all", "image", "video", "audio"] as const).map((type) => (
                <Button
                  key={type}
                  variant={selectedType === type ? "secondary" : "ghost"}
                  size="xs"
                  onClick={() => setSelectedType(type)}
                  className="capitalize text-xs font-medium"
                >
                  {type}
                </Button>
              ))}
            </div>

            {/* Viewing Type Switcher */}
            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon-xs"
                onClick={() => setViewMode("list")}
                title="List View"
              >
                <List className="size-4" />
              </Button>
              <Button
                variant={viewMode === "small-cards" ? "secondary" : "ghost"}
                size="icon-xs"
                onClick={() => setViewMode("small-cards")}
                title="Small Cards"
              >
                <LayoutGrid className="size-4" />
              </Button>
              <Button
                variant={viewMode === "detailed-cards" ? "secondary" : "ghost"}
                size="icon-xs"
                onClick={() => setViewMode("detailed-cards")}
                title="Detailed Cards"
              >
                <Grid className="size-4" />
              </Button>
              <Button
                variant={viewMode === "big-cards" ? "secondary" : "ghost"}
                size="icon-xs"
                onClick={() => setViewMode("big-cards")}
                title="Big Cards"
              >
                <Grid3x3 className="size-4" />
              </Button>
              <Button
                variant={viewMode === "detailed-list" ? "secondary" : "ghost"}
                size="icon-xs"
                onClick={() => setViewMode("detailed-list")}
                title="Detailed List View"
              >
                <Table className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Folder Pills */}
      {folders.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1 shrink-0">
            <Folder className="size-3.5" /> Folders:
          </span>
          <Badge
            variant={activeFolder === null ? "default" : "outline"}
            className="cursor-pointer shrink-0"
            onClick={() => setActiveFolder(null)}
          >
            All Folders
          </Badge>
          {folders.map((f) => (
            <Badge
              key={f.id}
              variant={activeFolder === f.path ? "default" : "outline"}
              className="cursor-pointer truncate max-w-xs shrink-0"
              onClick={() => setActiveFolder(f.path)}
            >
              {f.name || f.path}
            </Badge>
          ))}
        </div>
      )}

      {/* Media Items Presentation (5 View Modes) */}
      {filteredFiles.length === 0 ? (
        <Card className="text-center p-12">
          <CardHeader>
            <CardTitle className="text-lg">No Media Files Found</CardTitle>
            <CardDescription>
              {folders.length === 0
                ? "No media folders configured yet. Add your media directory in Settings."
                : "No files match your search criteria or type filter."}
            </CardDescription>
          </CardHeader>
          {folders.length === 0 && (
            <div className="flex justify-center pt-2">
              <Link href="/dashboard/settings">
                <Button className="gap-2">
                  <Settings className="size-4" />
                  <span>Go to Settings</span>
                </Button>
              </Link>
            </div>
          )}
        </Card>
      ) : (
        <>
          {/* VIEW 1: Compact List View */}
          {viewMode === "list" && (
            <Card className="divide-y overflow-hidden">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => setPreviewMedia(file)}
                  className="flex items-center justify-between p-3 hover:bg-muted/40 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0 border">
                      {file.type === "image" ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={`/api/media/file?path=${encodeURIComponent(file.path)}`}
                          alt={file.name}
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
              ))}
            </Card>
          )}

          {/* VIEW 2: Small Cards Grid */}
          {viewMode === "small-cards" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {filteredFiles.map((file) => (
                <Card
                  key={file.id}
                  onClick={() => setPreviewMedia(file)}
                  className="cursor-pointer hover:shadow-md transition-shadow group overflow-hidden border"
                >
                  {renderThumbnail(file, "aspect-square")}
                  <div className="p-2 flex flex-col gap-0.5">
                    <span className="text-xs font-medium truncate" title={file.name}>
                      {file.name}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* VIEW 3: Big Cards Grid */}
          {viewMode === "big-cards" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFiles.map((file) => (
                <Card
                  key={file.id}
                  onClick={() => setPreviewMedia(file)}
                  className="cursor-pointer hover:shadow-lg transition-all group overflow-hidden border"
                >
                  {renderThumbnail(file, "aspect-video")}
                  <CardContent className="p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-base truncate group-hover:text-primary transition-colors" title={file.name}>
                        {file.name}
                      </span>
                      <Badge variant="secondary" className="uppercase text-xs shrink-0">
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
              ))}
            </div>
          )}

          {/* VIEW 4: Detailed Cards (Default Grid) */}
          {viewMode === "detailed-cards" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFiles.map((file) => (
                <Card
                  key={file.id}
                  onClick={() => setPreviewMedia(file)}
                  className="cursor-pointer hover:shadow-md transition-all group overflow-hidden flex flex-col justify-between border"
                >
                  <div>
                    {renderThumbnail(file, "aspect-video")}
                    <CardContent className="p-4 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-sm truncate group-hover:text-primary transition-colors" title={file.name}>
                          {file.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] uppercase shrink-0">
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
                    <span className="capitalize text-[11px] bg-muted px-2 py-0.5 rounded">
                      {file.type}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* VIEW 5: Detailed List View (Table) */}
          {viewMode === "detailed-list" && (
            <Card className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider">
                    <th className="p-3 w-14">Preview</th>
                    <th className="p-3">File Name</th>
                    <th className="p-3 hidden md:table-cell">Folder Path</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Size</th>
                    <th className="p-3 hidden sm:table-cell">Modified</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredFiles.map((file) => (
                    <tr
                      key={file.id}
                      onClick={() => setPreviewMedia(file)}
                      className="hover:bg-muted/40 cursor-pointer transition-colors group"
                    >
                      <td className="p-2">
                        <div className="size-10 rounded overflow-hidden bg-muted flex items-center justify-center border">
                          {file.type === "image" ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={`/api/media/file?path=${encodeURIComponent(file.path)}`}
                              alt={file.name}
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
                        <Badge variant="outline" className="uppercase text-[10px]">
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
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      {/* Universal File Preview Modal */}
      <FilePreviewModal
        file={previewMedia}
        onClose={() => setPreviewMedia(null)}
      />
    </div>
  );
}
