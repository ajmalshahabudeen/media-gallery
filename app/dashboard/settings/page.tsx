"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMediaStore } from "@/store/useMediaStore";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FolderPlus,
  Folder,
  Trash2,
  RefreshCw,
  HardDrive,
  CheckCircle,
  Database,
  Info,
} from "lucide-react";
import { IndexingProgressBanner } from "@/components/IndexingProgressBanner";

interface AddFolderFormData {
  folderPath: string;
  folderName: string;
}

export default function SettingsPage() {
  const { folders, fetchFolders, addFolder, removeFolder, scanMedia, isScanning } =
    useMediaStore();

  const [formMessage, setFormMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [cacheMessage, setCacheMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddFolderFormData>({
    defaultValues: {
      folderPath: "",
      folderName: "",
    },
  });

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const onAddFolder = async (data: AddFolderFormData) => {
    setFormMessage(null);
    const success = await addFolder(data.folderPath.trim(), data.folderName.trim());
    if (success) {
      setFormMessage({
        type: "success",
        text: "Media library folder added and indexing started!",
      });
      reset();
    } else {
      setFormMessage({
        type: "error",
        text: "Failed to add folder. Please check path format.",
      });
    }
  };

  const handleRemoveFolder = async (id: string) => {
    const success = await removeFolder(id);
    if (success) {
      setFormMessage({
        type: "success",
        text: "Folder removed successfully.",
      });
    }
  };

  const handleClearCache = async () => {
    setCacheMessage(null);
    await scanMedia(true);
    setCacheMessage("Redis & system cache refreshed successfully!");
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure media library storage locations, Python scanner options, and Redis cache
        </p>
      </div>

      {/* Real-Time Indexing Progress Banner */}
      <IndexingProgressBanner />

      {/* Add Media Folder Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FolderPlus className="size-4 text-primary" />
            <span>Add Media Library Folder</span>
          </CardTitle>
          <CardDescription>
            Specify a local system folder, Windows path, Linux home directory, or external drive link
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onAddFolder)} className="flex flex-col gap-4">
            {formMessage && (
              <Alert
                className={
                  formMessage.type === "success"
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600"
                    : "border-destructive/50 bg-destructive/10 text-destructive"
                }
              >
                {formMessage.type === "success" ? (
                  <CheckCircle className="size-4" />
                ) : (
                  <Info className="size-4" />
                )}
                <AlertDescription>{formMessage.text}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="folderPath">Folder Path</Label>
              <Input
                id="folderPath"
                placeholder="e.g. C:\Users\username\Pictures or /media/photos or /host_media"
                {...register("folderPath", {
                  required: "Folder path is required",
                })}
              />
              {errors.folderPath && (
                <p className="text-xs text-destructive">{errors.folderPath.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="folderName">Folder Label (Optional)</Label>
              <Input
                id="folderName"
                placeholder="e.g. My Photos or External Hard Drive"
                {...register("folderName")}
              />
            </div>

            <div className="rounded border p-3 bg-muted/20 text-xs flex flex-col gap-1 text-muted-foreground">
              <span className="font-semibold text-foreground">Supported Path Formats:</span>
              <span>• Windows: <code className="text-primary font-mono">C:\Users\Name\Pictures</code> or <code className="text-primary font-mono">D:\Media</code></span>
              <span>• Linux / macOS: <code className="text-primary font-mono">/home/user/Videos</code> or <code className="text-primary font-mono">/media/drive</code></span>
              <span>• Docker Volume: <code className="text-primary font-mono">/host_media</code></span>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-fit gap-2">
              <FolderPlus className="size-4" />
              <span>{isSubmitting ? "Adding Folder..." : "Add Media Folder"}</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Configured Folders List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <HardDrive className="size-4 text-primary" />
              <span>Configured Media Folders ({folders.length})</span>
            </CardTitle>
            <CardDescription>All media paths scanned by the Python indexer</CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => scanMedia(true)}
            disabled={isScanning}
            className="gap-2"
          >
            <RefreshCw className={`size-4 ${isScanning ? "animate-spin" : ""}`} />
            <span>{isScanning ? "Scanning..." : "Rescan All"}</span>
          </Button>
        </CardHeader>

        <CardContent>
          {folders.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
              No media folders added yet. Add a folder path above to start indexing.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-center gap-3 truncate pr-2">
                    <div className="rounded p-2 bg-primary/10 text-primary">
                      <Folder className="size-4" />
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="font-semibold text-sm truncate">
                        {folder.name || folder.path}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono truncate">
                        {folder.path}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">
                      Active
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveFolder(folder.id)}
                      className="text-destructive hover:bg-destructive/10"
                      title="Remove folder"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Redis Cache Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="size-4 text-primary" />
            <span>Cache & Performance Settings</span>
          </CardTitle>
          <CardDescription>
            Redis caching accelerates sub-millisecond retrieval of scanned media metadata
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {cacheMessage && (
            <Alert className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600">
              <CheckCircle className="size-4" />
              <AlertDescription>{cacheMessage}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-sm">Redis Fast Caching</span>
              <span className="text-xs text-muted-foreground">
                Automatically enabled in Docker container environment
              </span>
            </div>
            <Badge variant="secondary">Active</Badge>
          </div>
        </CardContent>

        <CardFooter className="justify-end border-t pt-4">
          <Button variant="outline" size="sm" onClick={handleClearCache} className="gap-2">
            <RefreshCw className="size-4" />
            <span>Purge & Refresh Redis Cache</span>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
