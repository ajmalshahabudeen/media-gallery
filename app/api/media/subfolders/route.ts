import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { resolveServerPath } from "@/lib/server-utils";
import { findLibraryForPath, joinStoredPath, listImmediateSubfolders } from "@/lib/media-upload";

export async function GET(request: NextRequest) {
  const session = await getUserSession(request);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parentPath = searchParams.get("path") || searchParams.get("parentPath") || "";

  const libraries = await prisma.mediaFolder.findMany({
    where: { userId: session.user.id },
    select: { path: true, name: true },
  });

  if (libraries.length === 0) {
    return NextResponse.json({ folders: [], libraries: [] });
  }

  const libraryPaths = libraries.map((f) => f.path);

  if (!parentPath) {
    return NextResponse.json({
      libraries: libraries.map((f) => ({
        path: f.path,
        name: f.name || f.path,
      })),
      folders: [],
    });
  }

  const match = findLibraryForPath(parentPath, libraryPaths);
  if (!match) {
    return NextResponse.json({ error: "Folder is outside your media library" }, { status: 403 });
  }

  const resolvedParent = resolveServerPath(parentPath);
  const children = listImmediateSubfolders(resolvedParent).map((child) => ({
    name: child.name,
    path: joinStoredPath(parentPath, child.name),
  }));

  return NextResponse.json({
    libraries: libraries.map((f) => ({
      path: f.path,
      name: f.name || f.path,
    })),
    parentPath,
    folders: [
      {
        name: "Library root",
        path: match.libraryPath,
        isRoot: parentPath === match.libraryPath,
      },
      ...children,
    ],
  });
}
