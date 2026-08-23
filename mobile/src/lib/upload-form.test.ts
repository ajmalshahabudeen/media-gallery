import { describe, expect, test } from "bun:test";
import {
  isReactNativeUriFilePart,
  normalizeLocalFileUri,
  sanitizeUploadFileName,
} from "./upload-form";

describe("isReactNativeUriFilePart", () => {
  test("flags the Expo-incompatible {uri,name,type} shape", () => {
    expect(
      isReactNativeUriFilePart({
        uri: "file:///data/user/0/app/cache/ImagePicker/a.jpg",
        name: "a.jpg",
        type: "image/jpeg",
      })
    ).toBe(true);
  });

  test("allows expo-file-system File-like objects with bytes()", () => {
    expect(
      isReactNativeUriFilePart({
        uri: "file:///tmp/a.jpg",
        name: "a.jpg",
        type: "image/jpeg",
        bytes: async () => new Uint8Array(),
      })
    ).toBe(false);
  });
});

describe("normalizeLocalFileUri", () => {
  test("prefixes bare android paths with file://", () => {
    expect(normalizeLocalFileUri("/data/user/0/app/cache/pic.jpg")).toBe(
      "file:///data/user/0/app/cache/pic.jpg"
    );
  });

  test("leaves file and content URIs unchanged", () => {
    expect(normalizeLocalFileUri("file:///tmp/a.jpg")).toBe("file:///tmp/a.jpg");
    expect(normalizeLocalFileUri("content://media/picker/1")).toBe("content://media/picker/1");
  });
});

describe("sanitizeUploadFileName", () => {
  test("keeps a normal photo name", () => {
    expect(sanitizeUploadFileName("Vacation 2026.jpg")).toBe("Vacation 2026.jpg");
  });

  test("strips path segments and illegal characters", () => {
    expect(sanitizeUploadFileName("C:\\\\pics\\\\foo:bar?.png")).toBe("foo_bar_.png");
  });
});

describe("boot-path hygiene", () => {
  test("store and uploader do not statically import expo-file-system", async () => {
    const importRe = /from\s+["']expo-file-system(?:\/[^"']*)?["']/;
    const store = await Bun.file(new URL("../store/useMobileStore.ts", import.meta.url)).text();
    const uploader = await Bun.file(new URL("./upload-media.ts", import.meta.url)).text();
    expect(importRe.test(store)).toBe(false);
    expect(importRe.test(uploader)).toBe(false);
  });
});
