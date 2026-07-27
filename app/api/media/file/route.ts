import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    // Images
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
    // Videos
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
    // Audio
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
    // Documents & text
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

export async function HEAD(request: NextRequest) {
  return GET(request);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filePathParam = searchParams.get("path");

  if (!filePathParam) {
    return NextResponse.json({ error: "Missing file path parameter" }, { status: 400 });
  }

  const normalizedPath = path.normalize(filePathParam);

  if (!fs.existsSync(normalizedPath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const stat = fs.statSync(normalizedPath);
    if (stat.isDirectory()) {
      return NextResponse.json({ error: "Specified path is a directory" }, { status: 400 });
    }

    const fileSize = stat.size;
    const contentType = getMimeType(normalizedPath);
    const range = request.headers.get("range");

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(normalizedPath, { start, end });
      const stream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
      });

      return new NextResponse(stream as BodyInit, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize.toString(),
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400, immutable",
        },
      });
    }

    const fileStream = fs.createReadStream(normalizedPath);
    const stream = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
    });

    return new NextResponse(stream as BodyInit, {
      status: 200,
      headers: {
        "Content-Length": fileSize.toString(),
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
