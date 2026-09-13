import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getUserSession } from "@/lib/auth-utils";
import { getSqliteDatabasePath } from "@/lib/backup-restore";

export async function POST(request: NextRequest) {
  const session = await getUserSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const requestedPath = body.snapshotPath;

    const dbPath = getSqliteDatabasePath();
    const dbDir = path.dirname(dbPath);
    const backupDir = path.join(dbDir, "backups");

    let snapshotToRestore = requestedPath;

    if (!snapshotToRestore && fs.existsSync(backupDir)) {
      const files = fs
        .readdirSync(backupDir)
        .filter((f) => f.startsWith("dev.db.pre-restore.") && f.endsWith(".bak"))
        .sort()
        .reverse();

      if (files.length > 0) {
        snapshotToRestore = path.join(backupDir, files[0]);
      }
    }

    if (!snapshotToRestore || !fs.existsSync(snapshotToRestore)) {
      return NextResponse.json(
        { error: "No pre-restore safety snapshot found to rollback to" },
        { status: 404 }
      );
    }

    // Atomic restore of SQLite snapshot
    await fs.promises.copyFile(snapshotToRestore, dbPath);

    return NextResponse.json({
      success: true,
      message: "Database restored to pre-restore safety snapshot successfully!",
      restoredFrom: path.basename(snapshotToRestore),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Rollback failed: ${errorMsg}` },
      { status: 500 }
    );
  }
}
