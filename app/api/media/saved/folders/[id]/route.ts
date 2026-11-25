import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { getSavedStateForUser } from "@/lib/saved-media";

// PATCH /api/media/saved/folders/[id] — Rename a custom virtual save folder
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getUserSession(request);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { id } = await context.params;

  try {
    const body = await request.json();
    const rawName = typeof body?.name === "string" ? body.name.trim() : "";

    if (!rawName) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }
    if (rawName.length > 60) {
      return NextResponse.json({ error: "Folder name must be 60 characters or less" }, { status: 400 });
    }

    const folder = await prisma.saveFolder.findFirst({
      where: { id, userId },
    });
    if (!folder) {
      return NextResponse.json({ error: "Save folder not found" }, { status: 404 });
    }
    if (folder.isDefault) {
      return NextResponse.json(
        { error: "The default Main Save folder cannot be renamed" },
        { status: 400 }
      );
    }

    const siblings = await prisma.saveFolder.findMany({
      where: { userId, id: { not: id } },
      select: { name: true },
    });
    if (siblings.some((s) => s.name.toLowerCase() === rawName.toLowerCase())) {
      return NextResponse.json(
        { error: "Another save folder already uses this name" },
        { status: 409 }
      );
    }

    await prisma.saveFolder.update({
      where: { id },
      data: { name: rawName },
    });

    const state = await getSavedStateForUser(userId);
    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ error: "Failed to rename save folder" }, { status: 500 });
  }
}

// DELETE /api/media/saved/folders/[id] — Delete a custom virtual save folder
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getUserSession(request);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { id } = await context.params;

  try {
    const folder = await prisma.saveFolder.findFirst({
      where: { id, userId },
    });
    if (!folder) {
      return NextResponse.json({ error: "Save folder not found" }, { status: 404 });
    }
    if (folder.isDefault) {
      return NextResponse.json(
        { error: "The default Main Save folder cannot be deleted" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.saveFolder.delete({ where: { id } });
      // Remove any SavedMedia records that no longer belong to any save folder
      await tx.savedMedia.deleteMany({
        where: {
          userId,
          folders: { none: {} },
        },
      });
    });

    const state = await getSavedStateForUser(userId);
    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ error: "Failed to delete save folder" }, { status: 500 });
  }
}
