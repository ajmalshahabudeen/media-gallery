import { getCache, setCache } from "@/lib/redis";

export interface IndexingProgress {
  isIndexing: boolean;
  scannedFiles: number;
  scannedFolders: number;
  currentFolder: string;
  latestFile: string;
  startTime: number | null;
  scannedTargetPaths: string[];
}

let inMemoryProgress: IndexingProgress = {
  isIndexing: false,
  scannedFiles: 0,
  scannedFolders: 0,
  currentFolder: "",
  latestFile: "",
  startTime: null,
  scannedTargetPaths: [],
};

const PROGRESS_KEY = "media_indexing_progress";

export async function getIndexingProgress(): Promise<IndexingProgress> {
  const cached = await getCache<IndexingProgress>(PROGRESS_KEY);
  if (cached) {
    return cached;
  }
  return inMemoryProgress;
}

export async function setIndexingProgress(progress: Partial<IndexingProgress>): Promise<void> {
  inMemoryProgress = {
    ...inMemoryProgress,
    ...progress,
  };
  await setCache(PROGRESS_KEY, inMemoryProgress, 300);
}

export async function resetIndexingProgress(targetPaths: string[] = []): Promise<void> {
  inMemoryProgress = {
    isIndexing: true,
    scannedFiles: 0,
    scannedFolders: 0,
    currentFolder: "Starting scan...",
    latestFile: "",
    startTime: Date.now(),
    scannedTargetPaths: targetPaths,
  };
  await setCache(PROGRESS_KEY, inMemoryProgress, 300);
}

export async function completeIndexingProgress(totalFiles = 0): Promise<void> {
  inMemoryProgress = {
    ...inMemoryProgress,
    isIndexing: false,
    currentFolder: "Completed",
    scannedFiles: totalFiles || inMemoryProgress.scannedFiles,
  };
  await setCache(PROGRESS_KEY, inMemoryProgress, 300);
}
