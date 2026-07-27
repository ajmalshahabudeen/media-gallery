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

  // Fallback redirect to full file stream endpoint if thumbnail is not yet generated
  const fileUrl = new URL("/api/media/file", request.url);
  fileUrl.searchParams.set("path", filePathParam);
  return NextResponse.redirect(fileUrl);
}
