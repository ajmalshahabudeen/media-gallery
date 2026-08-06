import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatFileSize } from "./formatSize";
import crypto from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeCanonicalPath(filePath: string): string {
  if (!filePath) return "";
  let normalized = filePath.replace(/\\/g, "/").trim().toLowerCase();

  if (normalized.startsWith("/run/desktop/mnt/host/")) {
    const parts = normalized.split("/run/desktop/mnt/host/")[1];
    if (parts) {
      const driveLetter = parts[0];
      const sub = parts.slice(1).replace(/^\/+/, "");
      normalized = `${driveLetter}:/${sub}`;
    }
  } else if (normalized.startsWith("/mnt/")) {
    const parts = normalized.split("/mnt/")[1];
    if (parts && /^[a-z](\/|$)/.test(parts)) {
      const driveLetter = parts[0];
      const sub = parts.slice(1).replace(/^\/+/, "");
      normalized = `${driveLetter}:/${sub}`;
    }
  } else if (normalized.startsWith("/host_drives/")) {
    const parts = normalized.split("/host_drives/")[1];
    if (parts) {
      const driveLetter = parts[0];
      const sub = parts.slice(1).replace(/^\/+/, "");
      normalized = `${driveLetter}:/${sub}`;
    }
  }

  return normalized.replace(/\/+/g, "/");
}

export function getNormalizedPathHash(filePath: string): string {
  if (!filePath) return "";
  const canonical = normalizeCanonicalPath(filePath);
  return crypto.createHash("md5").update(canonical).digest("hex");
}

export { formatFileSize };

