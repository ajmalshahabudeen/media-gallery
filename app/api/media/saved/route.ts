import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth-utils";
import {
  getSavedStateForUser,
  quickSaveToDefaultFolder,
  setMediaSaveFolders,
  toggleMediaInSaveFolder,
  unsaveMedia,
  type SaveMediaInput,
} from "@/lib/saved-media";

// GET /api/media/saved?folderId=...
export async function GET(request: NextRequest) {
  const session = await getUserSession(request);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const folderId = new URL(request.url).searchParams.get("folderId");
    const state = await getSavedStateForUser(session.user.id, folderId);
    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ error: "Failed to fetch saved media" }, { status: 500 });
  }
}

// POST /api/media/saved
// Supports: quick-save, toggle-folder, set-folders, unsave (DB-only virtual folders)
export async function POST(request: NextRequest) {
  const session = await getUserSession(request);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const action = (body?.action as string) || "quick-save";
    const media = (body?.media ?? body) as SaveMediaInput;

    if (!media?.path || typeof media.path !== "string") {
      return NextResponse.json({ error: "Missing media path" }, { status: 400 });
    }

    if (action === "quick-save") {
      const result = await quickSaveToDefaultFolder(userId, media);
      const state = await getSavedStateForUser(userId);
      return NextResponse.json({ ...result, ...state });
    }

    if (action === "toggle-folder") {
      const saveFolderId = body?.saveFolderId as string | undefined;
      if (!saveFolderId) {
        return NextResponse.json({ error: "Missing saveFolderId" }, { status: 400 });
      }
      const result = await toggleMediaInSaveFolder(userId, media, saveFolderId, {
        moveFromDefault: !!body?.moveFromDefault,
      });
      const state = await getSavedStateForUser(userId);
      return NextResponse.json({ ...result, ...state });
    }

    if (action === "set-folders") {
      const folderIds = Array.isArray(body?.folderIds)
        ? body.folderIds.filter((id: unknown): id is string => typeof id === "string")
        : [];
      const result = await setMediaSaveFolders(userId, media, folderIds);
      const state = await getSavedStateForUser(userId);
      return NextResponse.json({ ...result, ...state });
    }

    if (action === "unsave") {
      const result = await unsaveMedia(userId, media.path);
      const state = await getSavedStateForUser(userId);
      return NextResponse.json({ ...result, ...state });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update saved media";
    const status = msg === "Save folder not found" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
