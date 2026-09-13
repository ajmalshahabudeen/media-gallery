import { describe, it, expect } from "bun:test";
import { packTar, unpackTar, createTarGzip, extractTarGzip } from "./tar-gzip";
import { parsePathDriveInfo, substituteDrivePath, runParallelQueue, ConnectedDrive } from "./backup-healing";

describe("Tar & Gzip Compression Engine", () => {
  it("packs and unpacks in-memory files with 100% fidelity", () => {
    const files = [
      { name: "manifest.json", data: JSON.stringify({ version: 1, test: true }) },
      { name: "favorite_media.json", data: JSON.stringify([{ id: "1", path: "/test/path.mp4" }]) },
      { name: "subfolder/test.txt", data: "Hello World! Blazing fast backup." },
    ];

    const tarBuffer = packTar(files);
    expect(tarBuffer.length).toBeGreaterThan(512 * 4);

    const unpacked = unpackTar(tarBuffer);
    expect(unpacked.length).toBe(3);
    expect(unpacked[0].name).toBe("manifest.json");
    expect(JSON.parse(unpacked[0].data.toString())).toEqual({ version: 1, test: true });
    expect(unpacked[1].name).toBe("favorite_media.json");
    expect(unpacked[2].name).toBe("subfolder/test.txt");
    expect(unpacked[2].data.toString()).toBe("Hello World! Blazing fast backup.");
  });

  it("compresses to .tar.gz and decompresses cleanly", async () => {
    const payload = JSON.stringify(Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` })));
    const files = [{ name: "data.json", data: payload }];

    const gzBuffer = await createTarGzip(files);
    // Gzip should significantly compress repeated JSON
    expect(gzBuffer.length).toBeLessThan(payload.length);

    const extracted = await extractTarGzip(gzBuffer);
    expect(extracted.length).toBe(1);
    expect(extracted[0].name).toBe("data.json");
    expect(extracted[0].data.toString()).toBe(payload);
  });
});

describe("Path Drive Extraction & Substitution", () => {
  it("parses Docker /host_drives/<letter> format", () => {
    const parsed = parsePathDriveInfo("/host_drives/f/Movies/SciFi/Interstellar.mp4");
    expect(parsed.driveId).toBe("f");
    expect(parsed.sourcePrefix).toBe("/host_drives/f");
    expect(parsed.subpath).toBe("Movies/SciFi/Interstellar.mp4");
    expect(parsed.isWindowsFormat).toBe(false);
  });

  it("parses Windows drive letters (both forward and backward slashes)", () => {
    const parsedWin = parsePathDriveInfo("F:\\Movies\\Action\\DieHard.mkv");
    expect(parsedWin.driveId).toBe("f");
    expect(parsedWin.sourcePrefix).toBe("F:");
    expect(parsedWin.subpath).toBe("Movies/Action/DieHard.mkv");
    expect(parsedWin.isWindowsFormat).toBe(true);

    const parsedWinSlash = parsePathDriveInfo("d:/photos/vacation.jpg");
    expect(parsedWinSlash.driveId).toBe("d");
    expect(parsedWinSlash.subpath).toBe("photos/vacation.jpg");
  });

  it("substitutes drive letter from /host_drives/f to /host_drives/d", () => {
    const original = "/host_drives/f/Videos/trip.mp4";
    const targetDrive: ConnectedDrive = {
      id: "d",
      label: "Host Drive D",
      basePath: "/host_drives/d",
      type: "host_drives",
    };

    const substituted = substituteDrivePath(original, targetDrive);
    expect(substituted).toBe("/host_drives/d/Videos/trip.mp4");
  });

  it("substitutes drive letter across Windows formats", () => {
    const original = "F:\\Videos\\trip.mp4";
    const targetDrive: ConnectedDrive = {
      id: "d",
      label: "Windows Drive D",
      basePath: "D:\\",
      type: "windows",
    };

    const substituted = substituteDrivePath(original, targetDrive);
    expect(substituted).toBe("D:\\Videos\\trip.mp4");
  });
});

describe("Parallel Queue Runner", () => {
  it("processes items concurrently while preserving order and isolating errors", async () => {
    const inputs = [10, 20, 30, 40, 50];
    const results = await runParallelQueue(
      inputs,
      async (n) => {
        if (n === 30) throw new Error("Fault simulation");
        return n * 2;
      },
      3
    );

    expect(results[0]).toBe(20);
    expect(results[1]).toBe(40);
    expect(results[2]).toEqual({ error: "Fault simulation" } as unknown as number);
    expect(results[3]).toBe(80);
    expect(results[4]).toBe(100);
  });
});
