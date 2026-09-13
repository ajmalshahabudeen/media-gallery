"use client";

import { useEffect, useState, useCallback } from "react";
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
  Play,
  Square,
  AlertCircle,
} from "lucide-react";
import { IndexingProgressBanner } from "@/components/IndexingProgressBanner";
import { MediaUploadPanel } from "@/components/MediaUploadPanel";

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

  // Prisma Studio state
  const [studioStatus, setStudioStatus] = useState<
    "running" | "stopped" | "starting" | "stopping"
  >("stopped");
  const [studioPort, setStudioPort] = useState<number>(5555);
  const [studioLoading, setStudioLoading] = useState<boolean>(false);
  const [studioError, setStudioError] = useState<string | null>(null);
  const [studioCopied, setStudioCopied] = useState<boolean>(false);

  const fetchStudioStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/system/prisma-studio");
      if (res.ok) {
        const data = await res.json();
        setStudioStatus(data.running ? "running" : "stopped");
        if (data.port) setStudioPort(data.port);
        if (data.error) setStudioError(data.error);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleToggleStudio = async () => {
    setStudioLoading(true);
    setStudioError(null);
    const action = studioStatus === "running" ? "stop" : "start";
    setStudioStatus(action === "start" ? "starting" : "stopping");

    try {
      const res = await fetch("/api/system/prisma-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success || data.running !== undefined) {
        setStudioStatus(data.running ? "running" : "stopped");
        if (data.port) setStudioPort(data.port);
        if (data.error) setStudioError(data.error);
      } else {
        setStudioError(data.error || "Failed to execute Prisma Studio command");
        await fetchStudioStatus();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setStudioError(msg);
      await fetchStudioStatus();
    } finally {
      setStudioLoading(false);
    }
  };

  const [currentOrigin] = useState(() => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "http://192.168.1.101:38479";
  });

  const studioHostname =
    typeof window !== "undefined" ? window.location.hostname : "localhost";
  const studioUrl = `http://${studioHostname}:${studioPort}`;

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
    let isSubscribed = true;
    fetch("/api/system/prisma-studio")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isSubscribed && data) {
          setStudioStatus(data.running ? "running" : "stopped");
          if (data.port) setStudioPort(data.port);
          if (data.error) setStudioError(data.error);
        }
      })
      .catch(() => {});

    return () => {
      isSubscribed = false;
    };
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

      {/* Upload into an existing library folder */}
      {folders.length > 0 && <MediaUploadPanel />}

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

      {/* Prisma Database Studio Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-primary" />
              <CardTitle className="text-base">Prisma Database Studio</CardTitle>
            </div>
            {studioStatus === "running" ? (
              <Badge
                variant="outline"
                className="gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
              >
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Running</span>
              </Badge>
            ) : studioStatus === "starting" ? (
              <Badge
                variant="outline"
                className="gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
              >
                <RefreshCw className="size-3 animate-spin" />
                <span>Starting...</span>
              </Badge>
            ) : studioStatus === "stopping" ? (
              <Badge
                variant="outline"
                className="gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
              >
                <RefreshCw className="size-3 animate-spin" />
                <span>Stopping...</span>
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1.5 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-muted-foreground/40" />
                <span>Stopped</span>
              </Badge>
            )}
          </div>
          <CardDescription>
            Prisma visual database browser running inside Docker and exposed to host machine on port {studioPort}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {studioError && (
            <Alert className="border-destructive/50 bg-destructive/10 text-destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{studioError}</AlertDescription>
            </Alert>
          )}

          {studioStatus === "running" ? (
            <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    Studio URL (Exposed Port {studioPort})
                  </span>
                  <code className="bg-background/80 px-2.5 py-1.5 rounded border text-xs font-mono select-all text-emerald-600 dark:text-emerald-400 font-semibold break-all">
                    {studioUrl}
                  </code>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      copy(studioUrl);
                      setStudioCopied(true);
                      setTimeout(() => setStudioCopied(false), 2000);
                    }}
                    className="gap-1.5 h-8 text-xs"
                  >
                    {studioCopied ? (
                      <Check className="size-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    <span>{studioCopied ? "Copied" : "Copy URL"}</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => window.open(studioUrl, "_blank", "noopener,noreferrer")}
                    className="gap-1.5 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  >
                    <ExternalLink className="size-3.5" />
                    <span>Open Studio</span>
                  </Button>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground flex flex-col gap-0.5 border-t border-border/50 pt-2.5">
                <span>
                  • <strong>Docker Port Forwarding:</strong> Port{" "}
                  <code className="font-mono text-primary font-semibold">{studioPort}</code> is mapped
                  directly to your local machine.
                </span>
                <span>
                  • <strong>Database:</strong> SQLite database at{" "}
                  <code className="font-mono text-primary">/app/prisma_db/dev.db</code> (User,
                  MediaFolder, SystemLog, FavoriteMedia).
                </span>
                {studioHostname !== "localhost" && (
                  <span>
                    • <strong>Localhost Alternative:</strong> Also reachable via{" "}
                    <code className="font-mono text-primary font-semibold">
                      http://localhost:{studioPort}
                    </code>{" "}
                    on the server machine.
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border bg-muted/20 flex flex-col gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Docker Command:</span>
              <code className="bg-background px-2.5 py-1.5 rounded border text-[11px] font-mono text-primary">
                bun prisma studio --browser none --port {studioPort}
              </code>
              <p className="text-[11px] pt-1">
                When started, Prisma Studio opens a graphical browser interface on port {studioPort}.
                It allows you to explore, filter, and modify SQLite database records directly from your
                local machine browser.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t pt-4">
          <div className="text-xs text-muted-foreground">
            {studioStatus === "running"
              ? "Studio is active and listening on 0.0.0.0:" + studioPort
              : "Studio is currently offline"}
          </div>

          <Button
            variant={studioStatus === "running" ? "destructive" : "default"}
            size="sm"
            disabled={studioLoading}
            onClick={handleToggleStudio}
            className="gap-2"
          >
            {studioLoading ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : studioStatus === "running" ? (
              <Square className="size-4 fill-current" />
            ) : (
              <Play className="size-4 fill-current" />
            )}
            <span>
              {studioLoading
                ? studioStatus === "starting"
                  ? "Starting..."
                  : "Stopping..."
                : studioStatus === "running"
                ? "Stop Prisma Studio"
                : "Start Prisma Studio"}
            </span>
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
