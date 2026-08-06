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
import copy from "copy-to-clipboard";
import {
  FolderPlus,
  Folder,
  Trash2,
  RefreshCw,
  HardDrive,
  CheckCircle,
  Database,
  Info,
  Smartphone,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
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
  const [copiedType, setCopiedType] = useState<"flags" | "origin" | null>(null);

  const [currentOrigin] = useState(() => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "http://192.168.1.101:38479";
  });

  const copyFlagsUrl = () => {
    copy("chrome://flags/#unsafely-treat-insecure-origin-as-secure");
    setCopiedType("flags");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const copyOriginUrl = () => {
    copy(currentOrigin);
    setCopiedType("origin");
    setTimeout(() => setCopiedType(null), 2000);
  };

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
    const result = await addFolder(data.folderPath.trim(), data.folderName.trim());
    if (result.success) {
      setFormMessage({
        type: "success",
        text: "Media library folder added and indexing started!",
      });
      reset();
    } else {
      setFormMessage({
        type: "error",
        text: result.error || "Failed to add folder. Please check path format.",
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

            <div className="rounded border p-3 bg-muted/20 text-xs flex flex-col gap-1.5 text-muted-foreground">
              <span className="font-semibold text-foreground">Supported Path Formats:</span>
              <span>• <strong>Windows Local / External Drives:</strong> <code className="text-primary font-mono">C:\Users\Name\Pictures</code>, <code className="text-primary font-mono">F:\1</code>, <code className="text-primary font-mono">D:\Videos</code> (dynamically bridged on-demand).</span>
              <span>• <strong>Linux / macOS:</strong> <code className="text-primary font-mono">/home/user/Videos</code> or <code className="text-primary font-mono">/media/drive</code></span>
              <span>• <strong>Docker Mount:</strong> <code className="text-primary font-mono">/host_media</code></span>
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

      {/* PWA Mobile & LAN Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="size-4 text-primary" />
            <span>PWA Mobile & LAN Setup Guide</span>
          </CardTitle>
          <CardDescription>
            Configure browser flags once to install Server Gallery as a native full-screen PWA over HTTP Wi-Fi
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 text-xs">
          {/* Step 1: Chrome Flag */}
          <div className="p-3.5 rounded-xl border bg-muted/20 flex flex-col gap-2">
            <div className="flex items-center justify-between font-bold text-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                <span>Step 1: Open Insecure Origin Flag</span>
              </div>
              <Button variant="ghost" size="xs" onClick={copyFlagsUrl} className="h-7 text-[11px] gap-1">
                {copiedType === "flags" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                <span>{copiedType === "flags" ? "Copied!" : "Copy Flag URL"}</span>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Paste into Chrome/Edge address bar:
            </p>
            <code className="bg-background px-2.5 py-1.5 rounded border text-[11px] font-mono select-all break-all text-primary">
              chrome://flags/#unsafely-treat-insecure-origin-as-secure
            </code>
          </div>

          {/* Step 2: Add Origin */}
          <div className="p-3.5 rounded-xl border bg-muted/20 flex flex-col gap-2">
            <div className="flex items-center justify-between font-bold text-foreground">
              <div className="flex items-center gap-2">
                <ExternalLink className="size-4 text-primary" />
                <span>Step 2: Add Your Server Origin</span>
              </div>
              <Button variant="ghost" size="xs" onClick={copyOriginUrl} className="h-7 text-[11px] gap-1">
                {copiedType === "origin" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                <span>{copiedType === "origin" ? "Copied!" : "Copy Origin"}</span>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Set dropdown to <strong>Enabled</strong> and paste your server origin:
            </p>
            <code className="bg-background px-2.5 py-1.5 rounded border text-[11px] font-mono select-all break-all text-emerald-500">
              {currentOrigin}
            </code>
          </div>

          {/* Step 3: Relaunch & Install */}
          <div className="p-3.5 rounded-xl border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 flex flex-col gap-1 text-[11px]">
            <span className="font-bold">Step 3: Click Relaunch & Install App</span>
            <span>Click <strong>Relaunch</strong> at the bottom of Chrome. After restarting, click <strong>Install App</strong> or Chrome menu $\rightarrow$ <strong>Add to Home Screen</strong>!</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
