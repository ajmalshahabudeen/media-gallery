import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getUserSession } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession(request);
    const headerList = await headers();

    const body = await request.json();
    const { name, path, type } = body;

    if (!path) {
      return NextResponse.json({ error: "Missing media path" }, { status: 400 });
    }

    const clientIp =
      headerList.get("x-forwarded-for")?.split(",")[0] ||
      headerList.get("x-real-ip") ||
      "127.0.0.1";
    const userAgent = headerList.get("user-agent");

    await logger.mediaView({
      fileName: name || path.split("/").pop() || "Media File",
      filePath: path,
      mediaType: type || "media",
      userEmail: session?.user?.email || "Anonymous",
      userId: session?.user?.id || null,
      ipAddress: clientIp,
      userAgent: userAgent || undefined,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to log media view" }, { status: 500 });
  }
}
