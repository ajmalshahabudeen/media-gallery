import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

// GET /api/media/favorites - List user's favorite media items
export async function GET(request: NextRequest) {
  const session = await getUserSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const favorites = await prisma.favoriteMedia.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ favorites });
  } catch {
    return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 });
  }
}

// POST /api/media/favorites - Toggle favorite status for a media item
export async function POST(request: NextRequest) {
  const session = await getUserSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const { path, name, folder, type, extension, size, modifiedAt } = body;

    if (!path) {
      return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
    }

    const existing = await prisma.favoriteMedia.findUnique({
      where: {
        userId_path: {
          userId,
          path,
        },
      },
    });

    if (existing) {
      // Remove from favorites
      await prisma.favoriteMedia.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ isFavorite: false });
    } else {
      // Add to favorites
      const created = await prisma.favoriteMedia.create({
        data: {
          userId,
          path,
          name: name || path.split("/").pop() || "Media",
          folder: folder || "",
          type: type || "document",
          extension: extension || "",
          size: typeof size === "number" ? size : 0,
          modifiedAt: modifiedAt ? new Date(modifiedAt) : new Date(),
        },
      });
      return NextResponse.json({ isFavorite: true, favorite: created });
    }
  } catch {
    return NextResponse.json({ error: "Failed to toggle favorite" }, { status: 500 });
  }
}
