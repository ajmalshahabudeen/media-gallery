/**
 * Native multipart upload via XMLHttpRequest.
 *
 * Expo 57 winter fetch cannot serialize RN `{ uri, name, type }` FormData parts.
 * Upload one file at a time so each row can show a real percent.
 */
import { getApiAuthHeaders } from "./api";
import { normalizeLocalFileUri, sanitizeUploadFileName } from "./upload-form";

export interface PickedUploadFile {
  uri: string;
  name: string;
  type: string;
}

export interface UploadMediaResult {
  success: boolean;
  uploaded: number;
  failed: number;
  files: unknown[];
  error?: string;
}

export type UploadProgressHandler = (index: number, percent: number) => void;

type RnFilePart = { uri: string; name: string; type: string };

function appendLocalFile(form: FormData, field: string, asset: PickedUploadFile): void {
  const part: RnFilePart = {
    uri: normalizeLocalFileUri(asset.uri),
    name: sanitizeUploadFileName(asset.name),
    type: asset.type,
  };
  form.append(field, part as unknown as Blob);
}

function xhrPostFormData(
  url: string,
  form: FormData,
  headers: Record<string, string>,
  onPercent?: (percent: number) => void
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.responseType = "text";
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === "content-type") continue;
      xhr.setRequestHeader(key, value);
    }
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      const pct = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      onPercent?.(pct);
    };
    xhr.onload = () => {
      onPercent?.(100);
      resolve({ status: xhr.status, body: typeof xhr.response === "string" ? xhr.response : "" });
    };
    xhr.onerror = () => reject(new Error("Network error uploading"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.send(form);
  });
}

function parseUploadBody(body: string): {
  uploaded?: unknown[];
  errors?: { error?: string }[];
  error?: string;
} {
  try {
    return JSON.parse(body || "{}");
  } catch {
    return {};
  }
}

export async function uploadPickedMedia(
  libraryPath: string,
  destPath: string,
  files: PickedUploadFile[],
  onProgress?: UploadProgressHandler
): Promise<UploadMediaResult> {
  const { baseUrl, headers } = await getApiAuthHeaders();
  const url = `${baseUrl}/api/media/upload`;
  const uploaded: unknown[] = [];
  const errors: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i, 0);
    try {
      const form = new FormData();
      form.append("libraryPath", libraryPath);
      form.append("destPath", destPath);
      appendLocalFile(form, "files", file);
      const result = await xhrPostFormData(url, form, headers, (pct) => onProgress?.(i, pct));
      const data = parseUploadBody(result.body);
      if (result.status < 200 || result.status >= 300) {
        onProgress?.(i, 0);
        errors.push(data.error || `Upload failed (HTTP ${result.status})`);
        continue;
      }
      const batch = Array.isArray(data.uploaded) ? data.uploaded : [];
      if (batch.length === 0) {
        onProgress?.(i, 0);
        errors.push(data.error || data.errors?.[0]?.error || `No files were uploaded for ${file.name}`);
        continue;
      }
      onProgress?.(i, 100);
      uploaded.push(...batch);
    } catch (err: unknown) {
      onProgress?.(i, 0);
      const message = err instanceof Error ? err.message : "Network error uploading";
      errors.push(`${file.name}: ${message}`);
    }
  }

  return {
    success: uploaded.length > 0,
    uploaded: uploaded.length,
    failed: Math.max(files.length - uploaded.length, errors.length),
    files: uploaded,
    error: uploaded.length === 0 ? errors[0] || "No files were uploaded" : undefined,
  };
}
