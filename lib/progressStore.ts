import { getCache, getStringCache, setCache } from "@/lib/redis";

export interface PreviewProgress {
  isGenerating: boolean;
  total: number;
  completed: number;
  percentage: number;
}

export interface IndexingProgress {
  isIndexing: boolean;
  scannedFiles: number;
  scannedFolders: number;
  currentFolder: string;
  latestFile: string;
  startTime: number | null;
  scannedTargetPaths: string[];
  previewProgress?: PreviewProgress;
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
  const baseProgress = cached || inMemoryProgress;

  const totalStr = await getStringCache("preview_total_count");
  const compStr = await getStringCache("preview_completed_count");

  const total = totalStr ? parseInt(totalStr, 10) : 0;
  const rawCompleted = compStr ? parseInt(compStr, 10) : 0;
  const completed = Math.min(rawCompleted, total);

  const percentage = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 100;
  const isGenerating = total > 0 && completed < total;

  return {
    ...baseProgress,
    previewProgress: {
      isGenerating,
      total,
      completed,
      percentage,
    },
  };
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
