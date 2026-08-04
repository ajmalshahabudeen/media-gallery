import { create } from "zustand";
import {
  apiFetch,
  getServerUrl,
  setServerUrl as saveServerUrl,
  setSessionToken,
  getSessionToken,
} from "../lib/api";

export interface User {
  id: string;
  email: string;
  name: string;
  role?: string | null;
}

export interface MediaFile {
  id: string;
  name: string;
  path: string;
  folder: string;
  size: number;
  extension: string;
  type: "image" | "video" | "audio" | "other";
  mimeType: string;
  modifiedAt: string;
}

export interface MediaFolderItem {
  id: string;
  path: string;
  name: string;
  createdAt: string;
}

export interface IndexingProgressState {
  isIndexing: boolean;
  scannedFiles: number;
  scannedFolders: number;
  currentFolder: string;
  latestFile: string;
  startTime: number | null;
}

interface MobileState {
  serverUrl: string;
  user: User | null;
  isAuthenticated: boolean;
  authChecked: boolean;

  folders: MediaFolderItem[];
  files: MediaFile[];
  favorites: MediaFile[];
  activeFolder: string | null;
  selectedType: "all" | "image" | "video" | "audio";
  viewMode: "grid" | "list" | "cards";
  sortBy: "name" | "date" | "size";
  sortOrder: "asc" | "desc";
  groupBy: "none" | "folder" | "type" | "date";
  searchQuery: string;
  isLoading: boolean;
  isScanning: boolean;
  scannedAt: string | null;
  indexingProgress: IndexingProgressState;

  setServerUrl: (url: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedType: (type: "all" | "image" | "video" | "audio") => void;
  setViewMode: (mode: "grid" | "list" | "cards") => void;
  setSortBy: (field: "name" | "date" | "size") => void;
  setSortOrder: (order: "asc" | "desc") => void;
  setGroupBy: (mode: "none" | "folder" | "type" | "date") => void;
  setActiveFolder: (folder: string | null) => void;

  initApp: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;

  fetchFolders: () => Promise<void>;
  fetchFavorites: () => Promise<void>;
  toggleFavorite: (file: MediaFile) => Promise<boolean>;
  addFolder: (path: string, name?: string) => Promise<boolean>;
  removeFolder: (id: string) => Promise<boolean>;
  scanMedia: (force?: boolean) => Promise<void>;
  fetchProgress: () => Promise<void>;
  logMediaView: (filePath: string) => Promise<void>;
}

let progressInterval: ReturnType<typeof setInterval> | null = null;

export const useMobileStore = create<MobileState>((set, get) => ({
  serverUrl: "http://192.168.1.101:38479",
  user: null,
  isAuthenticated: false,
  authChecked: false,

  folders: [],
  files: [],
  favorites: [],
  activeFolder: null,
  selectedType: "all",
  viewMode: "grid",
  sortBy: "name",
  sortOrder: "asc",
  groupBy: "none",
  searchQuery: "",
  isLoading: false,
  isScanning: false,
  scannedAt: null,
  indexingProgress: {
    isIndexing: false,
    scannedFiles: 0,
    scannedFolders: 0,
    currentFolder: "",
    latestFile: "",
    startTime: null,
  },

  setServerUrl: async (url: string) => {
    await saveServerUrl(url);
    set({ serverUrl: url });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedType: (type) => set({ selectedType: type }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSortBy: (field) => set({ sortBy: field }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setGroupBy: (mode) => set({ groupBy: mode }),
  setActiveFolder: (folder) => set({ activeFolder: folder }),

  initApp: async () => {
    try {
      const url = await getServerUrl();
      set({ serverUrl: url });
      await get().checkAuth();
    } catch {
      // Never leave the UI stuck on the splash/loading gate.
      set({ user: null, isAuthenticated: false, authChecked: true });
    }
  },

  checkAuth: async () => {
    try {
      const token = await getSessionToken();
      // Fast path: no saved session → skip network so cold start always opens offline.
      if (!token) {
        set({ user: null, isAuthenticated: false, authChecked: true });
        return false;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await apiFetch("/api/auth/get-session", { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data?.session && data?.user) {
          set({ user: data.user, isAuthenticated: true, authChecked: true });
          // Fire-and-forget library refresh (non-blocking for first paint)
          void get().fetchFolders();
          void get().fetchFavorites();
          void get().scanMedia(false);
          return true;
        }
      }
      set({ user: null, isAuthenticated: false, authChecked: true });
      return false;
    } catch {
      set({ user: null, isAuthenticated: false, authChecked: true });
      return false;
    }
  },

  login: async (email, password) => {
    try {
      // Drop any stale session so Better Auth doesn't require Origin via cookie path
      await setSessionToken(null);

      const res = await apiFetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.user) {
        if (data.token) {
          await setSessionToken(data.token);
        }
        set({ user: data.user, isAuthenticated: true, authChecked: true });
        await get().fetchFolders();
        await get().fetchFavorites();
        await get().scanMedia(false);
        return { success: true };
      }
      const msg =
        data?.message ||
        data?.error ||
        (!res.ok ? `Sign in failed (HTTP ${res.status})` : "Invalid credentials");
      return { success: false, error: msg };
    } catch (err: any) {
      return { success: false, error: err?.message || "Network error. Please check server IP." };
    }
  },

  register: async (name, email, password) => {
    try {
      await setSessionToken(null);

      const res = await apiFetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.user) {
        if (data.token) {
          await setSessionToken(data.token);
        }
        set({ user: data.user, isAuthenticated: true, authChecked: true });
        return { success: true };
      }
      const msg =
        data?.message ||
        data?.error ||
        (!res.ok ? `Registration failed (HTTP ${res.status})` : "Registration failed");
      return { success: false, error: msg };
    } catch (err: any) {
      return { success: false, error: err?.message || "Network error" };
    }
  },

  logout: async () => {
    try {
      await apiFetch("/api/auth/sign-out", { method: "POST" });
    } catch {
      // ignore
    }
    await setSessionToken(null);
    set({ user: null, isAuthenticated: false, files: [], folders: [], favorites: [] });
  },

  fetchFolders: async () => {
    try {
      const res = await apiFetch("/api/media/folders");
      if (res.ok) {
        const data = await res.json();
        set({ folders: data.folders || [] });
      }
    } catch {
      // ignore
    }
  },

  fetchFavorites: async () => {
    try {
      const res = await apiFetch("/api/media/favorites");
      if (res.ok) {
        const data = await res.json();
        set({ favorites: data.favorites || [] });
      }
    } catch {
      // ignore
    }
  },

  toggleFavorite: async (file: MediaFile) => {
    try {
      const res = await apiFetch("/api/media/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(file),
      });
      if (res.ok) {
        await get().fetchFavorites();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  addFolder: async (path, name) => {
    try {
      const res = await apiFetch("/api/media/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, name }),
      });
      if (res.ok) {
        await get().fetchFolders();
        await get().scanMedia(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  removeFolder: async (id) => {
    try {
      const res = await apiFetch(`/api/media/folders?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await get().fetchFolders();
        await get().scanMedia(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  fetchProgress: async () => {
    try {
      const res = await apiFetch("/api/media/progress");
      if (res.ok) {
        const data = await res.json();
        set({ indexingProgress: data });
      }
    } catch {
      // ignore
    }
  },

  scanMedia: async (force = false) => {
    set({ isScanning: true });

    if (!progressInterval) {
      progressInterval = setInterval(() => {
        get().fetchProgress();
      }, 800);
    }

    try {
      const url = `/api/media/scan${force ? "?force=true" : ""}`;
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        set({
          files: data.files || [],
          scannedAt: data.scannedAt || new Date().toISOString(),
        });
      }
    } catch {
      // ignore
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      await get().fetchProgress();
      set({ isScanning: false });
    }
  },

  logMediaView: async (filePath: string) => {
    try {
      await apiFetch("/api/media/log-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath }),
      });
    } catch {
      // ignore
    }
  },
}));
