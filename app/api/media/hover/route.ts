import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getBufferCache } from "@/lib/redis";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filePathParam = searchParams.get("path");

  if (!filePathParam) {
    return NextResponse.json({ error: "Missing file path parameter" }, { status: 400 });
  }

  const hash = crypto.createHash("md5").update(filePathParam).digest("hex");
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

  // Return 404 if hover sneak-peek WebP is not yet generated
  return NextResponse.json({ error: "Hover preview not found or not ready" }, { status: 404 });
}
