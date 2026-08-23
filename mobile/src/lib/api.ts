import AsyncStorage from "@react-native-async-storage/async-storage";

export const DEFAULT_SERVER_URL = "http://192.168.1.101:38479";
export const STORAGE_KEY_SERVER_URL = "media_gallery_server_url";
export const STORAGE_KEY_SESSION_TOKEN = "media_gallery_session_token";

let cachedServerUrl: string | null = null;
let cachedSessionToken: string | null = null;

export async function getServerUrl(): Promise<string> {
  if (cachedServerUrl) return cachedServerUrl;
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY_SERVER_URL);
    if (saved && saved.trim().length > 0) {
      cachedServerUrl = saved.trim().replace(/\/+$/, "");
      return cachedServerUrl;
    }
  } catch {
    // fallback
  }
  cachedServerUrl = DEFAULT_SERVER_URL;
  return cachedServerUrl;
}

export async function setServerUrl(url: string): Promise<void> {
  const formatted = url.trim().replace(/\/+$/, "");
  cachedServerUrl = formatted;
  await AsyncStorage.setItem(STORAGE_KEY_SERVER_URL, formatted);
}

export async function getSessionToken(): Promise<string | null> {
  if (cachedSessionToken) return cachedSessionToken;
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY_SESSION_TOKEN);
    if (saved) {
      cachedSessionToken = saved;
      return saved;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function setSessionToken(token: string | null): Promise<void> {
  cachedSessionToken = token;
  if (token) {
    await AsyncStorage.setItem(STORAGE_KEY_SESSION_TOKEN, token);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEY_SESSION_TOKEN);
  }
}

/** Auth + Origin headers for native uploaders that cannot go through apiFetch. */
export async function getApiAuthHeaders(): Promise<{
  baseUrl: string;
  headers: Record<string, string>;
}> {
  const baseUrl = await getServerUrl();
  const token = await getSessionToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    Origin: baseUrl,
    Referer: `${baseUrl}/`,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers.Cookie = `better-auth.session_token=${token}`;
  }
  return { baseUrl, headers };
}

/**
 * Better Auth requires a non-null Origin on cookie-bearing / mutating auth calls.
 * React Native fetch does not send Origin, so we inject the server URL as Origin/Referer.
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const baseUrl = await getServerUrl();
  const token = await getSessionToken();

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const isAuthEndpoint = /\/api\/auth\//.test(url);
  // Sign-in / sign-up should not carry a stale session cookie — it forces origin checks
  // and can surface MISSING_OR_NULL_ORIGIN even when logging in fresh.
  const isAuthCredentialPost =
    isAuthEndpoint &&
    (url.includes("/sign-in") ||
      url.includes("/sign-up") ||
      url.includes("/sign-out"));

  const headers: Record<string, string> = {
    Accept: "application/json",
    // Required by Better Auth origin middleware for mobile / non-browser clients
    Origin: baseUrl,
    Referer: `${baseUrl}/`,
    ...(options.headers as Record<string, string> || {}),
  };

  // Prefer caller-provided Origin if they set one, but never leave it empty/"null"
  if (!headers.Origin || headers.Origin === "null") {
    headers.Origin = baseUrl;
  }
  if (!headers.Referer || headers.Referer === "null") {
    headers.Referer = `${baseUrl}/`;
  }

  if (token && !isAuthCredentialPost) {
    headers.Authorization = `Bearer ${token}`;
    headers.Cookie = `better-auth.session_token=${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Extract set-cookie if better-auth returned session token
  const setCookie = response.headers.get("set-cookie");
  if (setCookie && setCookie.includes("better-auth.session_token=")) {
    const match = setCookie.match(/better-auth\.session_token=([^;]+)/);
    if (match && match[1]) {
      await setSessionToken(match[1]);
    }
  }

  return response;
}

export async function pingServer(
  customUrl?: string
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const baseUrl = customUrl
      ? customUrl.trim().replace(/\/+$/, "")
      : await getServerUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${baseUrl}/api/server/ping`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Origin: baseUrl,
        Referer: `${baseUrl}/`,
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        message: "Connected successfully to Media Gallery Server!",
        data,
      };
    }
    return { success: false, message: `Server responded with HTTP ${res.status}` };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Could not connect to server. Check IP and network.",
    };
  }
}

export function buildMediaFileUrl(baseUrl: string, filePath: string, token?: string | null): string {
  const t = token !== undefined ? token : cachedSessionToken;
  let url = `${baseUrl.replace(/\/+$/, "")}/api/media/file?path=${encodeURIComponent(filePath)}`;
  if (t) {
    url += `&token=${encodeURIComponent(t)}`;
  }
  return url;
}

export function buildThumbnailUrl(baseUrl: string, filePath: string, token?: string | null): string {
  const t = token !== undefined ? token : cachedSessionToken;
  let url = `${baseUrl.replace(/\/+$/, "")}/api/media/thumbnail?path=${encodeURIComponent(filePath)}`;
  if (t) {
    url += `&token=${encodeURIComponent(t)}`;
  }
  return url;
}

/** Parse Better Auth / API error JSON into a human message. */
export async function readApiErrorMessage(
  res: Response,
  fallback = "Request failed"
): Promise<string> {
  try {
    const data = await res.json();
    return (
      data?.message ||
      data?.error ||
      data?.code ||
      (typeof data === "string" ? data : null) ||
      `${fallback} (HTTP ${res.status})`
    );
  } catch {
    return `${fallback} (HTTP ${res.status})`;
  }
}
