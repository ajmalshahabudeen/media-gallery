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

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const baseUrl = await getServerUrl();
  const token = await getSessionToken();

  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers: Record<string, string> = {
    "Accept": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["Cookie"] = `better-auth.session_token=${token}`;
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

export async function pingServer(customUrl?: string): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const baseUrl = customUrl ? customUrl.trim().replace(/\/+$/, "") : await getServerUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${baseUrl}/api/server/ping`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return { success: true, message: "Connected successfully to Media Gallery Server!", data };
    }
    return { success: false, message: `Server responded with HTTP ${res.status}` };
  } catch (err: any) {
    return { success: false, message: err?.message || "Could not connect to server. Check IP and network." };
  }
}

export function buildMediaFileUrl(baseUrl: string, filePath: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/api/media/file?path=${encodeURIComponent(filePath)}`;
}

export function buildThumbnailUrl(baseUrl: string, filePath: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/api/media/thumbnail?path=${encodeURIComponent(filePath)}`;
}
