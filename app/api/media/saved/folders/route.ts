import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import {
  ensureDefaultSaveFolder,
  getSavedStateForUser,
  toggleMediaInSaveFolder,
  type SaveMediaInput,
} from "@/lib/saved-media";

// GET /api/media/saved/folders
export async function GET(request: NextRequest) {
  const session = await getUserSession(request);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const state = await getSavedStateForUser(session.user.id);
    return NextResponse.json({
      defaultFolderId: state.defaultFolderId,
      folders: state.folders,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load save folders" }, { status: 500 });
  }
}

// POST /api/media/saved/folders — Creates a virtual DB-only save folder (never touches disk)
export async function POST(request: NextRequest) {
  const session = await getUserSession(request);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const rawName = typeof body?.name === "string" ? body.name.trim() : "";

    if (!rawName) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }
    if (rawName.length > 60) {
      return NextResponse.json({ error: "Folder name must be 60 characters or less" }, { status: 400 });
    }

    await ensureDefaultSaveFolder(userId);

    const existingFolders = await prisma.saveFolder.findMany({
      where: { userId },
      select: { id: true, name: true },
    });
    const duplicate = existingFolders.find(
      (f) => f.name.toLowerCase() === rawName.toLowerCase()
    );
    if (duplicate) {
      return NextResponse.json(
        { error: "A save folder with this name already exists" },
        { status: 409 }
      );
    }

    const created = await prisma.saveFolder.create({
      data: {
        userId,
        name: rawName,
        isDefault: false,
      },
    });

    // Optionally save a media item directly into this newly created folder
    const media = body?.media as SaveMediaInput | undefined;
    if (media?.path) {
      await toggleMediaInSaveFolder(userId, media, created.id, {
        moveFromDefault: !!body?.moveFromDefault,
      });
    }

    const state = await getSavedStateForUser(userId);
    const createdDto = state.folders.find((f) => f.id === created.id) || null;

    return NextResponse.json(
      {
        folder: createdDto,
        ...state,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Failed to create save folder" }, { status: 500 });
  }
}
