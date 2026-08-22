import AsyncStorage from "@react-native-async-storage/async-storage";

export interface SavedLogin {
  email: string;
  password: string;
  name?: string;
}

const STORAGE_KEY = "media_gallery_saved_login_v1";
const OBFUSCATE_KEY = "sg-login-v1";

function getSecureStore(): {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
} | null {
  try {
    return require("expo-secure-store");
  } catch {
    return null;
  }
}

function xorCodec(input: string): string {
  let out = "";
  for (let i = 0; i < input.length; i++) {
    out += String.fromCharCode(input.charCodeAt(i) ^ OBFUSCATE_KEY.charCodeAt(i % OBFUSCATE_KEY.length));
  }
  return out;
}

function toBase64(value: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c < 128) {
      bytes.push(c);
    } else if (c < 2048) {
      bytes.push((c >> 6) | 192);
      bytes.push((c & 63) | 128);
    } else {
      bytes.push((c >> 12) | 224);
      bytes.push(((c >> 6) & 63) | 128);
      bytes.push((c & 63) | 128);
    }
  }
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : NaN;
    const c = i + 2 < bytes.length ? bytes[i + 2] : NaN;
    const bitmap = (a << 16) | ((Number.isNaN(b) ? 0 : b) << 8) | (Number.isNaN(c) ? 0 : c);
    result += chars.charAt((bitmap >> 18) & 63);
    result += chars.charAt((bitmap >> 12) & 63);
    result += Number.isNaN(b) ? "=" : chars.charAt((bitmap >> 6) & 63);
    result += Number.isNaN(c) ? "=" : chars.charAt(bitmap & 63);
  }
  return result;
}

function fromBase64(value: string): string {
  try {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const clean = value.replace(/[^A-Za-z0-9+/=]/g, "");
    const bytes: number[] = [];
    for (let i = 0; i < clean.length; i += 4) {
      const e1 = chars.indexOf(clean.charAt(i));
      const e2 = chars.indexOf(clean.charAt(i + 1));
      const e3 = chars.indexOf(clean.charAt(i + 2));
      const e4 = chars.indexOf(clean.charAt(i + 3));
      const bitmap = (e1 << 18) | (e2 << 12) | ((e3 & 63) << 6) | (e4 & 63);
      bytes.push((bitmap >> 16) & 255);
      if (e3 !== -1 && clean.charAt(i + 2) !== "=") bytes.push((bitmap >> 8) & 255);
      if (e4 !== -1 && clean.charAt(i + 3) !== "=") bytes.push(bitmap & 255);
    }
    let result = "";
    let i = 0;
    while (i < bytes.length) {
      const c = bytes[i++];
      if (c > 127) {
        if (c > 191 && c < 224) {
          const c2 = bytes[i++];
          result += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
        } else {
          const c2 = bytes[i++];
          const c3 = bytes[i++];
          result += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
        }
      } else {
        result += String.fromCharCode(c);
      }
    }
    return result;
  } catch {
    return "";
  }
}

function encodePayload(login: SavedLogin): string {
  return toBase64(xorCodec(JSON.stringify(login)));
}

function decodePayload(raw: string): SavedLogin | null {
  try {
    const parsed = JSON.parse(xorCodec(fromBase64(raw))) as SavedLogin;
    if (!parsed?.email || !parsed?.password) return null;
    return {
      email: String(parsed.email),
      password: String(parsed.password),
      name: parsed.name ? String(parsed.name) : undefined,
    };
  } catch {
    return null;
  }
}

export async function getSavedLogin(): Promise<SavedLogin | null> {
  const secure = getSecureStore();
  try {
    if (secure) {
      const stored = await secure.getItemAsync(STORAGE_KEY);
      if (stored) {
        const direct = (() => {
          try {
            const parsed = JSON.parse(stored) as SavedLogin;
            if (parsed?.email && parsed?.password) return parsed;
          } catch {
            // encrypted / obfuscated payload
          }
          return decodePayload(stored);
        })();
        if (direct) return direct;
      }
    }
    const fallback = await AsyncStorage.getItem(STORAGE_KEY);
    if (!fallback) return null;
    return decodePayload(fallback);
  } catch {
    return null;
  }
}

export async function saveLogin(login: SavedLogin): Promise<void> {
  const payload: SavedLogin = {
    email: login.email.trim(),
    password: login.password,
    name: login.name?.trim() || undefined,
  };
  if (!payload.email || !payload.password) return;

  const encoded = encodePayload(payload);
  const secure = getSecureStore();
  try {
    if (secure) {
      await secure.setItemAsync(STORAGE_KEY, encoded);
      await AsyncStorage.removeItem(STORAGE_KEY);
      return;
    }
  } catch {
    // fall through to obfuscated AsyncStorage
  }
  await AsyncStorage.setItem(STORAGE_KEY, encoded);
}

export async function clearSavedLogin(): Promise<void> {
  const secure = getSecureStore();
  try {
    if (secure) {
      await secure.deleteItemAsync(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
