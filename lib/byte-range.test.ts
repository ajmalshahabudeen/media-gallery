import { describe, expect, test } from "bun:test";
import { MAX_RANGE_CHUNK_BYTES, resolveByteRange } from "./byte-range";

const BIG = 2_705_073_026; // ~2.5 GiB, matches the Ankha Cosplay file

describe("resolveByteRange", () => {
  test("open-ended bytes=0- is capped so Node never streams the whole file", () => {
    const result = resolveByteRange("bytes=0-", BIG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.range.status).toBe(206);
    expect(result.range.start).toBe(0);
    expect(result.range.end).toBe(MAX_RANGE_CHUNK_BYTES - 1);
    expect(result.range.contentLength).toBe(MAX_RANGE_CHUNK_BYTES);
  });

  test("open-ended mid-file seek is capped from the start offset", () => {
    const start = 767_230_603;
    const result = resolveByteRange(`bytes=${start}-`, BIG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.range.start).toBe(start);
    expect(result.range.end).toBe(start + MAX_RANGE_CHUNK_BYTES - 1);
    expect(result.range.contentLength).toBe(MAX_RANGE_CHUNK_BYTES);
  });

  test("explicit small range is honored", () => {
    const result = resolveByteRange("bytes=100-200", BIG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.range.start).toBe(100);
    expect(result.range.end).toBe(200);
    expect(result.range.contentLength).toBe(101);
    expect(result.range.status).toBe(206);
  });

  test("range past EOF is unsatisfiable", () => {
    const result = resolveByteRange(`bytes=${BIG}-`, BIG);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(416);
  });

  test("suffix range bytes=-500 returns the last 500 bytes", () => {
    const result = resolveByteRange("bytes=-500", BIG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.range.end).toBe(BIG - 1);
    expect(result.range.start).toBe(BIG - 500);
    expect(result.range.contentLength).toBe(500);
  });

  test("AV file with no Range still returns a partial first chunk", () => {
    const result = resolveByteRange(null, BIG, { forcePartialForFull: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.range.status).toBe(206);
    expect(result.range.end).toBe(MAX_RANGE_CHUNK_BYTES - 1);
  });

  test("small image with no Range stays a full 200", () => {
    const result = resolveByteRange(null, 120_000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.range.status).toBe(200);
    expect(result.range.contentLength).toBe(120_000);
  });
});
