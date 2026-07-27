"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMediaStore, MediaFile } from "@/store/useMediaStore";
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
} from "lucide-react";
import { IndexingProgressBanner } from "@/components/IndexingProgressBanner";

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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Media Gallery</h1>
          <p className="text-sm text-muted-foreground">
            Browse and view all media files indexed by the Python scanner
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

      {/* Filters & Search */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {(["all", "image", "video", "audio"] as const).map((type) => (
              <Button
                key={type}
                variant={selectedType === type ? "default" : "outline"}
                size="xs"
                onClick={() => setSelectedType(type)}
                className="capitalize"
              >
                {type}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Folder Pills */}
      {folders.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
            <Folder className="size-3.5" /> Folders:
          </span>
          <Badge
            variant={activeFolder === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setActiveFolder(null)}
          >
            All Folders
          </Badge>
          {folders.map((f) => (
            <Badge
              key={f.id}
              variant={activeFolder === f.path ? "default" : "outline"}
              className="cursor-pointer truncate max-w-xs"
              onClick={() => setActiveFolder(f.path)}
            >
              {f.name || f.path}
            </Badge>
          ))}
        </div>
      )}

      {/* Files Grid */}
      {filteredFiles.length === 0 ? (
        <Card className="text-center p-8">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map((file) => (
            <Card
              key={file.id}
              className="cursor-pointer hover:shadow-md transition-shadow group overflow-hidden"
              onClick={() => setPreviewMedia(file)}
            >
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="rounded-lg p-2.5 bg-muted/40 group-hover:bg-muted transition-colors">
                    {getMediaIcon(file.type)}
                  </div>
                  <Badge variant="outline" className="text-xs uppercase">
                    {file.extension.replace(".", "")}
                  </Badge>
                </div>

                <div className="flex flex-col gap-1 truncate">
                  <span className="font-semibold text-sm truncate" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-xs text-muted-foreground truncate" title={file.path}>
                    {file.path}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t mt-1">
                  <span>{(file.size / 1024).toFixed(1)} KB</span>
                  <span className="capitalize">{file.type}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Media Detail Modal Preview */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base truncate">{previewMedia.name}</CardTitle>
                <CardDescription className="text-xs">{previewMedia.type} file</CardDescription>
              </div>
              <Button variant="ghost" size="xs" onClick={() => setPreviewMedia(null)}>
                ✕
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="rounded border p-3 bg-muted/20 text-xs flex flex-col gap-2 font-mono break-all">
                <div>
                  <span className="font-semibold text-foreground font-sans">Full Path: </span>
                  {previewMedia.path}
                </div>
                <div>
                  <span className="font-semibold text-foreground font-sans">Size: </span>
                  {(previewMedia.size / 1024 / 1024).toFixed(2)} MB ({previewMedia.size} bytes)
                </div>
                <div>
                  <span className="font-semibold text-foreground font-sans">MIME Type: </span>
                  {previewMedia.mimeType}
                </div>
                <div>
                  <span className="font-semibold text-foreground font-sans">Last Modified: </span>
                  {new Date(previewMedia.modifiedAt).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
