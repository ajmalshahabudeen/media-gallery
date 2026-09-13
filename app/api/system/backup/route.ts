import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { createTarGzip, TarFileEntry } from "@/lib/tar-gzip";
import { parsePathDriveInfo } from "@/lib/backup-healing";

export async function GET(request: NextRequest) {
  const session = await getUserSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const isAdmin = session.user.role === "admin";

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") || "personal"; // "personal" | "full"

  try {
    const isFullExport = isAdmin && scope === "full";

    // 1. Fetch Favorites
    const favorites = await prisma.favoriteMedia.findMany({
      where: isFullExport ? undefined : { userId },
      orderBy: { createdAt: "desc" },
    });

    // 2. Fetch Media Folders
    const folders = await prisma.mediaFolder.findMany({
      where: isFullExport ? undefined : { userId },
      orderBy: { createdAt: "desc" },
    });

    // Extract drive signatures
    const driveSet = new Set<string>();
    for (const fav of favorites) {
      const parsed = parsePathDriveInfo(fav.path);
      if (parsed.sourcePrefix) driveSet.add(parsed.sourcePrefix);
    }
    for (const folder of folders) {
      const parsed = parsePathDriveInfo(folder.path);
      if (parsed.sourcePrefix) driveSet.add(parsed.sourcePrefix);
    }

    // 3. Optional Admin Data (Users & System Logs)
    let users: Array<{ id: string; name: string; email: string; role?: string | null }> = [];
    let systemLogs: Array<{
      timestamp: Date;
      level: string;
      type: string;
      message: string;
      userEmail?: string | null;
      status: string;
      metadata?: string | null;
    }> = [];

    if (isFullExport) {
      users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true },
      });
      systemLogs = await prisma.systemLog.findMany({
        take: 1000,
        orderBy: { timestamp: "desc" },
      });
    }

    // 4. Manifest
    const manifest = {
      version: 1,
      appName: "Server Gallery",
      createdAt: new Date().toISOString(),
      exportedBy: session.user.email,
      exportType: isFullExport ? "full" : "personal",
      driveSignatures: Array.from(driveSet),
      counts: {
        favorites: favorites.length,
        folders: folders.length,
        users: users.length,
        systemLogs: systemLogs.length,
      },
    };

    // 5. Build Tar Files
    const tarEntries: TarFileEntry[] = [
      {
        name: "manifest.json",
        data: JSON.stringify(manifest, null, 2),
      },
      {
        name: "favorite_media.json",
        data: JSON.stringify(favorites, null, 2),
      },
      {
        name: "media_folders.json",
        data: JSON.stringify(folders, null, 2),
      },
    ];

    if (isFullExport) {
      tarEntries.push({
        name: "users.json",
        data: JSON.stringify(users, null, 2),
      });
      tarEntries.push({
        name: "system_logs.json",
        data: JSON.stringify(systemLogs, null, 2),
      });
    }

    // 6. Fast In-Memory Gzip Compression
    const gzBuffer = await createTarGzip(tarEntries);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `server-gallery-backup-${timestamp}.tar.gz`;

    return new Response(new Uint8Array(gzBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": gzBuffer.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to generate backup: ${errorMsg}` },
      { status: 500 }
    );
  }
}
