import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getBufferCache } from "@/lib/redis";
import { getNormalizedPathHash } from "@/lib/utils";
import { getUserSession, isPathAuthorized } from "@/lib/auth-utils";

const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mkv", ".avi", ".mov", ".flv", ".wmv", ".m4v"]);

export async function GET(request: NextRequest) {
  const session = await getUserSession(request);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filePathParam = searchParams.get("path");

  if (!filePathParam) {
    return NextResponse.json({ error: "Missing file path parameter" }, { status: 400 });
  }

  const isAdmin = (session.user as { role?: string }).role === "admin";
  const authorized = await isPathAuthorized(filePathParam, session.user.id, isAdmin);
  if (!authorized) {
    return NextResponse.json({ error: "Access denied to this file" }, { status: 403 });
  }

  const hash = getNormalizedPathHash(filePathParam);
  const thumbKey = `thumb:${hash}`;

  const cachedBuffer = await getBufferCache(thumbKey);

  if (cachedBuffer) {
    return new NextResponse(Uint8Array.from(cachedBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": cachedBuffer.length.toString(),
        "Cache-Control": "public, max-age=2592000, immutable",
      },
    });
  }

  const ext = path.extname(filePathParam).toLowerCase();

  // For images: redirect to raw file stream
  if (!VIDEO_EXTENSIONS.has(ext)) {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:38479";
    const proto = request.headers.get("x-forwarded-proto") || "http";
    const tokenParam = searchParams.get("token");
    let redirectUrl = `${proto}://${host}/api/media/file?path=${encodeURIComponent(filePathParam)}`;
    if (tokenParam) {
      redirectUrl += `&token=${encodeURIComponent(tokenParam)}`;
    }
    return NextResponse.redirect(redirectUrl);
  }

  // For videos: return clean SVG poster graphic while background generator is rendering thumbnail
  const svgPoster = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270" fill="none"><rect width="480" height="270" fill="#090d16"/><circle cx="240" cy="135" r="32" fill="#7c3aed" fill-opacity="0.2" stroke="#a855f7" stroke-width="2"/><polygon points="234,121 254,135 234,149" fill="#a855f7"/><text x="240" y="192" fill="#94a3b8" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="600">PREPARING THUMBNAIL...</text></svg>`;

  return new NextResponse(svgPoster, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
