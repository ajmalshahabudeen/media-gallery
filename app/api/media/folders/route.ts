import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const folders = await prisma.mediaFolder.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ folders });
  } catch {
    return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: folderPath, name } = body;

    if (!folderPath || typeof folderPath !== "string") {
      return NextResponse.json({ error: "Folder path is required" }, { status: 400 });
    }

    const folder = await prisma.mediaFolder.upsert({
      where: { path: folderPath },
      update: { name: name || folderPath },
      create: {
        path: folderPath,
        name: name || folderPath,
      },
    });

    return NextResponse.json({ folder });
  } catch {
    return NextResponse.json({ error: "Failed to add folder" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const folderPath = searchParams.get("path");

    if (id) {
      await prisma.mediaFolder.delete({ where: { id } });
    } else if (folderPath) {
      await prisma.mediaFolder.delete({ where: { path: folderPath } });
    } else {
      return NextResponse.json({ error: "Missing folder ID or path" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
  }
}
