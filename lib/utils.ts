import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatFileSize } from "./formatSize"

import crypto from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getNormalizedPathHash(filePath: string): string {
  if (!filePath) return "";
  let normalized = filePath.replace(/\\/g, "/").trim();
  if (normalized.startsWith("/host_drives/")) {
    const parts = normalized.split("/host_drives/")[1];
    if (parts) {
      const driveLetter = parts[0].toLowerCase();
      const sub = parts.slice(1).replace(/^\/+/, "");
      normalized = `${driveLetter}:/${sub}`;
    }
  } else if (/^[a-zA-Z]:\//.test(normalized)) {
    const driveLetter = normalized[0].toLowerCase();
    const sub = normalized.slice(3);
    normalized = `${driveLetter}:/${sub}`;
  }
  return crypto.createHash("md5").update(normalized.toLowerCase()).digest("hex");
}

export { formatFileSize }

