import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { getUserSession, isPathAuthorized } from "@/lib/auth-utils";
import { isAvMimeType, resolveByteRange } from "@/lib/byte-range";
import { resolveServerPath } from "@/lib/server-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".bmp":
      return "image/bmp";
    case ".ico":
      return "image/x-icon";
    case ".avif":
      return "image/avif";
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mkv":
      return "video/x-matroska";
    case ".mov":
      return "video/quicktime";
    case ".avi":
      return "video/x-msvideo";
    case ".ogv":
      return "video/ogg";
    case ".3gp":
      return "video/3gpp";
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".ogg":
    case ".oga":
      return "audio/ogg";
    case ".flac":
      return "audio/flac";
    case ".m4a":
      return "audio/mp4";
    case ".aac":
      return "audio/aac";
    case ".pdf":
      return "application/pdf";
    case ".json":
      return "application/json";
    case ".txt":
      return "text/plain";
    case ".html":
      return "text/html";
    case ".css":
      return "text/css";
    case ".js":
    case ".mjs":
    case ".ts":
    case ".tsx":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
}

function openFileWebStream(
  resolvedPath: string,
  start: number,
  end: number,
  signal: AbortSignal
): ReadableStream<Uint8Array> {
  const fileStream = fs.createReadStream(resolvedPath, {
    start,
    end,
    highWaterMark: 64 * 1024,
  });

  const onAbort = () => {
    fileStream.destroy();
  };

  if (signal.aborted) {
    fileStream.destroy();
  } else {
    signal.addEventListener("abort", onAbort, { once: true });
    fileStream.once("close", () => {
      signal.removeEventListener("abort", onAbort);
    });
  }

  return Readable.toWeb(fileStream) as ReadableStream<Uint8Array>;
}

type FileMeta = {
  resolvedPath: string;
  fileSize: number;
  contentType: string;
};

async function authorizeFile(request: NextRequest): Promise<FileMeta | NextResponse> {
  const session = await getUserSession(request);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filePathParam = request.nextUrl.searchParams.get("path");
  if (!filePathParam) {
    return NextResponse.json({ error: "Missing file path parameter" }, { status: 400 });
  }

  const resolvedPath = resolveServerPath(filePathParam);
  const isAdmin = (session.user as { role?: string }).role === "admin";
  const authorized = await isPathAuthorized(filePathParam, session.user.id, isAdmin);
  if (!authorized) {
    return NextResponse.json({ error: "Access denied to this file" }, { status: 403 });
  }

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(resolvedPath);
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (stat.isDirectory()) {
    return NextResponse.json({ error: "Specified path is a directory" }, { status: 400 });
  }

  return {
    resolvedPath,
    fileSize: stat.size,
    contentType: getMimeType(resolvedPath),
  };
}

function fileHeaders(
  meta: FileMeta,
  resolved: { start: number; end: number; status: 200 | 206; contentLength: number }
): HeadersInit {
  const headers: Record<string, string> = {
    "Accept-Ranges": "bytes",
    "Content-Length": resolved.contentLength.toString(),
    "Content-Type": meta.contentType,
    "Cache-Control": "public, max-age=86400, immutable",
  };
  if (resolved.status === 206) {
    headers["Content-Range"] = `bytes ${resolved.start}-${resolved.end}/${meta.fileSize}`;
  }
  return headers;
}

export async function HEAD(request: NextRequest) {
  const meta = await authorizeFile(request);
  if (meta instanceof NextResponse) return meta;

  const resolved = resolveByteRange(request.headers.get("range"), meta.fileSize, {
    forcePartialForFull: isAvMimeType(meta.contentType) && meta.fileSize > 0,
  });
  if (!resolved.ok) {
    return new NextResponse(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${meta.fileSize}` },
    });
  }

  return new NextResponse(null, {
    status: resolved.range.status,
    headers: fileHeaders(meta, resolved.range),
  });
}

export async function GET(request: NextRequest) {
  const meta = await authorizeFile(request);
  if (meta instanceof NextResponse) return meta;

  try {
    const resolved = resolveByteRange(request.headers.get("range"), meta.fileSize, {
      forcePartialForFull: isAvMimeType(meta.contentType) && meta.fileSize > 0,
    });
    if (!resolved.ok) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${meta.fileSize}` },
      });
    }

    const { start, end, status, contentLength } = resolved.range;
    if (contentLength === 0) {
      return new NextResponse(null, {
        status,
        headers: fileHeaders(meta, resolved.range),
      });
    }

    const stream = openFileWebStream(meta.resolvedPath, start, end, request.signal);
    return new NextResponse(stream as BodyInit, {
      status,
      headers: fileHeaders(meta, resolved.range),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
