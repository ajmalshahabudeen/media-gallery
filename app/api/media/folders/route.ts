import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import fs from "fs";
import path from "path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const folders = await prisma.mediaFolder.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ folders });
  } catch {
    return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { path: folderPath, name } = body;

    if (!folderPath || typeof folderPath !== "string") {
      return NextResponse.json({ error: "Folder path is required" }, { status: 400 });
    }

    const normalizedPath = path.normalize(folderPath.trim());
    let pathExists = fs.existsSync(normalizedPath);

    if (!pathExists) {
      // Check candidate paths inside container environment
      const driveMatch = normalizedPath.match(/^([a-zA-Z]):[/\\]?(.*)/);
      if (driveMatch) {
        const driveLetter = driveMatch[1].toLowerCase();
        const subpath = driveMatch[2].replace(/\\/g, "/").replace(/^\//, "");
        if (subpath) {
          const candidates = [
            path.join("/host_media", subpath),
            path.join("/host_media", driveLetter, subpath),
            path.join("/host_drives", driveLetter, subpath),
          ];
          for (const candidate of candidates) {
            if (candidate && fs.existsSync(candidate)) {
              pathExists = true;
              break;
            }
          }
        }
      } else if (normalizedPath === "/host_media" && fs.existsSync("/host_media")) {
        pathExists = true;
      }
    }

    if (!pathExists) {
      return NextResponse.json(
        { error: `Folder path does not exist or is not mounted on the server: ${folderPath}` },
        { status: 400 }
      );
    }

    const folder = await prisma.mediaFolder.upsert({
      where: {
        userId_path: {
          userId: session.user.id,
          path: folderPath.trim(),
        },
      },
      update: { name: name || folderPath.trim() },
      create: {
        path: folderPath.trim(),
        name: name || folderPath.trim(),
        userId: session.user.id,
      },
    });

    return NextResponse.json({ folder });
  } catch {
    return NextResponse.json({ error: "Failed to add folder" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const folderPath = searchParams.get("path");

    if (id) {
      await prisma.mediaFolder.deleteMany({
        where: { id, userId: session.user.id },
      });
    } else if (folderPath) {
      await prisma.mediaFolder.deleteMany({
        where: { path: folderPath, userId: session.user.id },
      });
    } else {
      return NextResponse.json({ error: "Missing folder ID or path" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
  }
}
