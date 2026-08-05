import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth-utils";
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
  const session = await getUserSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";

  const cacheKey = `media_scan_result_${userId}`;

  if (!force) {
    const cached = await getCache<{ files?: { path?: string }[]; folders?: string[] }>(cacheKey);
    if (cached) {
      const sanitizedFiles = (cached.files || []).filter((f) => {
        const p = f.path ? f.path.replace(/\\/g, "/") : "";
        return (
          !p.includes("/node_modules/") &&
          !p.includes("/.git/") &&
          !p.includes("/.next/") &&
          !p.includes("/prisma/") &&
          !p.includes("/caddy_data/") &&
          !p.includes("/db_data/")
        );
      });
      const sanitizedFolders = (cached.folders || []).filter(
        (f) =>
          !f.includes("node_modules") &&
          !f.includes(".git") &&
          !f.includes(".next") &&
          !f.includes("prisma")
      );
      return NextResponse.json({
        ...cached,
        files: sanitizedFiles,
        folders: sanitizedFolders,
        totalFiles: sanitizedFiles.length,
        fromCache: true,
      });
    }
  }

  return await performScan(userId, cacheKey);
}

export async function POST(request: NextRequest) {
  const session = await getUserSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const cacheKey = `media_scan_result_${userId}`;
  return await performScan(userId, cacheKey);
}

async function performScan(userId: string, cacheKey: string) {
  try {
    const folders = await prisma.mediaFolder.findMany({
      where: { userId },
      select: { path: true },
    });

    const folderPaths = folders.map((f) => f.path);

    if (folderPaths.length === 0) {
      const emptyScanData = {
        scannedFolders: [],
        totalFiles: 0,
        folders: [],
        files: [],
        scannedAt: new Date().toISOString(),
      };
      await setCache(cacheKey, emptyScanData, 3600);
      await completeIndexingProgress(0);
      return NextResponse.json({ ...emptyScanData, fromCache: false });
    }

    await resetIndexingProgress(folderPaths);

    const scriptPath = path.join(process.cwd(), "scripts", "scanner.py");
    const allFiles: unknown[] = [];
    const allFoldersSet = new Set<string>();
    const unmountedFolders: { path: string; error: string }[] = [];

    for (const targetPath of folderPaths) {
      await runScannerForPath(scriptPath, targetPath, allFiles, allFoldersSet, unmountedFolders);
    }

    const filteredFiles = (allFiles as { path?: string }[]).filter((f) => {
      const p = f.path ? f.path.replace(/\\/g, "/") : "";
      return (
        !p.includes("/node_modules/") &&
        !p.includes("/.git/") &&
        !p.includes("/.next/") &&
        !p.includes("/prisma/") &&
        !p.includes("/caddy_data/") &&
        !p.includes("/db_data/")
      );
    });

    const filteredFolders = Array.from(allFoldersSet)
      .filter(
        (f) =>
          !f.includes("node_modules") &&
          !f.includes(".git") &&
          !f.includes(".next") &&
          !f.includes("prisma")
      )
      .sort();

    const scanData = {
      scannedFolders: folderPaths,
      unmountedFolders,
      totalFiles: filteredFiles.length,
      folders: filteredFolders,
      files: filteredFiles,
      scannedAt: new Date().toISOString(),
    };

    await setCache(cacheKey, scanData, 3600);
    await completeIndexingProgress(filteredFiles.length);

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
  allFoldersSet: Set<string>,
  unmountedFolders: { path: string; error: string }[]
): Promise<void> {
  return new Promise((resolve) => {
    console.log(`[ServerScan] Spawning Python indexer for target: '${targetPath}'`);
    const pyProcess = spawn("python", [scriptPath, targetPath]);
    let stdoutData = "";

    pyProcess.stderr.on("data", (data: Buffer) => {
      const text = data.toString();
      const lines = text.split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
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
        } else {
          console.error(`[Python Scanner] ${line}`);
        }
      }
    });

    pyProcess.stdout.on("data", (data: Buffer) => {
      const text = data.toString();
      stdoutData += text;
    });

    pyProcess.on("close", (code) => {
      console.log(`[ServerScan] Python indexer exited with code ${code} for path: '${targetPath}'`);
      try {
        if (stdoutData) {
          const result = JSON.parse(stdoutData);
          if (result.unmounted || result.error) {
            unmountedFolders.push({
              path: targetPath,
              error: result.error || `Volume not mounted for ${targetPath}`,
            });
          }
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

    pyProcess.on("error", (err) => {
      console.error(`[ServerScan] Failed to spawn Python process for '${targetPath}':`, err);
      unmountedFolders.push({
        path: targetPath,
        error: `Failed to execute scanner for ${targetPath}: ${err.message}`,
      });
      resolve();
    });
  });
}
