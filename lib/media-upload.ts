import fs from "fs";
import path from "path";
import { resolveServerPath } from "@/lib/server-utils";
import { normalizeCanonicalPath } from "@/lib/utils";

export const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".tiff",
  ".tif",
  ".heic",
  ".heif",
  ".avif",
]);

export const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".webm",
  ".mkv",
  ".avi",
  ".mov",
  ".flv",
  ".wmv",
  ".m4v",
  ".3gp",
]);

export const UPLOAD_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]);

const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "image/heic",
  "image/heif",
  "image/avif",
]);

const VIDEO_MIMES = new Set([
  "video/mp4",
  "video/webm",
  "video/x-matroska",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-ms-wmv",
  "video/x-flv",
  "video/3gpp",
  "video/mpeg",
]);

export const MAX_UPLOAD_FILES = 30;
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

export type UploadMediaType = "image" | "video";

export function joinStoredPath(basePath: string, ...segments: string[]): string {
  const sep = basePath.includes("\\") ? "\\" : "/";
  const cleaned = segments
    .map((s) => s.replace(/^[\\/]+|[\\/]+$/g, "").trim())
    .filter(Boolean);
  return [basePath.replace(/[\\/]+$/, ""), ...cleaned].join(sep);
}

export function sanitizeSegment(name: string): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (trimmed === "." || trimmed === "..") return null;
  if (/[\\/\0]/.test(trimmed)) return null;
  if (/^[.]{1,2}$/.test(trimmed)) return null;
  // Windows reserved device names
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(trimmed)) return null;
  return trimmed.replace(/[<>:"|?*]/g, "_").slice(0, 180);
}

export function sanitizeFileName(name: string): string | null {
  const base = path.basename(name || "");
  return sanitizeSegment(base);
}

export function getExtension(fileName: string): string {
  return path.extname(fileName || "").toLowerCase();
}

export function classifyUpload(fileName: string, mimeType?: string | null): UploadMediaType | null {
  const ext = getExtension(fileName);
  const mime = (mimeType || "").toLowerCase().split(";")[0].trim();

  const extImage = IMAGE_EXTENSIONS.has(ext);
  const extVideo = VIDEO_EXTENSIONS.has(ext);
  const mimeImage = mime.startsWith("image/") && IMAGE_MIMES.has(mime);
  const mimeVideo = mime.startsWith("video/") && (VIDEO_MIMES.has(mime) || mime.startsWith("video/"));

  if (extImage || mimeImage) {
    if (ext && !IMAGE_EXTENSIONS.has(ext) && !mimeImage) return null;
    return "image";
  }
  if (extVideo || mimeVideo) {
    if (ext && !VIDEO_EXTENSIONS.has(ext) && !mimeVideo) return null;
    return "video";
  }
  return null;
}

export function guessMime(fileName: string, fallback?: string | null): string {
  const ext = getExtension(fileName);
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
    case ".bmp":
      return "image/bmp";
    case ".tif":
    case ".tiff":
      return "image/tiff";
    case ".heic":
      return "image/heic";
    case ".heif":
      return "image/heif";
    case ".avif":
      return "image/avif";
    case ".mp4":
    case ".m4v":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mkv":
      return "video/x-matroska";
    case ".mov":
      return "video/quicktime";
    case ".avi":
      return "video/x-msvideo";
    case ".wmv":
      return "video/x-ms-wmv";
    case ".flv":
      return "video/x-flv";
    case ".3gp":
      return "video/3gpp";
    default:
      return fallback || "application/octet-stream";
  }
}

export function uniqueFilePath(dir: string, fileName: string): string {
  const ext = path.extname(fileName);
  const stem = path.basename(fileName, ext);
  let candidate = path.join(/* turbopackIgnore: true */ dir, fileName);
  let i = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${stem} (${i})${ext}`);
    i += 1;
  }
  return candidate;
}

export function isResolvedInside(childResolved: string, parentResolved: string): boolean {
  const parent = path.resolve(parentResolved);
  const child = path.resolve(childResolved);
  if (child === parent) return true;
  const prefix = parent.endsWith(path.sep) ? parent : parent + path.sep;
  return child.startsWith(prefix);
}

export function findLibraryForPath(
  requestedPath: string,
  libraryPaths: string[]
): { libraryPath: string; resolvedLibrary: string; resolvedTarget: string } | null {
  if (!requestedPath || libraryPaths.length === 0) return null;
  const resolvedTarget = path.resolve(resolveServerPath(requestedPath));
  const targetCanon = normalizeCanonicalPath(requestedPath);

  for (const libraryPath of libraryPaths) {
    const resolvedLibrary = path.resolve(resolveServerPath(libraryPath));
    const libraryCanon = normalizeCanonicalPath(libraryPath);
    const canonMatch =
      targetCanon === libraryCanon ||
      targetCanon.startsWith(libraryCanon.endsWith("/") ? libraryCanon : libraryCanon + "/");
    if (canonMatch || isResolvedInside(resolvedTarget, resolvedLibrary)) {
      return { libraryPath, resolvedLibrary, resolvedTarget };
    }
  }
  return null;
}

export function listImmediateSubfolders(resolvedParent: string): { name: string }[] {
  if (!fs.existsSync(resolvedParent)) return [];
  try {
    const entries = fs.readdirSync(resolvedParent, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => ({ name: entry.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export function relativeFolderLabel(libraryPath: string, destPath: string): string {
  const libCanon = normalizeCanonicalPath(libraryPath);
  const destCanon = normalizeCanonicalPath(destPath);
  if (!destCanon || destCanon === libCanon) return "/";
  if (destCanon.startsWith(libCanon + "/")) {
    return destCanon.slice(libCanon.length + 1) || "/";
  }
  return path.basename(destPath) || "/";
}
