export const MAX_RANGE_CHUNK_BYTES = 8 * 1024 * 1024;

export type ResolvedRange = {
  start: number;
  end: number;
  status: 200 | 206;
  contentLength: number;
};

export type ResolveByteRangeResult =
  | { ok: true; range: ResolvedRange }
  | { ok: false; status: 416 };

export function resolveByteRange(
  rangeHeader: string | null,
  fileSize: number,
  options?: { maxChunkBytes?: number; forcePartialForFull?: boolean }
): ResolveByteRangeResult {
  const maxChunk = options?.maxChunkBytes ?? MAX_RANGE_CHUNK_BYTES;

  if (fileSize <= 0) {
    return {
      ok: true,
      range: { start: 0, end: 0, status: 200, contentLength: 0 },
    };
  }

  if (!rangeHeader) {
    if (options?.forcePartialForFull) {
      const end = Math.min(fileSize, maxChunk) - 1;
      return {
        ok: true,
        range: { start: 0, end, status: 206, contentLength: end + 1 },
      };
    }
    return {
      ok: true,
      range: {
        start: 0,
        end: fileSize - 1,
        status: 200,
        contentLength: fileSize,
      },
    };
  }

  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match) {
    return { ok: false, status: 416 };
  }

  const startStr = match[1];
  const endStr = match[2];
  let start: number;
  let requestedEnd: number;

  if (startStr === "" && endStr !== "") {
    const suffix = Number.parseInt(endStr, 10);
    if (!Number.isFinite(suffix) || suffix <= 0) {
      return { ok: false, status: 416 };
    }
    start = Math.max(0, fileSize - suffix);
    requestedEnd = fileSize - 1;
  } else if (startStr !== "") {
    start = Number.parseInt(startStr, 10);
    requestedEnd = endStr ? Number.parseInt(endStr, 10) : fileSize - 1;
  } else {
    return { ok: false, status: 416 };
  }

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(requestedEnd) ||
    start < 0 ||
    start >= fileSize ||
    requestedEnd < start
  ) {
    return { ok: false, status: 416 };
  }

  const end = Math.min(requestedEnd, start + maxChunk - 1, fileSize - 1);
  return {
    ok: true,
    range: {
      start,
      end,
      status: 206,
      contentLength: end - start + 1,
    },
  };
}

export function isAvMimeType(contentType: string): boolean {
  return contentType.startsWith("video/") || contentType.startsWith("audio/");
}
