"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  Clapperboard,
  FolderPlus,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import {
  useMediaStore,
  type MediaFile,
  type SaveFolderItem,
  type SavedMediaItem,
} from "@/store/useMediaStore";
import { ReelsFeed } from "@/components/preview/ReelsFeed";
import { type ReelItemData } from "@/components/preview/ReelItem";
import { SaveFolderDialog } from "@/components/preview/SaveFolderDialog";
import { FilePreviewDrawer } from "@/components/preview/FilePreviewDrawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ALL_SAVED_ID = "__all_saved__";

function FolderCollage({ paths }: { paths: string[] }) {
  if (paths.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/50">
        <Bookmark className="size-8 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-0.5 w-full h-full bg-background">
      {[0, 1, 2, 3].map((idx) => {
        const p = paths[idx];
        return (
          <div key={idx} className="w-full h-full bg-muted overflow-hidden">
            {p && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/media/thumbnail?path=${encodeURIComponent(p)}`}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function SavedPage() {
  const {
    saveFolders,
    savedMedia,
    fetchSaved,
    createSaveFolder,
    renameSaveFolder,
    deleteSaveFolder,
  } = useMediaStore();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [playerState, setPlayerState] = useState<{
    videos: ReelItemData[];
    index: number;
    title: string;
  } | null>(null);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [manageFile, setManageFile] = useState<MediaFile | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameTarget, setRenameTarget] = useState<SaveFolderItem | null>(null);
  const [renameName, setRenameName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SaveFolderItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchSaved();
  }, [fetchSaved]);

  const allCard = useMemo<SaveFolderItem>(
    () => ({
      id: ALL_SAVED_ID,
      name: "All Saved",
      isDefault: false,
      itemCount: savedMedia.length,
      previewPaths: savedMedia.slice(0, 4).map((m) => m.path),
      createdAt: "",
      updatedAt: "",
    }),
    [savedMedia]
  );

  const folderCards = useMemo(
    () => [allCard, ...saveFolders],
    [allCard, saveFolders]
  );

  const activeFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    if (selectedFolderId === ALL_SAVED_ID) return allCard;
    return saveFolders.find((f) => f.id === selectedFolderId) || null;
  }, [selectedFolderId, allCard, saveFolders]);

  const activeItems = useMemo<SavedMediaItem[]>(() => {
    if (!selectedFolderId) return [];
    if (selectedFolderId === ALL_SAVED_ID) return savedMedia;
    return savedMedia.filter((item) => item.folderIds.includes(selectedFolderId));
  }, [selectedFolderId, savedMedia]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await createSaveFolder(newName.trim());
    setBusy(false);
    if (!res.success) {
      setError(res.error || "Could not create folder");
      return;
    }
    setNewName("");
    setCreateOpen(false);
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameName.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await renameSaveFolder(renameTarget.id, renameName.trim());
    setBusy(false);
    if (!res.success) {
      setError(res.error || "Could not rename folder");
      return;
    }
    setRenameTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget || busy) return;
    setBusy(true);
    const res = await deleteSaveFolder(deleteTarget.id);
    setBusy(false);
    if (res.success && selectedFolderId === deleteTarget.id) {
      setSelectedFolderId(null);
    }
    setDeleteTarget(null);
  };

  const openItem = (item: SavedMediaItem) => {
    const videoItems = activeItems.filter((i) => i.type === "video");
    if (item.type === "video" && videoItems.length > 0) {
      const idx = Math.max(
        0,
        videoItems.findIndex((v) => v.path === item.path)
      );
      setPlayerState({
        videos: videoItems.map((v) => ({
          ...v,
          type: "video",
          isSaved: true,
          savedFolderIds: v.folderIds,
        })),
        index: idx,
        title: activeFolder?.name || "Saved",
      });
      return;
    }
    setPreviewFile(item);
  };

  if (playerState) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <ReelsFeed
          initialVideos={playerState.videos}
          initialIndex={playerState.index}
          scopedTitle={playerState.title}
          onCloseScoped={() => setPlayerState(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {activeFolder && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setSelectedFolderId(null)}
              title="Back to Save Folders"
            >
              <ArrowLeft className="size-4" />
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <Bookmark className="size-6 text-primary fill-primary" />
              <h1 className="text-2xl font-bold tracking-tight">
                {activeFolder ? activeFolder.name : "Saved Collections"}
              </h1>
              {activeFolder?.isDefault && (
                <Badge variant="secondary">Default</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {activeFolder
                ? `${activeItems.length} saved ${activeItems.length === 1 ? "item" : "items"} in this virtual folder`
                : `Organize saved reels in database folders (${saveFolders.length} folders, ${savedMedia.length} saved items)`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!activeFolder && (
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setError(null);
                setNewName("");
                setCreateOpen(true);
              }}
            >
              <Plus className="size-4" />
              <span>New Folder</span>
            </Button>
          )}
          <Link href="/dashboard/reels">
            <Button variant="outline" size="sm" className="gap-2">
              <Clapperboard className="size-4" />
              <span>Reels</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Folder Grid vs Inside Folder Grid */}
      {!activeFolder ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {folderCards.map((folder) => {
            const isCustom = folder.id !== ALL_SAVED_ID && !folder.isDefault;
            return (
              <Card
                key={folder.id}
                className="overflow-hidden cursor-pointer hover:border-primary/50 transition-colors group"
                onClick={() => setSelectedFolderId(folder.id)}
              >
                <div className="aspect-square relative overflow-hidden border-b">
                  <FolderCollage paths={folder.previewPaths} />
                  {folder.isDefault && (
                    <Badge
                      variant="secondary"
                      className="absolute top-2 left-2 text-[10px]"
                    >
                      Default
                    </Badge>
                  )}
                  {isCustom && (
                    <div
                      className="absolute top-2 right-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon-xs"
                              className="size-7 rounded-full opacity-90"
                            >
                              <MoreVertical className="size-3.5" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setError(null);
                              setRenameName(folder.name);
                              setRenameTarget(folder);
                            }}
                          >
                            <Pencil className="size-3.5 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(folder)}
                          >
                            <Trash2 className="size-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>

                <CardContent className="p-3">
                  <h3 className="font-semibold text-sm truncate">{folder.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {folder.itemCount} {folder.itemCount === 1 ? "item" : "items"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : activeItems.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="size-14 rounded-full bg-muted flex items-center justify-center">
              <Bookmark className="size-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">
              No saved media in {activeFolder.name}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Click the Save icon on any reel in the Reels feed to store it in your
              database save folders.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {activeItems.map((item) => (
            <Card
              key={item.id}
              className="overflow-hidden cursor-pointer group hover:border-primary/50 transition-colors"
              onClick={() => openItem(item)}
            >
              <div className="aspect-[9/12] relative bg-muted overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/media/thumbnail?path=${encodeURIComponent(item.path)}`}
                  alt={item.name}
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {item.type === "video" && (
                  <div className="absolute top-2 right-2 size-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white">
                    <Play className="size-3.5 fill-white" />
                  </div>
                )}
                <Button
                  type="button"
                  size="icon-xs"
                  variant="secondary"
                  className="absolute top-2 left-2 size-7 rounded-full opacity-90"
                  title="Manage save folders"
                  onClick={(e) => {
                    e.stopPropagation();
                    setManageFile(item);
                  }}
                >
                  <Bookmark className="size-3.5 fill-current" />
                </Button>
              </div>
              <CardContent className="p-2.5">
                <p className="text-xs font-medium truncate" title={item.name}>
                  {item.name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {item.folderIds.length}{" "}
                  {item.folderIds.length === 1 ? "folder" : "folders"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Folder Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="size-5" />
              New Save Folder
            </DialogTitle>
            <DialogDescription>
              Virtual collection stored in the database only. No folder is created on
              disk.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Inspiration, Funny, Travel"
              maxLength={60}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!newName.trim() || busy}>
                Create Folder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog
        open={!!renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Save Folder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRename} className="flex flex-col gap-3">
            <Input
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              maxLength={60}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameTarget(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!renameName.trim() || busy}>
                Save Name
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{deleteTarget?.name}&rdquo;?</DialogTitle>
            <DialogDescription>
              Items only saved in this folder will be unsaved. Original files on your
              hard drive are never touched.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => void handleDelete()}
            >
              Delete Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SaveFolderDialog
        open={!!manageFile}
        file={manageFile}
        onClose={() => setManageFile(null)}
      />

      <FilePreviewDrawer
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
