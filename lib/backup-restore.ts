import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { parsePathDriveInfo, substituteDrivePath, discoverConnectedDrives } from "@/lib/backup-healing";

export type MergeStrategy = "smart_merge" | "skip_existing" | "overwrite";

export interface ConfirmedDriveMapping {
  sourceDriveId: string;
  targetDriveId: string;
}

export interface RestorePayload {
  manifest?: {
    version: number;
    appName: string;
    createdAt: string;
  };
  favorites?: Array<{
    path: string;
    name?: string;
    folder?: string;
    type?: string;
    extension?: string;
    size?: number;
    modifiedAt?: string | Date;
  }>;
  folders?: Array<{
    path: string;
    name?: string;
  }>;
  users?: Array<{
    id: string;
    name: string;
    email: string;
    role?: string | null;
  }>;
  systemLogs?: Array<{
    timestamp?: string | Date;
    level: string;
    type: string;
    message: string;
    userEmail?: string | null;
    status: string;
    metadata?: string | null;
  }>;
}

export interface RestoreExecutionOptions {
  currentUserId: string;
  currentUserEmail: string;
  isAdmin: boolean;
  mergeStrategy: MergeStrategy;
  confirmedDriveMappings: ConfirmedDriveMapping[];
  restoreComponents: {
    favorites: boolean;
    folders: boolean;
    users: boolean;
    logs: boolean;
  };
}

export interface RestoreResultSummary {
  success: boolean;
  favoritesProcessed: number;
  favoritesCreated: number;
  favoritesUpdated: number;
  favoritesSkipped: number;
  foldersProcessed: number;
  foldersCreated: number;
  snapshotPath?: string;
  error?: string;
}

/**
 * Resolves the physical path to the active SQLite database file.
 */
export function getSqliteDatabasePath(): string {
  const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
  let clean = dbUrl.replace(/^file:/, "").replace(/\?.*$/, "");
  if (!path.isAbsolute(clean)) {
    clean = path.resolve(/*turbopackIgnore: true*/ process.cwd(), clean);
  }
  return clean;
}

/**
 * Creates an automatic pre-restore safety snapshot for instant rollback.
 */
export async function createPreRestoreSnapshot(): Promise<string | null> {
  const dbPath = getSqliteDatabasePath();
  if (!fs.existsSync(dbPath)) return null;

  try {
    const dbDir = path.dirname(dbPath);
    const backupDir = path.join(dbDir, "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const snapshotPath = path.join(backupDir, `dev.db.pre-restore.${timestamp}.bak`);

    await fs.promises.copyFile(dbPath, snapshotPath);
    return snapshotPath;
  } catch (err) {
    console.error("[Backup Restore] Failed to create safety snapshot:", err);
    return null;
  }
}

/**
 * Executes a full database restoration with user-confirmed drive mappings and intelligent merging.
 */
export async function executeDatabaseRestore(
  payload: RestorePayload,
  options: RestoreExecutionOptions
): Promise<RestoreResultSummary> {
  // Step 1: Create Safety Rollback Snapshot
  const snapshotPath = await createPreRestoreSnapshot();

  const connectedDrives = discoverConnectedDrives();
  const driveMap = new Map<string, string>();
  for (const mapping of options.confirmedDriveMappings) {
    driveMap.set(mapping.sourceDriveId.toLowerCase(), mapping.targetDriveId.toLowerCase());
  }

  // Helper to remap any file or folder path based on confirmed drive mappings
  const remapPath = (originalPath: string): string => {
    const parsed = parsePathDriveInfo(originalPath);
    const targetDriveId = driveMap.get(parsed.driveId.toLowerCase());
    if (!targetDriveId) {
      return originalPath;
    }

    const targetDrive = connectedDrives.find((d) => d.id.toLowerCase() === targetDriveId);
    if (!targetDrive) {
      return originalPath;
    }

    return substituteDrivePath(originalPath, targetDrive, parsed);
  };

  let favoritesProcessed = 0;
  let favoritesCreated = 0;
  let favoritesUpdated = 0;
  let favoritesSkipped = 0;
  let foldersProcessed = 0;
  let foldersCreated = 0;

  try {
    // ----------------------------------------------------
    // Component 1: Media Folders
    // ----------------------------------------------------
    if (options.restoreComponents.folders && payload.folders && payload.folders.length > 0) {
      for (const folderItem of payload.folders) {
        if (!folderItem.path) continue;
        const remappedPath = remapPath(folderItem.path);
        foldersProcessed++;

        const existing = await prisma.mediaFolder.findUnique({
          where: {
            userId_path: {
              userId: options.currentUserId,
              path: remappedPath,
            },
          },
        });

        if (existing) {
          if (options.mergeStrategy === "smart_merge" && folderItem.name) {
            await prisma.mediaFolder.update({
              where: { id: existing.id },
              data: { name: folderItem.name },
            });
          }
        } else {
          await prisma.mediaFolder.create({
            data: {
              userId: options.currentUserId,
              path: remappedPath,
              name: folderItem.name || remappedPath,
            },
          });
          foldersCreated++;
        }
      }
    }

    // ----------------------------------------------------
    // Component 2: Favorite Media
    // ----------------------------------------------------
    if (options.restoreComponents.favorites && payload.favorites && payload.favorites.length > 0) {
      if (options.mergeStrategy === "overwrite") {
        // Clean overwrite for current user
        await prisma.favoriteMedia.deleteMany({
          where: { userId: options.currentUserId },
        });
      }

      // Process favorites in atomic batches of 100
      const BATCH_SIZE = 100;
      for (let i = 0; i < payload.favorites.length; i += BATCH_SIZE) {
        const batch = payload.favorites.slice(i, i + BATCH_SIZE);

        await prisma.$transaction(async (tx) => {
          for (const item of batch) {
            if (!item.path) continue;
            favoritesProcessed++;

            const remappedItemPath = remapPath(item.path);
            const remappedFolderPath = item.folder ? remapPath(item.folder) : "";

            const existing = await tx.favoriteMedia.findUnique({
              where: {
                userId_path: {
                  userId: options.currentUserId,
                  path: remappedItemPath,
                },
              },
            });

            if (existing) {
              if (options.mergeStrategy === "smart_merge") {
                await tx.favoriteMedia.update({
                  where: { id: existing.id },
                  data: {
                    name: item.name || existing.name,
                    folder: remappedFolderPath || existing.folder,
                    type: item.type || existing.type,
                    extension: item.extension || existing.extension,
                    size: typeof item.size === "number" ? item.size : existing.size,
                    modifiedAt: item.modifiedAt ? new Date(item.modifiedAt) : existing.modifiedAt,
                  },
                });
                favoritesUpdated++;
              } else {
                favoritesSkipped++;
              }
            } else {
              await tx.favoriteMedia.create({
                data: {
                  userId: options.currentUserId,
                  path: remappedItemPath,
                  name: item.name || path.basename(remappedItemPath) || "Media",
                  folder: remappedFolderPath,
                  type: item.type || "document",
                  extension: item.extension || path.extname(remappedItemPath) || "",
                  size: typeof item.size === "number" ? item.size : 0,
                  modifiedAt: item.modifiedAt ? new Date(item.modifiedAt) : new Date(),
                },
              });
              favoritesCreated++;
            }
          }
        });
      }
    }

    // ----------------------------------------------------
    // Component 3: System Logs (Admin only)
    // ----------------------------------------------------
    if (options.isAdmin && options.restoreComponents.logs && payload.systemLogs && payload.systemLogs.length > 0) {
      for (const logItem of payload.systemLogs) {
        if (!logItem.type || !logItem.message) continue;
        try {
          await prisma.systemLog.create({
            data: {
              timestamp: logItem.timestamp ? new Date(logItem.timestamp) : new Date(),
              level: logItem.level || "INFO",
              type: logItem.type,
              message: logItem.message,
              userEmail: logItem.userEmail || options.currentUserEmail,
              status: logItem.status || "SUCCESS",
              metadata: logItem.metadata || null,
            },
          });
        } catch {
          // Ignore duplicate or format issues on individual logs
        }
      }
    }

    return {
      success: true,
      favoritesProcessed,
      favoritesCreated,
      favoritesUpdated,
      favoritesSkipped,
      foldersProcessed,
      foldersCreated,
      snapshotPath: snapshotPath || undefined,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Backup Restore] Execution error:", errorMsg);
    return {
      success: false,
      favoritesProcessed,
      favoritesCreated,
      favoritesUpdated,
      favoritesSkipped,
      foldersProcessed,
      foldersCreated,
      snapshotPath: snapshotPath || undefined,
      error: errorMsg,
    };
  }
}
