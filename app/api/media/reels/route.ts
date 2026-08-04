import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCache, setCache } from "@/lib/redis";

export interface ReelVideo {
  id: string;
  name: string;
  path: string;
  folder: string;
  size: number;
  extension: string;
  type: "video";
  mimeType: string;
  modifiedAt: string;
  isFavorite?: boolean;
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isVideoFile(file: {
  type?: string;
  extension?: string;
  mimeType?: string;
}): boolean {
  if (file.type === "video") return true;
  if (file.mimeType?.startsWith("video/")) return true;
  const ext = (file.extension || "").toLowerCase().replace(/^\./, "");
  return ["mp4", "webm", "mkv", "mov", "avi", "m4v", "ogv", "3gp"].includes(ext);
}

// GET /api/media/reels?filter=all|favorites&limit=40&offset=0&reshuffle=true
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userId = session?.user?.id || "global";
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") === "favorites" ? "favorites" : "all";
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "40", 10) || 40, 1), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);
  const forceReshuffle = searchParams.get("reshuffle") === "true";

  try {
    const scanCacheKey = `media_scan_result_${userId}`;
    const reelsCacheKey = `reels_playlist_${userId}`;

    type ScanFile = {
      id?: string;
      name: string;
      path: string;
      folder?: string;
      size?: number;
      extension?: string;
      type?: string;
      mimeType?: string;
      modifiedAt?: string;
    };

    // Prefer dedicated reels playlist cache (already shuffled videos)
    let videos: ReelVideo[] | null = null;

    if (!forceReshuffle) {
      const cachedPlaylist = await getCache<ReelVideo[]>(reelsCacheKey);
      if (cachedPlaylist && Array.isArray(cachedPlaylist) && cachedPlaylist.length > 0) {
        videos = cachedPlaylist;
      }
    }

    if (!videos) {
      // Pull from media scan Redis cache (or empty if not scanned yet)
      const scanCached = await getCache<{ files?: ScanFile[] }>(scanCacheKey);
      const allFiles = Array.isArray(scanCached?.files) ? scanCached.files : [];

      const videoFiles = allFiles
        .filter((f) => isVideoFile(f) && f.path)
        .map((f) => ({
          id: f.id || f.path,
          name: f.name || f.path.split(/[/\\]/).pop() || "Video",
          path: f.path,
          folder: f.folder || "",
          size: typeof f.size === "number" ? f.size : 0,
          extension: f.extension || "",
          type: "video" as const,
          mimeType: f.mimeType || "video/mp4",
          modifiedAt: f.modifiedAt || new Date().toISOString(),
        }));

      videos = shuffleArray(videoFiles);
      // Cache shuffled playlist for 30 minutes
      await setCache(reelsCacheKey, videos, 1800);
    }

    // Favorite paths for this user
    const favorites = await prisma.favoriteMedia.findMany({
      where: { userId, type: "video" },
      select: { path: true },
    });
    const favoritePaths = new Set(favorites.map((f) => f.path));

    // If favorites filter and we have no videos from scan, fall back to favorite records
    let filtered: ReelVideo[];
    if (filter === "favorites") {
      if (videos.length === 0) {
        const favRecords = await prisma.favoriteMedia.findMany({
          where: { userId, type: "video" },
          orderBy: { createdAt: "desc" },
        });
        filtered = shuffleArray(
          favRecords.map((f) => ({
            id: f.id,
            name: f.name,
            path: f.path,
            folder: f.folder,
            size: f.size,
            extension: f.extension,
            type: "video" as const,
            mimeType: "video/mp4",
            modifiedAt: f.modifiedAt.toISOString(),
            isFavorite: true,
          }))
        );
      } else {
        filtered = videos.filter((v) => favoritePaths.has(v.path));
      }
    } else {
      filtered = videos;
    }

    const withFlags = filtered.map((v) => ({
      ...v,
      isFavorite: favoritePaths.has(v.path),
    }));

    const page = withFlags.slice(offset, offset + limit);
    const hasMore = offset + limit < withFlags.length;

    return NextResponse.json({
      videos: page,
      total: withFlags.length,
      offset,
      limit,
      hasMore,
      filter,
      fromCache: !forceReshuffle,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load reels" }, { status: 500 });
  }
}
