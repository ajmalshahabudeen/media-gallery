import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth-utils";
import { extractTarGzip } from "@/lib/tar-gzip";
import { analyzeAndHealMediaPaths } from "@/lib/backup-healing";
import { RestorePayload } from "@/lib/backup-restore";

export async function POST(request: NextRequest) {
  const session = await getUserSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No backup file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let payload: RestorePayload = {};

    if (file.name.endsWith(".json")) {
      // Plain JSON backup format fallback
      const jsonText = buffer.toString("utf-8");
      payload = JSON.parse(jsonText);
    } else {
      // .tar.gz or .tar archive
      const unpackedFiles = await extractTarGzip(buffer);

      for (const entry of unpackedFiles) {
        const text = entry.data.toString("utf-8");
        try {
          if (entry.name === "manifest.json") {
            payload.manifest = JSON.parse(text);
          } else if (entry.name === "favorite_media.json") {
            payload.favorites = JSON.parse(text);
          } else if (entry.name === "media_folders.json") {
            payload.folders = JSON.parse(text);
          } else if (entry.name === "users.json") {
            payload.users = JSON.parse(text);
          } else if (entry.name === "system_logs.json") {
            payload.systemLogs = JSON.parse(text);
          }
        } catch (e) {
          console.warn(`[Restore Inspect] Failed to parse ${entry.name}:`, e);
        }
      }
    }

    const favorites = payload.favorites || [];
    const folders = payload.folders || [];

    // Run the Dedicated Auto-Healing & Verification Pipeline
    // Parallel queue verifying disk existence and finding drive substitutions
    const auditReport = await analyzeAndHealMediaPaths(favorites, 16);

    return NextResponse.json({
      success: true,
      manifest: payload.manifest || {
        version: 1,
        appName: "Server Gallery",
        createdAt: new Date().toISOString(),
      },
      auditReport,
      folders,
      hasUsers: Boolean(payload.users && payload.users.length > 0),
      hasLogs: Boolean(payload.systemLogs && payload.systemLogs.length > 0),
      // Provide raw payload so client can submit confirmed remappings with the payload
      payload,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to inspect backup archive: ${errorMsg}` },
      { status: 400 }
    );
  }
}
