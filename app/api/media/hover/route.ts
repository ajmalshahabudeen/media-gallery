import { NextRequest, NextResponse } from "next/server";
import { getBufferCache } from "@/lib/redis";
import { getNormalizedPathHash } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filePathParam = searchParams.get("path");

  if (!filePathParam) {
    return NextResponse.json({ error: "Missing file path parameter" }, { status: 400 });
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
