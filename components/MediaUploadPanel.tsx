"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMediaStore } from "@/store/useMediaStore";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FolderPlus,
  ImagePlus,
  CheckCircle,
  Info,
  X,
} from "lucide-react";

interface SubfolderOption {
  name: string;
  path: string;
  isRoot?: boolean;
}

interface Props {
  variant?: "card" | "plain";
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function MediaUploadPanel({ variant = "card" }: Props) {
  const { folders, uploadMedia, createSubfolder, fetchSubfolders } = useMediaStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [libraryPath, setLibraryPath] = useState("");
  const [destPath, setDestPath] = useState("");
  const [subfolders, setSubfolders] = useState<SubfolderOption[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const activeLibrary =
    (libraryPath && folders.some((f) => f.path === libraryPath) ? libraryPath : folders[0]?.path) ||
    "";

  useEffect(() => {
    if (!activeLibrary) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchSubfolders(activeLibrary).then((result) => {
        if (!cancelled) setSubfolders(result);
      });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeLibrary, fetchSubfolders]);

  const destOptions = useMemo(() => {
    if (!activeLibrary) return [];
    const root: SubfolderOption = {
      name: "Library root",
      path: activeLibrary,
      isRoot: true,
    };
    const rest = subfolders.filter((f) => f.path !== activeLibrary);
    return [root, ...rest];
  }, [activeLibrary, subfolders]);

  const activeDest =
    destPath && destOptions.some((f) => f.path === destPath) ? destPath : activeLibrary;

  if (folders.length === 0) return null;

  const onPickFiles = (list: FileList | null) => {
    if (!list) return;
    const next = Array.from(list).filter((file) => {
      const type = file.type || "";
      return type.startsWith("image/") || type.startsWith("video/");
    });
    setFiles(next);
    setMessage(null);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !activeDest) return;
    setCreating(true);
    setMessage(null);
    const result = await createSubfolder(activeDest, newFolderName.trim());
    setCreating(false);
    if (result.success && result.path) {
      const created = { name: newFolderName.trim(), path: result.path };
      setSubfolders((prev) => [...prev, created]);
      setDestPath(result.path);
      setNewFolderName("");
      setMessage({ type: "success", text: `Created folder “${created.name}”.` });
    } else {
      setMessage({ type: "error", text: result.error || "Could not create folder." });
    }
  };

  const handleUpload = async () => {
    if (!activeLibrary || !activeDest) {
      setMessage({ type: "error", text: "Choose a destination folder first." });
      return;
    }
    if (files.length === 0) {
      setMessage({ type: "error", text: "Select photos or videos to upload." });
      return;
    }
    setUploading(true);
    setMessage(null);
    const result = await uploadMedia(activeLibrary, activeDest, files);
    setUploading(false);
    if (result.success) {
      setFiles([]);
      if (fileRef.current) fileRef.current.value = "";
      const extra = result.failed
        ? ` ${result.failed} file${result.failed === 1 ? "" : "s"} skipped.`
        : "";
      setMessage({
        type: "success",
        text: `Uploaded ${result.uploaded} photo${result.uploaded === 1 ? "" : "s"} / video${result.uploaded === 1 ? "" : "s"}.${extra}`,
      });
    } else {
      setMessage({ type: "error", text: result.error || "Upload failed." });
    }
  };

  const body = (
    <div className="flex flex-col gap-4">
      {message && (
        <Alert
          className={
            message.type === "success"
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600"
              : "border-destructive/50 bg-destructive/10 text-destructive"
          }
        >
          {message.type === "success" ? <CheckCircle className="size-4" /> : <Info className="size-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label>Media library</Label>
        <Select
          value={activeLibrary}
          onValueChange={(val) => {
            if (!val) return;
            setLibraryPath(val);
            setDestPath(val);
          }}
        >
          <SelectTrigger className="h-10 w-full border border-border bg-background px-3">
            <SelectValue placeholder="Choose library folder" />
          </SelectTrigger>
          <SelectContent align="start" className="rounded-lg">
            {folders.map((folder) => (
              <SelectItem key={folder.id} value={folder.path}>
                {folder.name || folder.path}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Upload into folder</Label>
        <Select value={activeDest} onValueChange={(val) => val && setDestPath(val)}>
          <SelectTrigger className="h-10 w-full border border-border bg-background px-3">
            <SelectValue placeholder="Choose destination" />
          </SelectTrigger>
          <SelectContent align="start" className="rounded-lg">
            {destOptions.map((folder) => (
              <SelectItem key={folder.path} value={folder.path}>
                {folder.isRoot ? "Library root" : folder.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Create a new folder (optional)</Label>
        <div className="flex gap-2">
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="e.g. Vacation 2026"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleCreateFolder}
            disabled={creating || !newFolderName.trim()}
            className="gap-2 shrink-0"
          >
            <FolderPlus className="size-4" />
            <span>{creating ? "Creating..." : "Create"}</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Photos & videos</Label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="sr-only"
          onChange={(e) => onPickFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          className="gap-2 w-fit"
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="size-4" />
          <span>Select photos & videos</span>
        </Button>
        {files.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/20 p-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${file.size}-${index}`}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="truncate font-medium">{file.name}</span>
                <span className="text-muted-foreground shrink-0">{formatBytes(file.size)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                >
                  <X className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button
        type="button"
        onClick={handleUpload}
        disabled={uploading || files.length === 0}
        className="w-fit gap-2"
      >
        <Upload className="size-4" />
        <span>
          {uploading
            ? "Uploading..."
            : `Upload ${files.length || ""} ${files.length === 1 ? "file" : "files"}`.trim()}
        </span>
      </Button>
    </div>
  );

  if (variant === "plain") return body;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="size-4 text-primary" />
          <span>Upload photos & videos</span>
        </CardTitle>
        <CardDescription>
          Choose or create a folder inside your media library, then upload multiple photos or videos.
        </CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
