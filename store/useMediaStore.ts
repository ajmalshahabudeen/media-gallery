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

  setSearchQuery: (query: string) => void;
  setSelectedType: (type: "all" | "image" | "video" | "audio") => void;
  setViewMode: (mode: ViewMode) => void;
  setGroupBy: (mode: GroupByMode) => void;
  setSortBy: (field: SortByField) => void;
  setSortOrder: (order: SortOrder) => void;
  setActiveFolder: (folder: string | null) => void;

  fetchFolders: () => Promise<void>;
  fetchFavorites: () => Promise<void>;
  toggleFavorite: (file: MediaFile) => Promise<boolean>;
  addFolder: (path: string, name?: string) => Promise<boolean>;
  removeFolder: (id: string) => Promise<boolean>;
  scanMedia: (force?: boolean) => Promise<void>;
  fetchProgress: () => Promise<void>;
}

let progressInterval: ReturnType<typeof setInterval> | null = null;

export const useMediaStore = create<MediaState>()(
  persist(
    (set, get) => ({
      folders: [],
      files: [],
      favorites: [],
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

      setSearchQuery: (query) => set({ searchQuery: query }),
      setSelectedType: (type) => set({ selectedType: type }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setGroupBy: (mode) => set({ groupBy: mode }),
      setSortBy: (field) => set({ sortBy: field }),
      setSortOrder: (order) => set({ sortOrder: order }),
      setActiveFolder: (folder) => set({ activeFolder: folder }),

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

      addFolder: async (path, name) => {
        try {
          const res = await fetch("/api/media/folders", {
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
      }),
    }
  )
);
