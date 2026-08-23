import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  apiFetch,
  setServerUrl as saveServerUrl,
  setSessionToken,
  getSessionToken,
  getServerUrl,
  pingServer,
} from "../lib/api";
import { saveLogin } from "../lib/saved-login";
import { discoverServerUrl } from "../lib/network-scan";
import { uploadPickedMedia } from "../lib/upload-media";
import {
  hasLiveBetterAuthSession,
  isExplicitUnauthenticated,
  readAuthToken,
} from "../lib/auth-session";

export const GALLERY_LAYOUT_KEY = "media_gallery_home_layout";
export const FOLDER_FILTER_KEY = "media_gallery_folder_filter";

export type GalleryLayout = "grid" | "feed";

type FolderFilterPersist = {
  enabled: boolean;
  folders: string[];
};

async function persistFolderFilter(enabled: boolean, folders: string[]) {
  try {
    const payload: FolderFilterPersist = { enabled, folders };
    await AsyncStorage.setItem(FOLDER_FILTER_KEY, JSON.stringify(payload));
  } catch {
    // ignore persist errors
  }
}

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
  folderFilterEnabled: boolean;
  selectedFolders: string[];

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
  setFolderFilterEnabled: (enabled: boolean) => void;
  setSelectedFolders: (folders: string[]) => void;
  toggleSelectedFolder: (folder: string) => void;

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
    files: { uri: string; name: string; type: string }[],
    onProgress?: (index: number, percent: number) => void
  ) => Promise<{ success: boolean; uploaded: number; failed: number; error?: string }>;
  scanMedia: (force?: boolean) => Promise<void>;
  fetchProgress: () => Promise<void>;
  logMediaView: (filePath: string) => Promise<void>;
}

let progressInterval: ReturnType<typeof setInterval> | null = null;
let authCheckSeq = 0;

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
  folderFilterEnabled: false,
  selectedFolders: [],

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
  setFolderFilterEnabled: (enabled) => {
    set({ folderFilterEnabled: enabled });
    void persistFolderFilter(enabled, get().selectedFolders);
  },
  setSelectedFolders: (folders) => {
    const unique = [...new Set(folders.map((f) => f.trim()).filter(Boolean))];
    set({ selectedFolders: unique });
    void persistFolderFilter(get().folderFilterEnabled, unique);
  },
  toggleSelectedFolder: (folder) => {
    const current = get().selectedFolders;
    const next = current.includes(folder)
      ? current.filter((item) => item !== folder)
      : [...current, folder];
    set({ selectedFolders: next });
    void persistFolderFilter(get().folderFilterEnabled, next);
  },
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
      const [url, token] = await Promise.all([getServerUrl(), getSessionToken()]);
      let galleryLayout: GalleryLayout = "grid";
      let folderFilterEnabled = false;
      let selectedFolders: string[] = [];
      try {
        const [savedLayout, savedFolderFilter] = await Promise.all([
          AsyncStorage.getItem(GALLERY_LAYOUT_KEY),
          AsyncStorage.getItem(FOLDER_FILTER_KEY),
        ]);
        if (savedLayout === "feed" || savedLayout === "grid") {
          galleryLayout = savedLayout;
        }
        if (savedFolderFilter) {
          const parsed = JSON.parse(savedFolderFilter) as FolderFilterPersist;
          folderFilterEnabled = !!parsed?.enabled;
          selectedFolders = Array.isArray(parsed?.folders)
            ? parsed.folders.filter((item): item is string => typeof item === "string" && item.length > 0)
            : [];
        }
      } catch {
        // ignore
      }
      set({ serverUrl: url, sessionToken: token, galleryLayout, folderFilterEnabled, selectedFolders });

      const discovered = await discoverServerUrl({ budgetMs: 4500 });
      if (discovered.url !== get().serverUrl) {
        await get().setServerUrl(discovered.url);
      } else {
        set({ serverUrl: discovered.url });
      }

      await get().checkAuth();
    } catch {
      // Never leave the UI stuck on the splash/loading gate.
      set({ user: null, isAuthenticated: false, authChecked: true });
    }
  },

  checkAuth: async () => {
    const seq = ++authCheckSeq;
    const apply = (partial: Partial<MobileState>) => {
      if (seq !== authCheckSeq) return;
      set(partial);
    };
    try {
      const token = await getSessionToken();
      apply({ sessionToken: token });
      // Fast path: no saved session → skip network so cold start always opens offline.
      if (!token) {
        apply({ user: null, sessionToken: null, isAuthenticated: false, authChecked: true });
        return false;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await apiFetch("/api/auth/get-session", { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));

      if (res.ok && hasLiveBetterAuthSession(data)) {
        const authToken = readAuthToken(data) || token;
        if (authToken) {
          await setSessionToken(authToken);
        }
        apply({ user: data.user, sessionToken: authToken, isAuthenticated: true, authChecked: true });
        void get().fetchFolders();
        void get().fetchFavorites();
        void get().scanMedia(false);
        return true;
      }

      if (isExplicitUnauthenticated(res.status, data)) {
        await setSessionToken(null);
        apply({ user: null, sessionToken: null, isAuthenticated: false, authChecked: true });
        return false;
      }

      // Reachable-but-odd response: stay signed out without wiping the token.
      apply({ user: null, isAuthenticated: false, authChecked: true });
      return false;
    } catch (err) {
      // Network / timeout: do not delete the session token — URL may still be wrong.
      apply({
        user: null,
        isAuthenticated: false,
        authChecked: true,
      });
      return false;
    }
  },

  login: async (email, password) => {
    try {
      const reachable = await pingServer();
      if (!reachable.success) {
        return {
          success: false,
          error: reachable.message || "Cannot reach Server Gallery. Check the server IP.",
        };
      }

      // Drop any stale session so Better Auth doesn't require Origin via cookie path
      await setSessionToken(null);

      const res = await apiFetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.user) {
        const msg =
          data?.message ||
          data?.error ||
          (!res.ok ? `Sign in failed (HTTP ${res.status})` : "Invalid credentials");
        return { success: false, error: msg };
      }

      const authToken = readAuthToken(data);
      if (authToken) {
        await setSessionToken(authToken);
      }

      const sessionRes = await apiFetch("/api/auth/get-session");
      const sessionData = await sessionRes.json().catch(() => ({}));
      const sessionLive = sessionRes.ok && hasLiveBetterAuthSession(sessionData);
      if (!sessionLive && !authToken) {
        await setSessionToken(null);
        return {
          success: false,
          error: "Server did not create a Better Auth session. Check the server IP and try again.",
        };
      }

      const confirmedToken = readAuthToken(sessionData) || authToken;
      if (confirmedToken) {
        await setSessionToken(confirmedToken);
      }
      authCheckSeq += 1;
      set({
        user: sessionLive ? sessionData.user : data.user,
        sessionToken: confirmedToken || null,
        isAuthenticated: true,
        authChecked: true,
        serverUrl: await getServerUrl(),
      });
      try {
        await saveLogin({ email, password, name: sessionData.user?.name || data.user?.name });
      } catch {
        // Non-fatal: session is already live
      }
      await get().fetchFolders();
      await get().fetchFavorites();
      await get().scanMedia(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Network error. Please check server IP." };
    }
  },

  register: async (name, email, password) => {
    try {
      const reachable = await pingServer();
      if (!reachable.success) {
        return {
          success: false,
          error: reachable.message || "Cannot reach Server Gallery. Check the server IP.",
        };
      }

      await setSessionToken(null);

      const res = await apiFetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.user) {
        const msg =
          data?.message ||
          data?.error ||
          (!res.ok ? `Registration failed (HTTP ${res.status})` : "Registration failed");
        return { success: false, error: msg };
      }

      const authToken = readAuthToken(data);
      if (authToken) {
        await setSessionToken(authToken);
      }

      const sessionRes = await apiFetch("/api/auth/get-session");
      const sessionData = await sessionRes.json().catch(() => ({}));
      const sessionLive = sessionRes.ok && hasLiveBetterAuthSession(sessionData);
      if (!sessionLive && !authToken) {
        await setSessionToken(null);
        return {
          success: false,
          error: "Server did not create a Better Auth session. Check the server IP and try again.",
        };
      }

      const confirmedToken = readAuthToken(sessionData) || authToken;
      if (confirmedToken) {
        await setSessionToken(confirmedToken);
      }
      authCheckSeq += 1;
      set({
        user: sessionLive ? sessionData.user : data.user,
        sessionToken: confirmedToken || null,
        isAuthenticated: true,
        authChecked: true,
        serverUrl: await getServerUrl(),
      });
      try {
        await saveLogin({ email, password, name: sessionData.user?.name || data.user?.name || name });
      } catch {
        // Non-fatal: session is already live
      }
      return { success: true };
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
    authCheckSeq += 1;
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

  uploadMedia: async (libraryPath, destPath, files, onProgress) => {
    try {
      const result = await uploadPickedMedia(libraryPath, destPath, files, onProgress);
      const uploadedFiles = (result.files || []) as MediaFile[];
      if (uploadedFiles.length > 0) {
        set((state) => ({
          files: [...uploadedFiles, ...state.files],
        }));
      }
      return {
        success: result.success,
        uploaded: result.uploaded,
        failed: result.failed,
        error: result.error,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error uploading";
      return { success: false, uploaded: 0, failed: files.length, error: message };
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
