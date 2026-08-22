import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getUserSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { getCache, setCache, clearCache } from "@/lib/redis";
import {
  classifyUpload,
  findLibraryForPath,
  getExtension,
  guessMime,
  isResolvedInside,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_FILES,
  relativeFolderLabel,
  sanitizeFileName,
  uniqueFilePath,
} from "@/lib/media-upload";

interface CachedScan {
  scannedFolders?: string[];
  unmountedFolders?: { path: string; error: string }[];
  totalFiles?: number;
  folders?: string[];
  files?: unknown[];
  scannedAt?: string;
}

export async function POST(request: NextRequest) {
  const session = await getUserSession(request);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const libraryPath = String(form.get("libraryPath") || "").trim();
  const destPath = String(form.get("destPath") || libraryPath).trim() || libraryPath;

  if (!libraryPath) {
    return NextResponse.json({ error: "Select a media library folder first" }, { status: 400 });
  }

  const libraries = await prisma.mediaFolder.findMany({
    where: { userId: session.user.id },
    select: { path: true },
  });

  const libraryMatch = findLibraryForPath(libraryPath, libraries.map((f) => f.path));
  if (!libraryMatch) {
    return NextResponse.json({ error: "Unknown media library folder" }, { status: 403 });
  }

  const destMatch = findLibraryForPath(destPath, [libraryMatch.libraryPath]);
  if (!destMatch || !isResolvedInside(destMatch.resolvedTarget, libraryMatch.resolvedLibrary)) {
    return NextResponse.json({ error: "Destination is outside the selected library" }, { status: 403 });
  }

  const incoming = [...form.getAll("files"), ...form.getAll("file")].filter(
    (item): item is File =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as File).arrayBuffer === "function" &&
      typeof (item as File).size === "number" &&
      (item as File).size > 0
  );

  if (incoming.length === 0) {
    return NextResponse.json({ error: "Select at least one photo or video" }, { status: 400 });
  }
  if (incoming.length > MAX_UPLOAD_FILES) {
    return NextResponse.json(
      { error: `You can upload at most ${MAX_UPLOAD_FILES} files at once` },
      { status: 400 }
    );
  }

  try {
    fs.mkdirSync(destMatch.resolvedTarget, { recursive: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create destination folder";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const uploaded: {
    id: string;
    name: string;
    path: string;
    folder: string;
    size: number;
    extension: string;
    type: "image" | "video";
    mimeType: string;
    modifiedAt: string;
  }[] = [];
  const errors: { name: string; error: string }[] = [];
  const folderLabel = relativeFolderLabel(libraryMatch.libraryPath, destPath);

  for (const file of incoming) {
    const safeName = sanitizeFileName(file.name);
    if (!safeName) {
      errors.push({ name: file.name || "unnamed", error: "Invalid file name" });
      continue;
    }

    const kind = classifyUpload(safeName, file.type);
    if (!kind) {
      errors.push({ name: safeName, error: "Only photos and videos can be uploaded" });
      continue;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      errors.push({ name: safeName, error: "File is larger than 2 GB" });
      continue;
    }

    try {
      const destFile = uniqueFilePath(destMatch.resolvedTarget, safeName);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(destFile, buffer);
      const stat = fs.statSync(destFile);
      const finalName = path.basename(destFile);
      const ext = getExtension(finalName);
      uploaded.push({
        id: `${destFile}_${stat.mtimeMs}`,
        name: finalName,
        path: destFile,
        folder: folderLabel,
        size: stat.size,
        extension: ext,
        type: kind,
        mimeType: guessMime(finalName, file.type),
        modifiedAt: stat.mtime.toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to write file";
      errors.push({ name: safeName, error: message });
    }
  }

  if (uploaded.length > 0) {
    const cacheKey = `media_scan_result_${session.user.id}`;
    const cached = await getCache<CachedScan>(cacheKey);
    if (cached) {
      const existingFolders = new Set(cached.folders || []);
      if (folderLabel && folderLabel !== "/") existingFolders.add(folderLabel);
      const next: CachedScan = {
        ...cached,
        files: [...uploaded, ...(cached.files || [])],
        folders: Array.from(existingFolders),
        totalFiles: (cached.totalFiles || 0) + uploaded.length,
        scannedAt: new Date().toISOString(),
      };
      await setCache(cacheKey, next, 3600);
    }
    await clearCache(`reels_playlist_${session.user.id}`);
  }

  return NextResponse.json({
    uploaded,
    errors,
    destPath,
    libraryPath: libraryMatch.libraryPath,
  });
}
