import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewMode =
  | "list"
  | "small-cards"
  | "big-cards"
  | "detailed-cards"
  | "detailed-list";

export type GroupByMode = "none" | "folder" | "type" | "date";
export type SortByField = "name" | "date" | "size";
export type SortOrder = "asc" | "desc";

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

export interface SaveFolderItem {
  id: string;
  name: string;
  isDefault: boolean;
  itemCount: number;
  previewPaths: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SavedMediaItem extends MediaFile {
  createdAt: string;
  folderIds: string[];
}

export interface IndexingProgressState {
  isIndexing: boolean;
  scannedFiles: number;
  scannedFolders: number;
  currentFolder: string;
  latestFile: string;
  startTime: number | null;
}

interface MediaState {
  folders: MediaFolderItem[];
  files: MediaFile[];
  favorites: MediaFile[];
  saveFolders: SaveFolderItem[];
  savedMedia: SavedMediaItem[];
  defaultSaveFolderId: string | null;
  unmountedFolders: { path: string; error: string }[];
  activeFolder: string | null;
  selectedType: "all" | "image" | "video" | "audio";
  viewMode: ViewMode;
  groupBy: GroupByMode;
  sortBy: SortByField;
  sortOrder: SortOrder;
  searchQuery: string;
  isLoading: boolean;
  isScanning: boolean;
  scannedAt: string | null;
  indexingProgress: IndexingProgressState;

  sidebarOpen: boolean;
  /** Dashboard top chrome visibility while browsing Reels (mirrors All/Favorites bar). */
  reelsChromeVisible: boolean;
  setSearchQuery: (query: string) => void;
  setSelectedType: (type: "all" | "image" | "video" | "audio") => void;
  setViewMode: (mode: ViewMode) => void;
  setGroupBy: (mode: GroupByMode) => void;
  setSortBy: (field: SortByField) => void;
  setSortOrder: (order: SortOrder) => void;
  setActiveFolder: (folder: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setReelsChromeVisible: (visible: boolean) => void;

  fetchFolders: () => Promise<void>;
  fetchFavorites: () => Promise<void>;
  toggleFavorite: (file: MediaFile) => Promise<boolean>;
  fetchSaved: () => Promise<void>;
  quickSaveMedia: (
    file: MediaFile
  ) => Promise<{ saved: boolean; alreadySaved?: boolean; folderIds: string[] } | null>;
  toggleMediaInSaveFolder: (
    file: MediaFile,
    saveFolderId: string,
    moveFromDefault?: boolean
  ) => Promise<{ saved: boolean; folderIds: string[] } | null>;
  unsaveMedia: (path: string) => Promise<boolean>;
  createSaveFolder: (
    name: string,
    media?: MediaFile,
    moveFromDefault?: boolean
  ) => Promise<{ success: boolean; folder?: SaveFolderItem; error?: string }>;
  renameSaveFolder: (id: string, name: string) => Promise<{ success: boolean; error?: string }>;
  deleteSaveFolder: (id: string) => Promise<{ success: boolean; error?: string }>;
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
    files: File[]
  ) => Promise<{ success: boolean; uploaded: number; failed: number; error?: string }>;
  scanMedia: (force?: boolean) => Promise<void>;
  fetchProgress: () => Promise<void>;
  resetState: () => void;
}

let progressInterval: ReturnType<typeof setInterval> | null = null;

export const useMediaStore = create<MediaState>()(
  persist(
    (set, get) => ({
      folders: [],
      files: [],
      favorites: [],
      saveFolders: [],
      savedMedia: [],
      defaultSaveFolderId: null,
      unmountedFolders: [],
      activeFolder: null,
      selectedType: "all",
      viewMode: "detailed-cards",
      groupBy: "none",
      sortBy: "name",
      sortOrder: "asc",
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

      sidebarOpen: true,
      reelsChromeVisible: true,
      resetState: () =>
        set({
          folders: [],
          files: [],
          favorites: [],
          saveFolders: [],
          savedMedia: [],
          defaultSaveFolderId: null,
          unmountedFolders: [],
          activeFolder: null,
          scannedAt: null,
        }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSelectedType: (type) => set({ selectedType: type }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setGroupBy: (mode) => set({ groupBy: mode }),
      setSortBy: (field) => set({ sortBy: field }),
      setSortOrder: (order) => set({ sortOrder: order }),
      setActiveFolder: (folder) => set({ activeFolder: folder }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setReelsChromeVisible: (visible) => set({ reelsChromeVisible: visible }),

      fetchFolders: async () => {
        set({ isLoading: true });
        try {
          const res = await fetch("/api/media/folders");
          if (res.ok) {
            const data = await res.json();
            set({ folders: data.folders || [] });
          }
        } catch {
          // ignore
        } finally {
          set({ isLoading: false });
        }
      },

      fetchFavorites: async () => {
        try {
          const res = await fetch("/api/media/favorites");
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
          const res = await fetch("/api/media/favorites", {
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

      fetchSaved: async () => {
        try {
          const res = await fetch("/api/media/saved");
          if (res.ok) {
            const data = await res.json();
            set({
              saveFolders: data.folders || [],
              savedMedia: data.items || [],
              defaultSaveFolderId: data.defaultFolderId || null,
            });
          }
        } catch {
          // ignore
        }
      },

      quickSaveMedia: async (file: MediaFile) => {
        try {
          const res = await fetch("/api/media/saved", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "quick-save", media: file }),
          });
          if (!res.ok) return null;
          const data = await res.json();
          set({
            saveFolders: data.folders || get().saveFolders,
            savedMedia: data.items || get().savedMedia,
            defaultSaveFolderId: data.defaultFolderId || get().defaultSaveFolderId,
          });
          return {
            saved: !!data.saved,
            alreadySaved: !!data.alreadySaved,
            folderIds: Array.isArray(data.folderIds) ? data.folderIds : [],
          };
        } catch {
          return null;
        }
      },

      toggleMediaInSaveFolder: async (
        file: MediaFile,
        saveFolderId: string,
        moveFromDefault = false
      ) => {
        try {
          const res = await fetch("/api/media/saved", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "toggle-folder",
              media: file,
              saveFolderId,
              moveFromDefault,
            }),
          });
          if (!res.ok) return null;
          const data = await res.json();
          set({
            saveFolders: data.folders || get().saveFolders,
            savedMedia: data.items || get().savedMedia,
            defaultSaveFolderId: data.defaultFolderId || get().defaultSaveFolderId,
          });
          return {
            saved: !!data.saved,
            folderIds: Array.isArray(data.folderIds) ? data.folderIds : [],
          };
        } catch {
          return null;
        }
      },

      unsaveMedia: async (path: string) => {
        try {
          const res = await fetch("/api/media/saved", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "unsave", media: { path } }),
          });
          if (!res.ok) return false;
          const data = await res.json();
          set({
            saveFolders: data.folders || get().saveFolders,
            savedMedia: data.items || get().savedMedia,
            defaultSaveFolderId: data.defaultFolderId || get().defaultSaveFolderId,
          });
          return true;
        } catch {
          return false;
        }
      },

      createSaveFolder: async (name: string, media?: MediaFile, moveFromDefault = false) => {
        try {
          const res = await fetch("/api/media/saved/folders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, media, moveFromDefault }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            return {
              success: false,
              error: data?.error || `Failed to create folder (HTTP ${res.status})`,
            };
          }
          set({
            saveFolders: data.folders || get().saveFolders,
            savedMedia: data.items || get().savedMedia,
            defaultSaveFolderId: data.defaultFolderId || get().defaultSaveFolderId,
          });
          return { success: true, folder: data.folder };
        } catch {
          return { success: false, error: "Network error creating save folder" };
        }
      },

      renameSaveFolder: async (id: string, name: string) => {
        try {
          const res = await fetch(`/api/media/saved/folders/${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            return {
              success: false,
              error: data?.error || `Failed to rename folder (HTTP ${res.status})`,
            };
          }
          set({
            saveFolders: data.folders || get().saveFolders,
            savedMedia: data.items || get().savedMedia,
            defaultSaveFolderId: data.defaultFolderId || get().defaultSaveFolderId,
          });
          return { success: true };
        } catch {
          return { success: false, error: "Network error renaming save folder" };
        }
      },

      deleteSaveFolder: async (id: string) => {
        try {
          const res = await fetch(`/api/media/saved/folders/${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            return {
              success: false,
              error: data?.error || `Failed to delete folder (HTTP ${res.status})`,
            };
          }
          set({
            saveFolders: data.folders || get().saveFolders,
            savedMedia: data.items || get().savedMedia,
            defaultSaveFolderId: data.defaultFolderId || get().defaultSaveFolderId,
          });
          return { success: true };
        } catch {
          return { success: false, error: "Network error deleting save folder" };
        }
      },

      addFolder: async (path, name) => {
        try {
          const res = await fetch("/api/media/folders", {
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
          const res = await fetch(`/api/media/folders?id=${id}`, {
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
          const res = await fetch(
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
          const res = await fetch("/api/media/mkdir", {
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
            form.append("files", file);
          }
          const res = await fetch("/api/media/upload", {
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
          const res = await fetch("/api/media/progress");
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
          }, 500);
        }

        try {
          const url = `/api/media/scan${force ? "?force=true" : ""}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            set({
              files: data.files || [],
              unmountedFolders: data.unmountedFolders || [],
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
    }),
    {
      name: "media_gallery_preferences",
      partialize: (state) => ({
        viewMode: state.viewMode,
        selectedType: state.selectedType,
        activeFolder: state.activeFolder,
        groupBy: state.groupBy,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
