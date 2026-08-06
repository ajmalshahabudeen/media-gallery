import fs from "fs";
import path from "path";

export function resolveServerPath(targetPath: string): string {
  if (!targetPath) return targetPath;
  const normPath = targetPath.replace(/\\/g, "/").trim();
  if (fs.existsSync(normPath)) {
    return normPath;
  }

  const driveMatch = normPath.match(/^([a-zA-Z]):[/\\]?(.*)/);
  if (driveMatch) {
    const dlLower = driveMatch[1].toLowerCase();
    const dlUpper = driveMatch[1].toUpperCase();
    const subpath = driveMatch[2].replace(/^\/+/, "");

    const candidates: string[] = [];
    for (const dl of [dlLower, dlUpper]) {
      const bases = [
        `/host_drives/${dl}`,
        `/run/desktop/mnt/host/${dl}`,
        `/mnt/${dl}`,
        `/host_media/${dl}`,
      ];
      for (const base of bases) {
        candidates.push(subpath ? path.join(base, subpath) : base);
      }
    }

    if (subpath) {
      candidates.push(path.join("/host_media", subpath));
    }

    for (const candidate of candidates) {
      if (candidate && fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  if (normPath === "/host_media" && fs.existsSync("/host_media")) {
    return "/host_media";
  }

  return normPath;
}
