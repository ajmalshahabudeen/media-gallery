import fs from "node:fs";
import path from "node:path";
import { resolveServerPath } from "@/lib/server-utils";

export interface ConnectedDrive {
  id: string; // e.g. "c", "d", "f", "host_media"
  label: string; // e.g. "Host Drive (D:)"
  basePath: string; // e.g. "/host_drives/d" or "D:\"
  type: "host_drives" | "windows" | "mount" | "host_media";
}

export type HealingStatus =
  | "EXACT_MATCH"
  | "HEALED_DRIVE_REMAP"
  | "HEALED_FOLDER_REMAP"
  | "OFFLINE_OR_MISSING";

export interface HealedMediaItem {
  originalPath: string;
  suggestedPath: string;
  name: string;
  type: string;
  folder?: string;
  status: HealingStatus;
  fileExists: boolean;
  originalDriveId?: string;
  newDriveId?: string;
  error?: string;
}

export interface DriveMappingProposal {
  sourceDriveId: string;
  sourceBasePath: string;
  suggestedTargetDriveId: string;
  suggestedTargetBasePath: string;
  verifiedFileCount: number;
  totalCandidateCount: number;
}

export interface BackupHealingAuditReport {
  totalItems: number;
  exactMatchCount: number;
  healedRemapCount: number;
  missingCount: number;
  connectedDrives: ConnectedDrive[];
  sourceDrives: string[];
  mappingProposals: DriveMappingProposal[];
  sampleItems: HealedMediaItem[];
}

/**
 * Discovers all active, mounted host drives and volumes available to the current server runtime.
 */
export function discoverConnectedDrives(): ConnectedDrive[] {
  const drives: ConnectedDrive[] = [];
  const seenIds = new Set<string>();

  // 1. Check Docker /host_drives mounts (/host_drives/c, /host_drives/d, etc.)
  if (fs.existsSync("/host_drives")) {
    try {
      const entries = fs.readdirSync("/host_drives", { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() || entry.isSymbolicLink()) {
          const letter = entry.name.toLowerCase();
          if (!seenIds.has(letter)) {
            seenIds.add(letter);
            drives.push({
              id: letter,
              label: `Host Drive /host_drives/${letter} (${letter.toUpperCase()}:)`,
              basePath: `/host_drives/${letter}`,
              type: "host_drives",
            });
          }
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  // 2. Check /run/desktop/mnt/host/ mounts
  if (fs.existsSync("/run/desktop/mnt/host")) {
    try {
      const entries = fs.readdirSync("/run/desktop/mnt/host", { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() || entry.isSymbolicLink()) {
          const letter = entry.name.toLowerCase();
          if (!seenIds.has(letter)) {
            seenIds.add(letter);
            drives.push({
              id: letter,
              label: `WSL Host Drive /run/desktop/mnt/host/${letter} (${letter.toUpperCase()}:)`,
              basePath: `/run/desktop/mnt/host/${letter}`,
              type: "mount",
            });
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  // 3. Check /mnt/ mounts (WSL2 standard)
  for (const letter of ["c", "d", "e", "f", "g", "h"]) {
    const mntPath = `/mnt/${letter}`;
    if (!seenIds.has(letter) && fs.existsSync(mntPath)) {
      seenIds.add(letter);
      drives.push({
        id: letter,
        label: `WSL Mount ${mntPath} (${letter.toUpperCase()}:)`,
        basePath: mntPath,
        type: "mount",
      });
    }
  }

  // 4. Check Windows native drive letters (A:\ through Z:\)
  const letters = "CDEFGHIJKLMNOPQRSTUVWXYZAB".split("");
  for (const letter of letters) {
    const dlLower = letter.toLowerCase();
    const winPath = `${letter}:\\`;
    if (!seenIds.has(dlLower)) {
      try {
        if (fs.existsSync(winPath)) {
          seenIds.add(dlLower);
          drives.push({
            id: dlLower,
            label: `Windows Drive ${letter}:\\`,
            basePath: winPath,
            type: "windows",
          });
        }
      } catch {
        // Ignore unready drives
      }
    }
  }

  // 5. Check /host_media mount
  if (fs.existsSync("/host_media")) {
    drives.push({
      id: "host_media",
      label: "Docker Host Media (/host_media)",
      basePath: "/host_media",
      type: "host_media",
    });
  }

  return drives;
}

/**
 * Extracts the drive identifier and relative subpath from a given file path.
 * Supports:
 * - "/host_drives/f/media/vid.mp4" -> driveId: "f", subpath: "media/vid.mp4"
 * - "F:\media\vid.mp4" or "F:/media/vid.mp4" -> driveId: "f", subpath: "media/vid.mp4"
 * - "/run/desktop/mnt/host/f/..." -> driveId: "f", subpath: "..."
 * - "/mnt/f/..." -> driveId: "f", subpath: "..."
 * - "/host_media/sub/..." -> driveId: "host_media", subpath: "sub/..."
 */
export function parsePathDriveInfo(rawPath: string): {
  driveId: string;
  sourcePrefix: string;
  subpath: string;
  isWindowsFormat: boolean;
} {
  const norm = rawPath.replace(/\\/g, "/").trim();

  // Pattern 1: /host_drives/<letter>/...
  const hostDrivesMatch = norm.match(/^\/host_drives\/([a-zA-Z])(?:\/(.*))?$/);
  if (hostDrivesMatch) {
    return {
      driveId: hostDrivesMatch[1].toLowerCase(),
      sourcePrefix: `/host_drives/${hostDrivesMatch[1]}`,
      subpath: (hostDrivesMatch[2] || "").trim(),
      isWindowsFormat: false,
    };
  }

  // Pattern 2: Windows drive letter C:/... or C:\...
  const winMatch = norm.match(/^([a-zA-Z]):(?:\/(.*))?$/);
  if (winMatch) {
    return {
      driveId: winMatch[1].toLowerCase(),
      sourcePrefix: `${winMatch[1].toUpperCase()}:`,
      subpath: (winMatch[2] || "").trim(),
      isWindowsFormat: true,
    };
  }

  // Pattern 3: /run/desktop/mnt/host/<letter>/...
  const dockerHostMatch = norm.match(/^\/run\/desktop\/mnt\/host\/([a-zA-Z])(?:\/(.*))?$/);
  if (dockerHostMatch) {
    return {
      driveId: dockerHostMatch[1].toLowerCase(),
      sourcePrefix: `/run/desktop/mnt/host/${dockerHostMatch[1]}`,
      subpath: (dockerHostMatch[2] || "").trim(),
      isWindowsFormat: false,
    };
  }

  // Pattern 4: /mnt/<letter>/...
  const mntMatch = norm.match(/^\/mnt\/([a-zA-Z])(?:\/(.*))?$/);
  if (mntMatch) {
    return {
      driveId: mntMatch[1].toLowerCase(),
      sourcePrefix: `/mnt/${mntMatch[1]}`,
      subpath: (mntMatch[2] || "").trim(),
      isWindowsFormat: false,
    };
  }

  // Pattern 5: /host_media/...
  if (norm.startsWith("/host_media")) {
    const sub = norm.replace(/^\/host_media\/?/, "");
    return {
      driveId: "host_media",
      sourcePrefix: "/host_media",
      subpath: sub,
      isWindowsFormat: false,
    };
  }

  // Fallback: entire path as subpath
  return {
    driveId: "unknown",
    sourcePrefix: "",
    subpath: norm,
    isWindowsFormat: false,
  };
}

/**
 * Replaces a source drive prefix with a target drive prefix, respecting path separators.
 */
export function substituteDrivePath(
  originalPath: string,
  targetDrive: ConnectedDrive,
  parsedInfo?: ReturnType<typeof parsePathDriveInfo>
): string {
  const info = parsedInfo || parsePathDriveInfo(originalPath);
  const subpath = info.subpath;

  if (targetDrive.type === "windows") {
    const winBase = targetDrive.basePath.replace(/[/\\]$/, "");
    const winSub = subpath.replace(/\//g, "\\");
    return winSub ? `${winBase}\\${winSub}` : winBase;
  }

  // Docker or Unix base path
  const baseNorm = targetDrive.basePath.replace(/\/$/, "");
  return subpath ? `${baseNorm}/${subpath}` : baseNorm;
}

/**
 * Robust async file existence check with timeout protection (1,200ms)
 * Prevents hanging on unresponsive network drives or dead mounts.
 */
export async function asyncFileExists(targetPath: string, timeoutMs: number = 1200): Promise<boolean> {
  const resolved = resolveServerPath(targetPath);
  return new Promise<boolean>((resolve) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, timeoutMs);

    fs.promises
      .stat(resolved)
      .then(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(true);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(false);
        }
      });
  });
}

/**
 * Concurrency-limited parallel queue runner.
 */
export async function runParallelQueue<T, R>(
  items: T[],
  workerFn: (item: T, index: number) => Promise<R>,
  concurrency: number = 16
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      try {
        results[idx] = await workerFn(items[idx], idx);
      } catch (err: unknown) {
        // Fallback error containment
        const errMsg = err instanceof Error ? err.message : String(err);
        results[idx] = { error: errMsg } as unknown as R;
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Dedicated Auto-Healing & Verification Pipeline for FavoriteMedia and MediaFolder records.
 * Runs parallel async disk verification across candidate host drives, detecting drive substitutions.
 */
export async function analyzeAndHealMediaPaths(
  items: Array<{ path: string; name?: string; type?: string; folder?: string }>,
  concurrency: number = 16
): Promise<BackupHealingAuditReport> {
  const connectedDrives = discoverConnectedDrives();

  // Track drive counts for intelligent mapping proposals
  // Key: `${sourceDriveId}->${targetDriveId}`
  const drivePairSuccessCounts = new Map<string, { verifiedCount: number; sourcePrefix: string; targetDrive: ConnectedDrive }>();
  const sourceDriveCounts = new Map<string, number>();

  const healedItems = await runParallelQueue<
    { path: string; name?: string; type?: string; folder?: string },
    HealedMediaItem
  >(
    items,
    async (item) => {
      const origPath = item.path;
      const parsed = parsePathDriveInfo(origPath);
      const name = item.name || path.basename(origPath) || "Media";
      const mediaType = item.type || "other";

      if (parsed.driveId !== "unknown") {
        sourceDriveCounts.set(parsed.driveId, (sourceDriveCounts.get(parsed.driveId) || 0) + 1);
      }

      // Step 1: Check if exact original path exists right now
      const exactExists = await asyncFileExists(origPath);
      if (exactExists) {
        return {
          originalPath: origPath,
          suggestedPath: origPath,
          name,
          type: mediaType,
          folder: item.folder,
          status: "EXACT_MATCH",
          fileExists: true,
          originalDriveId: parsed.driveId,
          newDriveId: parsed.driveId,
        };
      }

      // Step 2: Drive Substitution Test
      // For each connected drive, test if substituting the drive letter/base path finds the file
      for (const targetDrive of connectedDrives) {
        // If same drive ID and already checked, skip
        if (targetDrive.id.toLowerCase() === parsed.driveId.toLowerCase() && exactExists) {
          continue;
        }

        const candidatePath = substituteDrivePath(origPath, targetDrive, parsed);
        const candidateExists = await asyncFileExists(candidatePath);

        if (candidateExists) {
          const pairKey = `${parsed.driveId}->${targetDrive.id}`;
          const current = drivePairSuccessCounts.get(pairKey) || {
            verifiedCount: 0,
            sourcePrefix: parsed.sourcePrefix,
            targetDrive,
          };
          current.verifiedCount += 1;
          drivePairSuccessCounts.set(pairKey, current);

          return {
            originalPath: origPath,
            suggestedPath: candidatePath,
            name,
            type: mediaType,
            folder: item.folder,
            status: "HEALED_DRIVE_REMAP",
            fileExists: true,
            originalDriveId: parsed.driveId,
            newDriveId: targetDrive.id,
          };
        }
      }

      // Step 3: Not found on any connected drive (external drive unplugged or file removed)
      return {
        originalPath: origPath,
        suggestedPath: origPath,
        name,
        type: mediaType,
        folder: item.folder,
        status: "OFFLINE_OR_MISSING",
        fileExists: false,
        originalDriveId: parsed.driveId,
      };
    },
    concurrency
  );

  // Compile Drive Mapping Proposals for user confirmation
  const mappingProposals: DriveMappingProposal[] = [];
  const processedSourceDrives = new Set<string>();

  for (const [sourceId, totalCount] of sourceDriveCounts.entries()) {
    processedSourceDrives.add(sourceId);

    // Find the target drive with highest verified file count for this source
    let bestTarget: { targetDrive: ConnectedDrive; verifiedCount: number; sourcePrefix: string } | null = null;

    for (const [pairKey, stats] of drivePairSuccessCounts.entries()) {
      if (pairKey.startsWith(`${sourceId}->`)) {
        if (!bestTarget || stats.verifiedCount > bestTarget.verifiedCount) {
          bestTarget = stats;
        }
      }
    }

    if (bestTarget && bestTarget.verifiedCount > 0) {
      mappingProposals.push({
        sourceDriveId: sourceId,
        sourceBasePath: bestTarget.sourcePrefix,
        suggestedTargetDriveId: bestTarget.targetDrive.id,
        suggestedTargetBasePath: bestTarget.targetDrive.basePath,
        verifiedFileCount: bestTarget.verifiedCount,
        totalCandidateCount: totalCount,
      });
    } else {
      // Source drive has missing files with no verified auto-replacement
      mappingProposals.push({
        sourceDriveId: sourceId,
        sourceBasePath: sourceId.length === 1 ? `/host_drives/${sourceId}` : sourceId,
        suggestedTargetDriveId: connectedDrives[0]?.id || sourceId,
        suggestedTargetBasePath: connectedDrives[0]?.basePath || "",
        verifiedFileCount: 0,
        totalCandidateCount: totalCount,
      });
    }
  }

  let exactMatchCount = 0;
  let healedRemapCount = 0;
  let missingCount = 0;

  for (const it of healedItems) {
    if (it.status === "EXACT_MATCH") exactMatchCount++;
    else if (it.status === "HEALED_DRIVE_REMAP" || it.status === "HEALED_FOLDER_REMAP") healedRemapCount++;
    else missingCount++;
  }

  return {
    totalItems: healedItems.length,
    exactMatchCount,
    healedRemapCount,
    missingCount,
    connectedDrives,
    sourceDrives: Array.from(processedSourceDrives),
    mappingProposals,
    sampleItems: healedItems.slice(0, 15), // Preview sample for the UI dialog
  };
}
