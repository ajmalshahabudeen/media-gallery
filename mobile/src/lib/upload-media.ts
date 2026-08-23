/**
 * Native multipart upload via XMLHttpRequest.
 *
 * Expo 57 replaces global fetch with winter/fetch. That serializer throws
 * `Unsupported FormDataPart implementation` for React Native `{ uri, name, type }`
 * parts. Do not send those through apiFetch/fetch.
 *
 * XMLHttpRequest still uses RN networking, which understands `{ uri, name, type }`.
 * Do not statically import expo-file-system from the store — that native module
 * loads on cold start and can break thumbnail / video loading.
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
  headers: Record<string, string>
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.responseType = "text";
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === "content-type") continue;
      xhr.setRequestHeader(key, value);
    }
    xhr.onload = () => {
      resolve({ status: xhr.status, body: typeof xhr.response === "string" ? xhr.response : "" });
    };
    xhr.onerror = () => reject(new Error("Network error uploading"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.send(form);
  });
}

export async function uploadPickedMedia(
  libraryPath: string,
  destPath: string,
  files: PickedUploadFile[]
): Promise<UploadMediaResult> {
  const { baseUrl, headers } = await getApiAuthHeaders();
  const form = new FormData();
  form.append("libraryPath", libraryPath);
  form.append("destPath", destPath);
  for (const file of files) {
    appendLocalFile(form, "files", file);
  }

  const result = await xhrPostFormData(`${baseUrl}/api/media/upload`, form, headers);
  let data: { uploaded?: unknown[]; errors?: { error?: string }[]; error?: string } = {};
  try {
    data = JSON.parse(result.body || "{}");
  } catch {
    data = {};
  }

  if (result.status < 200 || result.status >= 300) {
    return {
      success: false,
      uploaded: 0,
      failed: files.length,
      files: [],
      error: data.error || `Upload failed (HTTP ${result.status})`,
    };
  }

  const uploaded = Array.isArray(data.uploaded) ? data.uploaded : [];
  const failed = Array.isArray(data.errors) ? data.errors.length : 0;
  return {
    success: uploaded.length > 0,
    uploaded: uploaded.length,
    failed,
    files: uploaded,
    error:
      uploaded.length === 0
        ? data.error || data.errors?.[0]?.error || "No files were uploaded"
        : undefined,
  };
}
