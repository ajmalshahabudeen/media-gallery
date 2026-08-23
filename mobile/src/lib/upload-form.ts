/** Expo 57 winter fetch cannot serialize React Native `{ uri, name, type }` FormData parts. */
export function isReactNativeUriFilePart(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const rec = value as Record<string, unknown>;
  return typeof rec.uri === "string" && !("bytes" in rec) && !("arrayBuffer" in rec);
}

export function normalizeLocalFileUri(uri: string): string {
  const trimmed = (uri || "").trim();
  if (!trimmed) return trimmed;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return `file://${trimmed}`;
  return trimmed;
}

export function sanitizeUploadFileName(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() || "upload.bin";
  const cleaned = base.replace(/[<>:"|?*\x00-\x1f]/g, "_").trim() || "upload.bin";
  return cleaned.slice(0, 180);
}
