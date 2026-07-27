"use client";

import React, { useState, useMemo } from "react";
import { MediaFile, useMediaStore, GroupByMode, SortByField } from "@/store/useMediaStore";
import { MediaCard } from "./MediaCard";
import { FilePreviewDrawer } from "./FilePreviewDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Folder,
  List,
  LayoutGrid,
  Grid3x3,
  Grid,
  Table,
  ArrowUpDown,
  Layers,
  ChevronDown,
  ChevronRight,
  FolderOpen,
} from "lucide-react";

interface MediaGalleryGridProps {
  files: MediaFile[];
  title?: string;
  subtitle?: string;
  showFolders?: boolean;
}

export function MediaGalleryGrid({
  files,
  title,
  subtitle,
  showFolders = true,
}: MediaGalleryGridProps) {
  const {
    folders,
    viewMode,
    groupBy,
    sortBy,
    sortOrder,
    searchQuery,
    selectedType,
    activeFolder,
    setViewMode,
    setGroupBy,
    setSortBy,
    setSortOrder,
    setSearchQuery,
    setSelectedType,
    setActiveFolder,
  } = useMediaStore();

  const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const matchesSearch =
        searchQuery === "" ||
        file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.folder.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === "all" || file.type === selectedType;
      const matchesFolder = activeFolder === null || file.folder === activeFolder;

      return matchesSearch && matchesType && matchesFolder;
    });
  }, [files, searchQuery, selectedType, activeFolder]);

  const sortedFiles = useMemo(() => {
    return [...filteredFiles].sort((a, b) => {
      let result = 0;
      if (sortBy === "name") {
        result = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
      } else if (sortBy === "date") {
        result = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
      } else if (sortBy === "size") {
        result = a.size - b.size;
      }
      return sortOrder === "asc" ? result : -result;
    });
  }, [filteredFiles, sortBy, sortOrder]);

  const groupedFiles = useMemo(() => {
    if (groupBy === "none") {
      return [{ groupName: "All Media", files: sortedFiles }];
    }

    const groups: { [key: string]: MediaFile[] } = {};

    sortedFiles.forEach((file) => {
      let key = "Other";
      if (groupBy === "folder") {
        key = file.folder || "Root Folder";
      } else if (groupBy === "type") {
        key = file.type.toUpperCase();
      } else if (groupBy === "date") {
        const date = new Date(file.modifiedAt);
        const today = new Date();
        const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 0) key = "Today";
        else if (diffDays === 1) key = "Yesterday";
        else if (diffDays <= 7) key = "This Week";
        else if (diffDays <= 30) key = "This Month";
        else key = "Older";
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(file);
    });

    return Object.entries(groups).map(([groupName, groupFiles]) => ({
      groupName,
      files: groupFiles,
    }));
  }, [sortedFiles, groupBy]);

  const renderGridContent = (items: MediaFile[]) => {
    if (viewMode === "list") {
      return (
        <div className="flex flex-col divide-y border rounded-xl overflow-hidden bg-card shadow-xs">
          {items.map((file) => (
            <MediaCard
              key={file.id || file.path}
              file={file}
              viewMode="list"
              onClick={() => setPreviewMedia(file)}
            />
          ))}
        </div>
      );
    }

    if (viewMode === "detailed-list") {
      return (
        <div className="overflow-x-auto border rounded-xl bg-card shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground">
                <th className="p-3 w-14">Preview</th>
                <th className="p-3">Name</th>
                <th className="p-3 hidden md:table-cell">Path</th>
                <th className="p-3">Type</th>
                <th className="p-3">Size</th>
                <th className="p-3 hidden sm:table-cell">Date</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs">
              {items.map((file) => (
                <MediaCard
                  key={file.id || file.path}
                  file={file}
                  viewMode="detailed-list"
                  onClick={() => setPreviewMedia(file)}
                />
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    const gridClass =
      viewMode === "small-cards"
        ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3"
        : viewMode === "big-cards"
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4";

    return (
      <div className={gridClass}>
        {items.map((file) => (
          <MediaCard
            key={file.id || file.path}
            file={file}
            viewMode={viewMode}
            onClick={() => setPreviewMedia(file)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Title & Stats */}
      {title && (
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}

      {/* Controls Bar: Search, Type Filter, GroupBy, SortBy, ViewMode */}
      <Card className="border shadow-xs">
        <CardContent className="p-4 flex flex-col xl:flex-row items-center justify-between gap-4">
          <div className="relative w-full xl:w-80">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-between xl:justify-end">
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

            {/* Group By Select */}
            <div className="flex items-center gap-1.5 bg-muted/30 px-2.5 py-1 rounded-lg border">
              <Layers className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Group:</span>
              <Select value={groupBy} onValueChange={(val) => val && setGroupBy(val as GroupByMode)}>
                <SelectTrigger className="h-6 border-none bg-transparent px-1 text-xs font-semibold shadow-none focus:ring-0 py-0">
                  <SelectValue placeholder="Group" />
                </SelectTrigger>
                <SelectContent align="end" className="rounded-lg shadow-lg">
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="folder">Folder</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort By Controls */}
            <div className="flex items-center gap-1.5 bg-muted/30 px-2.5 py-1 rounded-lg border">
              <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Sort:</span>
              <Select value={sortBy} onValueChange={(val) => val && setSortBy(val as SortByField)}>
                <SelectTrigger className="h-6 border-none bg-transparent px-1 text-xs font-semibold shadow-none focus:ring-0 py-0">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent align="end" className="rounded-lg shadow-lg">
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="size">Size</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                title={`Sort ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
                className="size-6"
              >
                <ArrowUpDown className={`size-3.5 ${sortOrder === "desc" ? "rotate-180" : ""} transition-transform`} />
              </Button>
            </div>

            {/* View Mode Switcher */}
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

      {/* Folder Filters */}
      {showFolders && folders.length > 0 && (
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

      {/* Render Grouped Content */}
      {sortedFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-muted/10 border border-dashed rounded-2xl text-center gap-3">
          <FolderOpen className="size-12 text-muted-foreground/50" />
          <h3 className="font-bold text-lg">No media files found</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Try adjusting your search query, folder selection, or media type filters.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groupedFiles.map((group) => {
            const isCollapsed = collapsedGroups.has(group.groupName);
            return (
              <div key={group.groupName} className="flex flex-col gap-3">
                {groupBy !== "none" && (
                  <div
                    onClick={() => toggleGroupCollapse(group.groupName)}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 border cursor-pointer select-none transition-colors"
                  >
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      {isCollapsed ? (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                      <span>{group.groupName}</span>
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        {group.files.length} items
                      </Badge>
                    </div>
                  </div>
                )}

                {!isCollapsed && renderGridContent(group.files)}
              </div>
            );
          })}
        </div>
      )}

      {/* File Preview Drawer */}
      <FilePreviewDrawer
        file={previewMedia}
        onClose={() => setPreviewMedia(null)}
      />
    </div>
  );
}
