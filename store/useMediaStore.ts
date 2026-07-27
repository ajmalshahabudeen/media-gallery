import { create } from "zustand";

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
  activeFolder: string | null;
  selectedType: "all" | "image" | "video" | "audio";
  searchQuery: string;
  isLoading: boolean;
  isScanning: boolean;
  scannedAt: string | null;
  indexingProgress: IndexingProgressState;

  setSearchQuery: (query: string) => void;
  setSelectedType: (type: "all" | "image" | "video" | "audio") => void;
  setActiveFolder: (folder: string | null) => void;

  fetchFolders: () => Promise<void>;
  addFolder: (path: string, name?: string) => Promise<boolean>;
  removeFolder: (id: string) => Promise<boolean>;
  scanMedia: (force?: boolean) => Promise<void>;
  fetchProgress: () => Promise<void>;
}

let progressInterval: ReturnType<typeof setInterval> | null = null;

export const useMediaStore = create<MediaState>((set, get) => ({
  folders: [],
  files: [],
  activeFolder: null,
  selectedType: "all",
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

    // Start progress polling
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
}));
