import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getUserSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { findLibraryForPath, joinStoredPath, sanitizeSegment, isResolvedInside } from "@/lib/media-upload";

export async function POST(request: NextRequest) {
  const session = await getUserSession(request);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { parentPath?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parentPath = (body.parentPath || "").trim();
  const rawName = body.name || "";
  const name = sanitizeSegment(rawName);

  if (!parentPath) {
    return NextResponse.json({ error: "Parent folder is required" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "Enter a valid folder name" }, { status: 400 });
  }

  const libraries = await prisma.mediaFolder.findMany({
    where: { userId: session.user.id },
    select: { path: true },
  });

  const match = findLibraryForPath(parentPath, libraries.map((f) => f.path));
  if (!match) {
    return NextResponse.json({ error: "Folder is outside your media library" }, { status: 403 });
  }

  const destResolved = path.join(match.resolvedTarget, name);
  if (!isResolvedInside(destResolved, match.resolvedLibrary)) {
    return NextResponse.json({ error: "Invalid folder path" }, { status: 400 });
  }

  try {
    fs.mkdirSync(destResolved, { recursive: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create folder";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    folder: {
      name,
      path: joinStoredPath(parentPath, name),
      resolvedPath: destResolved,
    },
  });
}
