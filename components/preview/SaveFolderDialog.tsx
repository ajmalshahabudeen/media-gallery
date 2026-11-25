"use client";

import React, { useState } from "react";
import { Bookmark, Check, FolderPlus, Plus, Trash2 } from "lucide-react";
import { useMediaStore, type MediaFile, type SaveFolderItem } from "@/store/useMediaStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SaveToastProps {
  visible: boolean;
  file: MediaFile | null;
  folderName: string;
  onSaveToFolder: () => void;
  onDismiss: () => void;
}

export function SaveToastBanner({
  visible,
  file,
  folderName,
  onSaveToFolder,
  onDismiss,
}: SaveToastProps) {
  if (!visible || !file) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,420px)] rounded-xl border border-white/15 bg-neutral-900/95 backdrop-blur-md px-3.5 py-2.5 shadow-2xl flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="size-9 rounded-lg overflow-hidden bg-neutral-800 shrink-0 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/media/thumbnail?path=${encodeURIComponent(file.path)}`}
            alt={file.name}
            className="size-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate">
            Saved to {folderName}
          </p>
          <p className="text-[11px] text-neutral-400 truncate">
            Hold Save icon to open Saved folders
          </p>
        </div>
      </div>

      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="shrink-0 h-7 rounded-full text-xs font-semibold"
        onClick={() => {
          onDismiss();
          onSaveToFolder();
        }}
      >
        Save to folder
      </Button>
    </div>
  );
}

interface SaveFolderDialogProps {
  open: boolean;
  file: MediaFile | null;
  openedFromToast?: boolean;
  onClose: () => void;
}

export function SaveFolderDialog({
  open,
  file,
  openedFromToast = false,
  onClose,
}: SaveFolderDialogProps) {
  const {
    saveFolders,
    savedMedia,
    toggleMediaInSaveFolder,
    createSaveFolder,
    unsaveMedia,
  } = useMediaStore();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movedFromDefaultOnce, setMovedFromDefaultOnce] = useState(false);

  const savedRecord = file ? savedMedia.find((item) => item.path === file.path) : undefined;
  const activeFolderIds = new Set(savedRecord?.folderIds || []);

  const handleClose = () => {
    setCreating(false);
    setNewName("");
    setError(null);
    setMovedFromDefaultOnce(false);
    onClose();
  };

  const handleToggleFolder = async (folder: SaveFolderItem) => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    const shouldMoveFromDefault =
      openedFromToast && !movedFromDefaultOnce && !folder.isDefault;
    await toggleMediaInSaveFolder(file, folder.id, shouldMoveFromDefault);
    if (shouldMoveFromDefault) {
      setMovedFromDefaultOnce(true);
    }
    setBusy(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || !file || busy) return;
    setBusy(true);
    setError(null);
    const shouldMoveFromDefault = openedFromToast && !movedFromDefaultOnce;
    const res = await createSaveFolder(trimmed, file, shouldMoveFromDefault);
    setBusy(false);
    if (!res.success) {
      setError(res.error || "Could not create save folder");
      return;
    }
    if (shouldMoveFromDefault) {
      setMovedFromDefaultOnce(true);
    }
    setNewName("");
    setCreating(false);
  };

  const handleUnsave = async () => {
    if (!file || busy) return;
    setBusy(true);
    await unsaveMedia(file.path);
    setBusy(false);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <div>
              <DialogTitle>Save to folder</DialogTitle>
              <DialogDescription className="truncate max-w-[260px]">
                {file?.name || "Choose one or more save folders"}
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-full"
              onClick={() => {
                setCreating((v) => !v);
                setError(null);
              }}
            >
              <Plus className="size-3.5" />
              New folder
            </Button>
          </div>
        </DialogHeader>

        {creating && (
          <form onSubmit={handleCreate} className="flex flex-col gap-2 pt-1">
            <div className="flex items-center gap-2">
              <FolderPlus className="size-4 text-muted-foreground shrink-0" />
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Folder name (saved in database)"
                maxLength={60}
                autoFocus
              />
              <Button type="submit" size="sm" disabled={!newName.trim() || busy}>
                Add
              </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </form>
        )}

        <ScrollArea className="max-h-72 pr-2">
          <div className="flex flex-col gap-1.5 py-1">
            {saveFolders.map((folder) => {
              const checked = activeFolderIds.has(folder.id);
              const coverPath = folder.previewPaths[0];
              return (
                <button
                  key={folder.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void handleToggleFolder(folder)}
                  className="flex items-center justify-between gap-3 w-full rounded-xl p-2 hover:bg-muted/70 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-11 rounded-lg bg-muted border overflow-hidden shrink-0 flex items-center justify-center">
                      {coverPath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/media/thumbnail?path=${encodeURIComponent(coverPath)}`}
                          alt={folder.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <Bookmark className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold truncate">{folder.name}</span>
                        {folder.isDefault && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Default
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {folder.itemCount} {folder.itemCount === 1 ? "item" : "items"}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`size-6 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      checked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {checked && <Check className="size-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {activeFolderIds.size > 0 && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={() => void handleUnsave()}
            className="w-full gap-2"
          >
            <Trash2 className="size-4" />
            Remove from Saved
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
