import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { spawn } from "child_process";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getCache, setCache } from "@/lib/redis";
import {
  resetIndexingProgress,
  setIndexingProgress,
  completeIndexingProgress,
} from "@/lib/progressStore";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";

  const cacheKey = `media_scan_result_${session.user.id}`;

  if (!force) {
    const cached = await getCache<unknown>(cacheKey);
    if (cached) {
      return NextResponse.json({ ...(cached as object), fromCache: true });
    }
  }

  return await performScan(session.user.id, cacheKey);
}

export async function POST() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cacheKey = `media_scan_result_${session.user.id}`;
  return await performScan(session.user.id, cacheKey);
}

async function performScan(userId: string, cacheKey: string) {
  try {
    const folders = await prisma.mediaFolder.findMany({
      where: { userId },
    });
    const folderPaths = folders.map((f) => f.path);

    if (folderPaths.length === 0) {
      const scanData = {
        scannedFolders: [],
        totalFiles: 0,
        folders: [],
        files: [],
        scannedAt: new Date().toISOString(),
      };
      await setCache(cacheKey, scanData, 3600);
      await completeIndexingProgress(0);
      return NextResponse.json({ ...scanData, fromCache: false });
    }

    await resetIndexingProgress(folderPaths);

    const scriptPath = path.join(process.cwd(), "scripts", "scanner.py");
    const allFiles: unknown[] = [];
    const allFoldersSet = new Set<string>();

    for (const targetPath of folderPaths) {
      await runScannerForPath(scriptPath, targetPath, allFiles, allFoldersSet);
    }

    const scanData = {
      scannedFolders: folderPaths,
      totalFiles: allFiles.length,
      folders: Array.from(allFoldersSet).sort(),
      files: allFiles,
      scannedAt: new Date().toISOString(),
    };

    await setCache(cacheKey, scanData, 3600);
    await completeIndexingProgress(allFiles.length);

    return NextResponse.json({ ...scanData, fromCache: false });
  } catch {
    await completeIndexingProgress(0);
    return NextResponse.json({ error: "Failed to scan media folders" }, { status: 500 });
  }
}

function runScannerForPath(
  scriptPath: string,
  targetPath: string,
  allFiles: unknown[],
  allFoldersSet: Set<string>
): Promise<void> {
  return new Promise((resolve) => {
    const pyProcess = spawn("python", [scriptPath, targetPath]);
    let stdoutData = "";

    pyProcess.stderr.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        if (line.startsWith("PROGRESS:")) {
          try {
            const rawJson = line.replace("PROGRESS:", "").trim();
            const progress = JSON.parse(rawJson);
            setIndexingProgress({
              scannedFiles: progress.scannedFiles,
              scannedFolders: progress.scannedFolders,
              currentFolder: progress.currentFolder,
              latestFile: progress.latestFile,
            });
          } catch {
            // Ignore parse errors on progress lines
          }
        }
      }
    });

    pyProcess.stdout.on("data", (data: Buffer) => {
      stdoutData += data.toString();
    });

    pyProcess.on("close", () => {
      try {
        if (stdoutData) {
          const result = JSON.parse(stdoutData);
          if (result.files && Array.isArray(result.files)) {
            allFiles.push(...result.files);
          }
          if (result.folders && Array.isArray(result.folders)) {
            result.folders.forEach((f: string) => allFoldersSet.add(f));
          }
        }
      } catch {
        // Skip failed folder parsing
      }
      resolve();
    });

    pyProcess.on("error", () => {
      resolve();
    });
  });
}
