import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  apiFetch,
  getServerUrl,
  setServerUrl as saveServerUrl,
  setSessionToken,
  getSessionToken,
} from "../lib/api";

export const GALLERY_LAYOUT_KEY = "media_gallery_home_layout";

export type GalleryLayout = "grid" | "feed";

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
  sessionToken: string | null;
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
  galleryLayout: GalleryLayout;
  tabBarHidden: boolean;

  setServerUrl: (url: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedType: (type: "all" | "image" | "video" | "audio") => void;
  setViewMode: (mode: "grid" | "list" | "cards") => void;
  setSortBy: (field: "name" | "date" | "size") => void;
  setSortOrder: (order: "asc" | "desc") => void;
  setGroupBy: (mode: "none" | "folder" | "type" | "date") => void;
  setActiveFolder: (folder: string | null) => void;
  setGalleryLayout: (layout: GalleryLayout) => Promise<void>;
  setTabBarHidden: (hidden: boolean) => void;

  initApp: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;

  fetchFolders: () => Promise<void>;
  fetchFavorites: () => Promise<void>;
  toggleFavorite: (file: MediaFile) => Promise<boolean>;
  addFolder: (path: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  removeFolder: (id: string) => Promise<boolean>;
  fetchSubfolders: (parentPath: string) => Promise<{ name: string; path: string; isRoot?: boolean }[]>;
  createSubfolder: (
    parentPath: string,
    name: string
  ) => Promise<{ success: boolean; path?: string; error?: string }>;
  uploadMedia: (
    libraryPath: string,
    destPath: string,
    files: { uri: string; name: string; type: string }[]
  ) => Promise<{ success: boolean; uploaded: number; failed: number; error?: string }>;
  scanMedia: (force?: boolean) => Promise<void>;
  fetchProgress: () => Promise<void>;
  logMediaView: (filePath: string) => Promise<void>;
}

let progressInterval: ReturnType<typeof setInterval> | null = null;

export const useMobileStore = create<MobileState>((set, get) => ({
  serverUrl: "http://192.168.1.101:38479",
  sessionToken: null,
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
  galleryLayout: "grid",
  tabBarHidden: false,

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
  setTabBarHidden: (hidden) => set({ tabBarHidden: hidden }),
  setGalleryLayout: async (layout) => {
    set({ galleryLayout: layout });
    try {
      await AsyncStorage.setItem(GALLERY_LAYOUT_KEY, layout);
    } catch {
      // ignore persist errors
    }
  },

  initApp: async () => {
    try {
      const url = await getServerUrl();
      const token = await getSessionToken();
      let galleryLayout: GalleryLayout = "grid";
      try {
        const savedLayout = await AsyncStorage.getItem(GALLERY_LAYOUT_KEY);
        if (savedLayout === "feed" || savedLayout === "grid") {
          galleryLayout = savedLayout;
        }
      } catch {
        // ignore
      }
      set({ serverUrl: url, sessionToken: token, galleryLayout });
      await get().checkAuth();
    } catch {
      // Never leave the UI stuck on the splash/loading gate.
      set({ user: null, sessionToken: null, isAuthenticated: false, authChecked: true });
    }
  },

  checkAuth: async () => {
    try {
      const token = await getSessionToken();
      set({ sessionToken: token });
      // Fast path: no saved session → skip network so cold start always opens offline.
      if (!token) {
        set({ user: null, sessionToken: null, isAuthenticated: false, authChecked: true });
        return false;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await apiFetch("/api/auth/get-session", { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data?.session && data?.user) {
          const authToken = data.session.token || token;
          if (authToken) {
            await setSessionToken(authToken);
          }
          set({ user: data.user, sessionToken: authToken, isAuthenticated: true, authChecked: true });
          // Fire-and-forget library refresh (non-blocking for first paint)
          void get().fetchFolders();
          void get().fetchFavorites();
          void get().scanMedia(false);
          return true;
        }
      }
      set({ user: null, sessionToken: null, isAuthenticated: false, authChecked: true });
      return false;
    } catch {
      set({ user: null, sessionToken: null, isAuthenticated: false, authChecked: true });
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
        const authToken = data.token || data.session?.token;
        if (authToken) {
          await setSessionToken(authToken);
        }
        set({ user: data.user, sessionToken: authToken || null, isAuthenticated: true, authChecked: true });
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
        const authToken = data.token || data.session?.token;
        if (authToken) {
          await setSessionToken(authToken);
        }
        set({ user: data.user, sessionToken: authToken || null, isAuthenticated: true, authChecked: true });
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
    set({
      user: null,
      sessionToken: null,
      isAuthenticated: false,
      authChecked: true,
      folders: [],
      files: [],
      favorites: [],
    });
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
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await get().fetchFolders();
        await get().scanMedia(true);
        return { success: true };
      }
      return {
        success: false,
        error: data?.error || `Failed to add folder (HTTP ${res.status})`,
      };
    } catch {
      return { success: false, error: "Network error adding folder" };
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

  fetchSubfolders: async (parentPath) => {
    try {
      const res = await apiFetch(
        `/api/media/subfolders?path=${encodeURIComponent(parentPath)}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      return data.folders || [];
    } catch {
      return [];
    }
  },

  createSubfolder: async (parentPath, name) => {
    try {
      const res = await apiFetch("/api/media/mkdir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentPath, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.folder?.path) {
        return { success: true, path: data.folder.path as string };
      }
      return { success: false, error: data?.error || "Failed to create folder" };
    } catch {
      return { success: false, error: "Network error creating folder" };
    }
  },

  uploadMedia: async (libraryPath, destPath, files) => {
    try {
      const form = new FormData();
      form.append("libraryPath", libraryPath);
      form.append("destPath", destPath);
      for (const file of files) {
        form.append("files", {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as unknown as Blob);
      }
      const res = await apiFetch("/api/media/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          uploaded: 0,
          failed: files.length,
          error: data?.error || `Upload failed (HTTP ${res.status})`,
        };
      }
      const uploadedFiles = (data.uploaded || []) as MediaFile[];
      if (uploadedFiles.length > 0) {
        set((state) => ({
          files: [...uploadedFiles, ...state.files],
        }));
      }
      return {
        success: uploadedFiles.length > 0,
        uploaded: uploadedFiles.length,
        failed: Array.isArray(data.errors) ? data.errors.length : 0,
        error:
          uploadedFiles.length === 0
            ? data?.error || data?.errors?.[0]?.error || "No files were uploaded"
            : undefined,
      };
    } catch {
      return { success: false, uploaded: 0, failed: files.length, error: "Network error uploading" };
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
