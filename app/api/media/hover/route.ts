import { NextRequest, NextResponse } from "next/server";
import { getBufferCache } from "@/lib/redis";
import { getNormalizedPathHash } from "@/lib/utils";
import { getUserSession, isPathAuthorized } from "@/lib/auth-utils";

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
  const hoverKey = `hover:${hash}`;

  const cachedBuffer = await getBufferCache(hoverKey);

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

  // Return HTTP 204 No Content if hover sneak peek is not yet generated in Redis
  return new NextResponse(null, { status: 204 });
}
