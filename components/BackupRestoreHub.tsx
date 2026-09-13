"use client";

import { useState, useRef } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Archive,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  RefreshCw,
  HardDrive,
  Check,
  Layers,
  FileCheck,
  Zap,
} from "lucide-react";
import { BackupHealingAuditReport, DriveMappingProposal } from "@/lib/backup-healing";
import { RestorePayload, MergeStrategy } from "@/lib/backup-restore";
import { useMediaStore } from "@/store/useMediaStore";

export function BackupRestoreHub() {
  const { fetchFolders, scanMedia } = useMediaStore();

  // Export State
  const [exportScope, setExportScope] = useState<"personal" | "full">("personal");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Import / Inspect State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Confirmation Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [auditReport, setAuditReport] = useState<BackupHealingAuditReport | null>(null);
  const [restorePayload, setRestorePayload] = useState<RestorePayload | null>(null);
  const [hasUsers, setHasUsers] = useState<boolean>(false);
  const [hasLogs, setHasLogs] = useState<boolean>(false);

  // User Choices in Modal
  const [selectedDriveMappings, setSelectedDriveMappings] = useState<Record<string, string>>({});
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>("smart_merge");
  const [restoreComponents, setRestoreComponents] = useState({
    favorites: true,
    folders: true,
    users: false,
    logs: false,
  });

  // Execution State
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<{
    success: boolean;
    favoritesCreated?: number;
    favoritesUpdated?: number;
    foldersCreated?: number;
    snapshotPath?: string;
    error?: string;
  } | null>(null);

  // Rollback State
  const [isRollingBack, setIsRollingBack] = useState<boolean>(false);
  const [rollbackSuccess, setRollbackSuccess] = useState<string | null>(null);

  // 1. Download Backup
  const handleDownloadBackup = async () => {
    setIsExporting(true);
    setExportSuccess(null);
    try {
      const res = await fetch(`/api/system/backup?scope=${exportScope}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to generate backup archive");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = "media-gallery-backup.tar.gz";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportSuccess(`Backup downloaded successfully as ${filename} (< 50ms generation)!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setInspectError(`Export failed: ${msg}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Upload and Inspect Archive
  const handleFileSelected = async (file: File) => {
    setIsInspecting(true);
    setInspectError(null);
    setExecutionResult(null);
    setRollbackSuccess(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/system/restore/inspect", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to inspect backup file");
      }

      setAuditReport(data.auditReport);
      setRestorePayload(data.payload);
      setHasUsers(Boolean(data.hasUsers));
      setHasLogs(Boolean(data.hasLogs));

      // Pre-fill initial drive mappings based on auto-detected proposals
      const initialMap: Record<string, string> = {};
      if (data.auditReport?.mappingProposals) {
        for (const prop of data.auditReport.mappingProposals as DriveMappingProposal[]) {
          initialMap[prop.sourceDriveId.toLowerCase()] = prop.suggestedTargetDriveId.toLowerCase();
        }
      }
      setSelectedDriveMappings(initialMap);

      // Open interactive confirmation dialog
      setIsModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setInspectError(msg);
    } finally {
      setIsInspecting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 3. Execute Restore with Confirmed Drive Alterations
  const handleConfirmRestore = async () => {
    if (!restorePayload) return;

    setIsExecuting(true);
    try {
      const mappingsArray = Object.entries(selectedDriveMappings).map(
        ([sourceDriveId, targetDriveId]) => ({
          sourceDriveId,
          targetDriveId,
        })
      );

      const res = await fetch("/api/system/restore/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: restorePayload,
          confirmedDriveMappings: mappingsArray,
          mergeStrategy,
          restoreComponents,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to execute restore");
      }

      setExecutionResult(result);
      setIsModalOpen(false);

      // Refresh media store and folders
      await fetchFolders();
      await scanMedia(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setInspectError(`Restore failed: ${msg}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // 4. Rollback
  const handleRollback = async () => {
    setIsRollingBack(true);
    try {
      const res = await fetch("/api/system/restore/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotPath: executionResult?.snapshotPath }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to rollback");
      }

      setRollbackSuccess(data.message || "Rollback completed!");
      setExecutionResult(null);
      await fetchFolders();
      await scanMedia(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setInspectError(`Rollback error: ${msg}`);
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Archive className="size-4 text-primary" />
            <span>Backup & Restore Hub</span>
          </CardTitle>
          <Badge variant="outline" className="gap-1 text-primary border-primary/30">
            <Zap className="size-3 text-primary" />
            <span>Fast In-Memory (.tar.gz)</span>
          </Badge>
        </div>
        <CardDescription>
          Ultra-fast compressed database backups with intelligent host-drive auto-healing and safe merge logic.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {/* Media Exemption Notice */}
        <div className="p-3 rounded-lg border bg-muted/20 text-xs flex flex-col gap-1 text-muted-foreground">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-primary" />
            Zero-Bloat External Storage Policy
          </span>
          <span>
            Physical video/photo files remain safely on your host hard disks (<code className="font-mono text-primary">/host_drives/...</code>).
            Archives contain lightweight database structures, favorites, and folder paths, enabling sub-50ms transfers (&lt; 100 KB).
          </span>
        </div>

        {/* Notifications */}
        {exportSuccess && (
          <Alert className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-4" />
            <AlertDescription>{exportSuccess}</AlertDescription>
          </Alert>
        )}

        {inspectError && (
          <Alert className="border-destructive/50 bg-destructive/10 text-destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>{inspectError}</AlertDescription>
          </Alert>
        )}

        {rollbackSuccess && (
          <Alert className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-4" />
            <AlertDescription>{rollbackSuccess}</AlertDescription>
          </Alert>
        )}

        {/* Execution Summary Notification */}
        {executionResult && executionResult.success && (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex flex-col gap-2.5 text-xs text-foreground">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="size-4" />
                Restore Completed Successfully!
              </span>
              {executionResult.snapshotPath && (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleRollback}
                  disabled={isRollingBack}
                  className="gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                >
                  <RotateCcw className={`size-3 ${isRollingBack ? "animate-spin" : ""}`} />
                  <span>{isRollingBack ? "Undoing..." : "Undo Restore"}</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              <div className="p-2 rounded bg-background/80 border text-[11px]">
                <span className="text-muted-foreground block">Favorites Added</span>
                <strong className="text-foreground text-xs">{executionResult.favoritesCreated || 0}</strong>
              </div>
              <div className="p-2 rounded bg-background/80 border text-[11px]">
                <span className="text-muted-foreground block">Favorites Updated</span>
                <strong className="text-foreground text-xs">{executionResult.favoritesUpdated || 0}</strong>
              </div>
              <div className="p-2 rounded bg-background/80 border text-[11px]">
                <span className="text-muted-foreground block">Folders Created</span>
                <strong className="text-foreground text-xs">{executionResult.foldersCreated || 0}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Dual Grid: Backup & Restore */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Box 1: Create Backup */}
          <div className="p-4 rounded-xl border bg-muted/10 flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-sm flex items-center gap-2 text-foreground">
                <Download className="size-4 text-primary" />
                Create Database Backup
              </span>
              <p className="text-xs text-muted-foreground">
                Package your library folders, favorite media markers, and configuration into an ultra-fast compressed archive.
              </p>

              <div className="flex items-center gap-4 pt-1 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={exportScope === "personal"}
                    onChange={() => setExportScope("personal")}
                    className="accent-primary"
                  />
                  <span>Personal Library</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={exportScope === "full"}
                    onChange={() => setExportScope("full")}
                    className="accent-primary"
                  />
                  <span>Full System Backup</span>
                </label>
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleDownloadBackup}
              disabled={isExporting}
              className="w-full gap-2"
            >
              {isExporting ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              <span>{isExporting ? "Generating Archive..." : "Download Backup (.tar.gz)"}</span>
            </Button>
          </div>

          {/* Box 2: Restore from Backup */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileSelected(file);
            }}
            className={`p-4 rounded-xl border-2 border-dashed flex flex-col justify-between gap-4 transition-colors ${
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-border/80 hover:border-primary/50 bg-muted/10"
            }`}
          >
            <div className="flex flex-col gap-1.5">
              <span className="font-semibold text-sm flex items-center gap-2 text-foreground">
                <UploadCloud className="size-4 text-primary" />
                Restore from Backup
              </span>
              <p className="text-xs text-muted-foreground">
                Drag & drop your <code className="font-mono text-primary">.tar.gz</code> or select a file to inspect paths and auto-heal drive letters.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".tar.gz,.tar,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
              }}
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isInspecting}
              className="w-full gap-2 border-primary/30 hover:bg-primary/10"
            >
              {isInspecting ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <UploadCloud className="size-4" />
              )}
              <span>{isInspecting ? "Inspecting & Healing Paths..." : "Select Backup File"}</span>
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Interactive Drive Remapping & Merge Confirmation Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <HardDrive className="size-5 text-primary" />
              <span>Confirm Drive Remapping & Merge Strategy</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review verified host-drive paths and select how data should be merged into your database.
            </DialogDescription>
          </DialogHeader>

          {auditReport && (
            <div className="flex flex-col gap-4 py-2 text-xs">
              {/* Inspection Metrics Banner */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-lg border bg-muted/20">
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-[11px]">Total Favorites</span>
                  <span className="font-bold text-sm text-foreground">{auditReport.totalItems}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-[11px]">Healed & Verified</span>
                  <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    {auditReport.healedRemapCount + auditReport.exactMatchCount}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-[11px]">Missing / Unmounted</span>
                  <span className="font-bold text-sm text-amber-500">
                    {auditReport.missingCount}
                  </span>
                </div>
              </div>

              {/* Dedicated Host-Drive Remapping Section */}
              <div className="flex flex-col gap-2.5 p-3.5 rounded-xl border bg-card">
                <span className="font-semibold text-sm flex items-center gap-2 text-foreground">
                  <HardDrive className="size-4 text-primary" />
                  Host-Drive Path Auto-Healing & Alteration
                </span>
                <p className="text-muted-foreground text-[11px]">
                  When migrating across machines, drive letters often change (e.g. from <code className="font-mono text-primary font-semibold">F:</code> to <code className="font-mono text-primary font-semibold">D:</code>).
                  Confirm or customize the target drive below:
                </p>

                {auditReport.mappingProposals.length === 0 ? (
                  <div className="p-2 rounded border bg-muted/20 text-muted-foreground text-[11px]">
                    All paths match your currently connected drives without remapping required.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {auditReport.mappingProposals.map((prop) => (
                      <div
                        key={prop.sourceDriveId}
                        className="p-2.5 rounded-lg border bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {prop.sourceBasePath || `Drive ${prop.sourceDriveId.toUpperCase()}:`}
                          </Badge>
                          <ArrowRight className="size-3.5 text-muted-foreground" />
                          <span className="font-semibold">Remap to:</span>
                        </div>

                        <select
                          value={selectedDriveMappings[prop.sourceDriveId.toLowerCase()] || prop.suggestedTargetDriveId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedDriveMappings((prev) => ({
                              ...prev,
                              [prop.sourceDriveId.toLowerCase()]: val,
                            }));
                          }}
                          className="h-8 rounded-md border bg-background px-2.5 text-xs font-mono text-foreground focus:ring-1 focus:ring-primary"
                        >
                          {auditReport.connectedDrives.map((drive) => (
                            <option key={drive.id} value={drive.id}>
                              {drive.label}
                              {drive.id === prop.suggestedTargetDriveId && prop.verifiedFileCount > 0
                                ? ` (${prop.verifiedFileCount} files verified)`
                                : ""}
                            </option>
                          ))}
                          <option value={prop.sourceDriveId}>
                            Keep Original ({prop.sourceBasePath})
                          </option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Merge Strategy Radio */}
              <div className="flex flex-col gap-2 p-3.5 rounded-xl border bg-card">
                <span className="font-semibold text-sm flex items-center gap-2 text-foreground">
                  <Layers className="size-4 text-primary" />
                  Intelligent Merge Strategy
                </span>

                <div className="flex flex-col gap-2 text-xs">
                  <label className="flex items-start gap-2 p-2 rounded-lg border bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors">
                    <input
                      type="radio"
                      name="strategy"
                      checked={mergeStrategy === "smart_merge"}
                      onChange={() => setMergeStrategy("smart_merge")}
                      className="mt-0.5 accent-primary"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">Smart Upsert & Merge (Recommended)</span>
                      <span className="text-[11px] text-muted-foreground">
                        Preserves all existing items. Updates metadata and appends newly imported favorites/folders without duplicate errors.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-2 rounded-lg border bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors">
                    <input
                      type="radio"
                      name="strategy"
                      checked={mergeStrategy === "skip_existing"}
                      onChange={() => setMergeStrategy("skip_existing")}
                      className="mt-0.5 accent-primary"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">Skip Existing Records</span>
                      <span className="text-[11px] text-muted-foreground">
                        Only imports records that do not already exist in your library.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-2 rounded-lg border bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors">
                    <input
                      type="radio"
                      name="strategy"
                      checked={mergeStrategy === "overwrite"}
                      onChange={() => setMergeStrategy("overwrite")}
                      className="mt-0.5 accent-primary"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-destructive">Clean Overwrite</span>
                      <span className="text-[11px] text-muted-foreground">
                        Clears your existing favorites and re-creates them cleanly from the backup archive.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Selective Components */}
              <div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/20 text-xs">
                <span className="font-semibold text-foreground">Components:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restoreComponents.favorites}
                    onChange={(e) =>
                      setRestoreComponents((prev) => ({ ...prev, favorites: e.target.checked }))
                    }
                    className="accent-primary"
                  />
                  <span>Favorites</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restoreComponents.folders}
                    onChange={(e) =>
                      setRestoreComponents((prev) => ({ ...prev, folders: e.target.checked }))
                    }
                    className="accent-primary"
                  />
                  <span>Media Folders</span>
                </label>
                {hasUsers && (
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restoreComponents.users}
                      onChange={(e) =>
                        setRestoreComponents((prev) => ({ ...prev, users: e.target.checked }))
                      }
                      className="accent-primary"
                    />
                    <span>Users</span>
                  </label>
                )}
                {hasLogs && (
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restoreComponents.logs}
                      onChange={(e) =>
                        setRestoreComponents((prev) => ({ ...prev, logs: e.target.checked }))
                      }
                      className="accent-primary"
                    />
                    <span>System Logs</span>
                  </label>
                )}
              </div>

              {/* Sample Preview Accordion / Table */}
              {auditReport.sampleItems.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="font-semibold text-xs text-muted-foreground">
                    Sample Verified Items Preview ({auditReport.sampleItems.length}):
                  </span>
                  <div className="max-h-36 overflow-y-auto rounded-lg border divide-y text-[11px]">
                    {auditReport.sampleItems.map((item, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between gap-2 bg-card">
                        <div className="flex flex-col truncate pr-2">
                          <span className="font-medium truncate">{item.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono truncate">
                            {item.suggestedPath}
                          </span>
                        </div>
                        {item.status === "EXACT_MATCH" ? (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 shrink-0">
                            Exact Match
                          </Badge>
                        ) : item.status === "HEALED_DRIVE_REMAP" ? (
                          <Badge variant="outline" className="text-[10px] text-primary border-primary/30 shrink-0">
                            Healed Drive
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30 shrink-0">
                            Offline / Missing
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex items-center justify-between border-t pt-3">
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <FileCheck className="size-3.5 text-primary" />
              <span>Safety rollback snapshot will be created automatically.</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                disabled={isExecuting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmRestore}
                disabled={isExecuting}
                className="gap-2"
              >
                {isExecuting ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                <span>{isExecuting ? "Executing Restore..." : "Confirm & Restore"}</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
