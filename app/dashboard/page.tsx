"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMediaStore, MediaFile } from "@/store/useMediaStore";
import { FilePreviewDrawer } from "@/components/preview/FilePreviewDrawer";
import { MediaCard } from "@/components/preview/MediaCard";
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
  Settings,
  List,
  LayoutGrid,
  Grid3x3,
  Grid,
  Table,
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
    viewMode,
    activeFolder,
    setSearchQuery,
    setSelectedType,
    setViewMode,
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
            <Card className="divide-y overflow-hidden border">
              {filteredFiles.map((file) => (
                <MediaCard
                  key={file.id}
                  file={file}
                  viewMode={viewMode}
                  onClick={() => setPreviewMedia(file)}
                />
              ))}
            </Card>
          )}

          {/* VIEW 2: Small Cards Grid */}
          {viewMode === "small-cards" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {filteredFiles.map((file) => (
                <MediaCard
                  key={file.id}
                  file={file}
                  viewMode={viewMode}
                  onClick={() => setPreviewMedia(file)}
                />
              ))}
            </div>
          )}

          {/* VIEW 3: Big Cards Grid */}
          {viewMode === "big-cards" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFiles.map((file) => (
                <MediaCard
                  key={file.id}
                  file={file}
                  viewMode={viewMode}
                  onClick={() => setPreviewMedia(file)}
                />
              ))}
            </div>
          )}

          {/* VIEW 4: Detailed Cards (Default Grid) */}
          {viewMode === "detailed-cards" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFiles.map((file) => (
                <MediaCard
                  key={file.id}
                  file={file}
                  viewMode={viewMode}
                  onClick={() => setPreviewMedia(file)}
                />
              ))}
            </div>
          )}

          {/* VIEW 5: Detailed List View (Table) */}
          {viewMode === "detailed-list" && (
            <Card className="overflow-x-auto border">
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
                    <MediaCard
                      key={file.id}
                      file={file}
                      viewMode={viewMode}
                      onClick={() => setPreviewMedia(file)}
                    />
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      {/* Universal Full-Screen Bottom Drawer File Preview */}
      <FilePreviewDrawer
        file={previewMedia}
        onClose={() => setPreviewMedia(null)}
      />
    </div>
  );
}
