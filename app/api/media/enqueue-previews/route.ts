import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { getStringCache, setCache } from "@/lib/redis";
import { redisClient } from "@/lib/redis";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const files: { path: string; type: string }[] = body.files || [];

    const mediaFiles = files.filter((f) => f.type === "image" || f.type === "video");

    if (mediaFiles.length > 0 && redisClient && redisClient.status === "ready") {
      const existingTotalStr = await getStringCache("preview_total_count");
      const currentTotal = existingTotalStr ? parseInt(existingTotalStr, 10) : 0;

      if (currentTotal === 0) {
        await setCache("preview_total_count", mediaFiles.length, 3600);
        await setCache("preview_completed_count", 0, 3600);
      }

      for (const item of mediaFiles) {
        await redisClient.lpush(
          "media_preview_tasks",
          JSON.stringify({ path: item.path, type: item.type })
        );
      }
    }

    return NextResponse.json({ success: true, queued: mediaFiles.length });
  } catch {
    return NextResponse.json({ error: "Failed to enqueue preview tasks" }, { status: 500 });
  }
}
