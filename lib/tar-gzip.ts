import zlib from "node:zlib";

export interface TarFileEntry {
  name: string;
  data: Buffer | string;
  mtime?: Date;
}

/**
 * Packs multiple in-memory files into a standard POSIX UStar TAR archive Buffer.
 */
export function packTar(files: TarFileEntry[]): Buffer {
  const blocks: Buffer[] = [];

  for (const file of files) {
    const dataBuffer = Buffer.isBuffer(file.data)
      ? file.data
      : Buffer.from(file.data, "utf-8");

    const header = Buffer.alloc(512, 0);

    // Name (up to 100 bytes)
    const nameBytes = Buffer.from(file.name.slice(0, 99), "utf-8");
    nameBytes.copy(header, 0);

    // Mode: 0644
    header.write("0000644\0", 100, 8, "ascii");
    // UID: 0
    header.write("0000000\0", 108, 8, "ascii");
    // GID: 0
    header.write("0000000\0", 116, 8, "ascii");

    // Size (12 bytes octal)
    const sizeOctal = dataBuffer.length.toString(8).padStart(11, "0") + "\0";
    header.write(sizeOctal, 124, 12, "ascii");

    // Mtime (12 bytes octal)
    const mtimeSec = Math.floor((file.mtime ? file.mtime.getTime() : Date.now()) / 1000);
    const mtimeOctal = mtimeSec.toString(8).padStart(11, "0") + "\0";
    header.write(mtimeOctal, 136, 12, "ascii");

    // Typeflag: '0' (Regular file)
    header.write("0", 156, 1, "ascii");

    // Magic: "ustar\0"
    header.write("ustar\0", 257, 6, "ascii");
    // Version: "00"
    header.write("00", 263, 2, "ascii");

    // Checksum calculation (with checksum field treated as 8 spaces)
    header.fill(0x20, 148, 156);
    let chksum = 0;
    for (let i = 0; i < 512; i++) {
      chksum += header[i];
    }
    const chksumOctal = chksum.toString(8).padStart(6, "0") + "\0 ";
    header.write(chksumOctal, 148, 8, "ascii");

    blocks.push(header);
    blocks.push(dataBuffer);

    // Padding to 512-byte boundary
    const remainder = dataBuffer.length % 512;
    if (remainder !== 0) {
      const padding = 512 - remainder;
      blocks.push(Buffer.alloc(padding, 0));
    }
  }

  // Two 512-byte zero blocks at the end of the TAR archive
  blocks.push(Buffer.alloc(1024, 0));

  return Buffer.concat(blocks);
}

/**
 * Unpacks a standard POSIX UStar TAR archive Buffer into an array of in-memory files.
 */
export function unpackTar(tarBuffer: Buffer): TarFileEntry[] {
  const files: TarFileEntry[] = [];
  let offset = 0;

  while (offset + 512 <= tarBuffer.length) {
    const header = tarBuffer.subarray(offset, offset + 512);

    // If block is all zeros, check if end of archive
    let isZero = true;
    for (let i = 0; i < 512; i++) {
      if (header[i] !== 0) {
        isZero = false;
        break;
      }
    }
    if (isZero) {
      break;
    }

    // Parse filename (null-terminated string)
    let nullIdx = header.indexOf(0, 0);
    if (nullIdx < 0 || nullIdx > 100) nullIdx = 100;
    const name = header.subarray(0, nullIdx).toString("utf-8").trim();

    // Parse file size (octal string from byte 124 to 135)
    const sizeStr = header.subarray(124, 136).toString("ascii").replace(/\0.*$/, "").trim();
    const size = parseInt(sizeStr, 8) || 0;

    offset += 512;

    if (name && size >= 0 && offset + size <= tarBuffer.length) {
      const data = Buffer.from(tarBuffer.subarray(offset, offset + size));
      files.push({ name, data });

      // Advance past data and padding to next 512-byte boundary
      const remainder = size % 512;
      const padding = remainder === 0 ? 0 : 512 - remainder;
      offset += size + padding;
    } else {
      break;
    }
  }

  return files;
}

/**
 * Compresses an array of files into a blazing-fast `.tar.gz` Buffer.
 * Uses Z_BEST_SPEED (level 1) by default for sub-millisecond serialization.
 */
export async function createTarGzip(
  files: TarFileEntry[],
  level: number = zlib.constants.Z_BEST_SPEED
): Promise<Buffer> {
  const tarBuffer = packTar(files);
  return new Promise<Buffer>((resolve, reject) => {
    zlib.gzip(tarBuffer, { level }, (err, gzBuffer) => {
      if (err) return reject(err);
      resolve(gzBuffer);
    });
  });
}

/**
 * Decompresses a `.tar.gz` Buffer and returns the unpacked files.
 */
export async function extractTarGzip(gzBuffer: Buffer): Promise<TarFileEntry[]> {
  return new Promise<TarFileEntry[]>((resolve, reject) => {
    zlib.gunzip(gzBuffer, (err, tarBuffer) => {
      if (err) return reject(err);
      try {
        const files = unpackTar(tarBuffer);
        resolve(files);
      } catch (unpackErr) {
        reject(unpackErr);
      }
    });
  });
}
