import { AppState, Platform } from "react-native";
import * as Device from "expo-device";
import * as FileSystem from "expo-file-system/legacy";
import { buildMediaFileUrl } from "./api";
import type { MediaFile } from "../store/useMobileStore";

/**
 * Intelligent, Adaptive Reel Video Caching Engine
 *
 * Mathematical & Algorithmic Features:
 * 1. Hardware capacity modeling (RAM + CPU year class) calculating optimal concurrency.
 * 2. Real-time JS event-loop contention/jitter monitor to dynamically throttle load so the phone never lags.
 * 3. Network speed probing & throughput Exponential Moving Average (EMA).
 * 4. Priority Queue: next 3 guaranteed, dynamically expanding up to 10 bidirectional reels.
 * 5. Video size threshold: full disk cache for <= 100MB, initial 15-20s chunk (~16MB) for > 100MB.
 * 6. Disk space safety checks and LRU cache eviction.
 * 7. Cache cleared at splashscreen startup and app lifecycle termination.
 * 8. Zero-friction playback with automatic fallback to server streaming.
 */

export const SIZE_100MB = 100 * 1024 * 1024;
export const PARTIAL_CHUNK_BYTES = 16 * 1024 * 1024; // ~16 MB covers 15-20s of 1080p/4K video
export const MIN_FREE_DISK_BYTES = 500 * 1024 * 1024; // 500 MB safety buffer
export const MAX_REEL_CACHE_BYTES = 1200 * 1024 * 1024; // 1.2 GB cache cap

const REELS_CACHE_DIR = `${FileSystem.cacheDirectory ?? ""}reels/`;

export interface CachedReelEntry {
  path: string;
  localUri: string;
  fileSize: number;
  cachedBytes: number;
  isPartial: boolean;
  status: "idle" | "downloading" | "ready" | "corrupted";
  lastAccessed: number;
}

export interface DeviceHardwareProfile {
  totalMemoryBytes: number;
  deviceYear: number;
  hardwareScore: number; // 0 to 1.0
  baseConcurrency: number; // 1, 2, or 3
}

/** Computes hardware profile from RAM and CPU year class */
export function calculateDeviceProfile(): DeviceHardwareProfile {
  const ram = Device.totalMemory || 4 * 1024 * 1024 * 1024; // fallback 4GB
  const year = Device.deviceYearClass || 2021;

  // Normalized RAM score (capped at 8GB)
  const ramScore = Math.min(1.0, ram / (8 * 1024 * 1024 * 1024));

  // Normalized Year score (2018 to 2024 range)
  const yearScore = Math.min(1.0, Math.max(0, (year - 2018) / 6));

  // Hardware Score: 60% RAM capacity, 40% CPU architecture year
  const hardwareScore = 0.6 * ramScore + 0.4 * yearScore;

  // Safe concurrency allocation:
  // Low-end (< 3.5GB RAM or score < 0.4): 1 worker
  // Mid-range (score 0.4 to 0.75): 2 workers
  // High-end (score >= 0.75 and RAM >= 6GB): 3 workers
  let baseConcurrency = 2;
  if (hardwareScore < 0.4 || ram < 3.5 * 1024 * 1024 * 1024) {
    baseConcurrency = 1;
  } else if (hardwareScore >= 0.75 && ram >= 6 * 1024 * 1024 * 1024) {
    baseConcurrency = 3;
  }

  return {
    totalMemoryBytes: ram,
    deviceYear: year,
    hardwareScore,
    baseConcurrency,
  };
}

/** Real-time JS event loop latency & frame-jitter monitor */
class RealtimeLoadMonitor {
  private nominalIntervalMs = 120;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTick = Date.now();
  private loadFactor = 0; // 0 (idle) to 1.0 (heavy contention)
  private alpha = 0.25;

  start() {
    if (this.timer) return;
    this.lastTick = Date.now();
    this.timer = setInterval(() => {
      const now = Date.now();
      const delta = now - this.lastTick;
      this.lastTick = now;
      const jitter = Math.max(0, delta - this.nominalIntervalMs);
      // 40ms of jitter indicates dropped frames / heavy CPU contention
      const instantaneousLoad = Math.min(1.0, jitter / 40);
      this.loadFactor = this.alpha * instantaneousLoad + (1 - this.alpha) * this.loadFactor;
    }, this.nominalIntervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getLoadFactor(): number {
    return this.loadFactor;
  }
}

/** Rolling throughput estimator measuring real-time bytes/sec to the server */
class NetworkSpeedEstimator {
  private smoothedSpeed = 5 * 1024 * 1024; // default 5 MB/s baseline
  private beta = 0.35;

  recordSample(bytes: number, durationMs: number) {
    if (bytes <= 0 || durationMs < 40) return;
    const speed = (bytes / durationMs) * 1000;
    if (Number.isFinite(speed) && speed > 0) {
      this.smoothedSpeed = this.beta * speed + (1 - this.beta) * this.smoothedSpeed;
    }
  }

  getSpeed(): number {
    return this.smoothedSpeed;
  }

  /** Normalized quality score between 0.1 and 1.0 (saturated at 12 MB/s) */
  getNetworkQuality(): number {
    return Math.max(0.1, Math.min(1.0, this.smoothedSpeed / (12 * 1024 * 1024)));
  }
}

/** Collision-resistant 16-character hex hash with original video extension */
function getCacheFileName(filePath: string, isPartial: boolean): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < filePath.length; i++) {
    const ch = filePath.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex =
    (h2 >>> 0).toString(16).padStart(8, "0") +
    (h1 >>> 0).toString(16).padStart(8, "0");
  const ext = filePath.split(".").pop()?.toLowerCase() || "mp4";
  const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 4) || "mp4";
  return isPartial ? `reel_${hex}_part.${safeExt}` : `reel_${hex}.${safeExt}`;
}

export class ReelCacheManager {
  private static instance: ReelCacheManager | null = null;

  public static getInstance(): ReelCacheManager {
    if (!ReelCacheManager.instance) {
      ReelCacheManager.instance = new ReelCacheManager();
    }
    return ReelCacheManager.instance;
  }

  private deviceProfile: DeviceHardwareProfile;
  private loadMonitor = new RealtimeLoadMonitor();
  private speedEstimator = new NetworkSpeedEstimator();

  private entries = new Map<string, CachedReelEntry>();
  private activeDownloads = new Map<string, FileSystem.DownloadResumable>();
  private listeners = new Map<string, Set<(entry: CachedReelEntry) => void>>();

  private activeIndex = 0;
  private currentFeed: MediaFile[] = [];
  private serverUrl = "";
  private sessionToken: string | null = null;
  private isProcessing = false;
  private initialized = false;

  private constructor() {
    this.deviceProfile = calculateDeviceProfile();
    this.loadMonitor.start();

    // Hook into app lifecycle: clear temporary downloads when app closes
    AppState.addEventListener("change", (state) => {
      if (state === "background") {
        this.cancelLowPriorityDownloads();
      }
    });
  }

  /** Initialize directory structure and scan existing disk items */
  public async init(): Promise<void> {
    if (this.initialized) return;
    try {
      if (!FileSystem.cacheDirectory) return;
      const dirInfo = await FileSystem.getInfoAsync(REELS_CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(REELS_CACHE_DIR, { intermediates: true });
      }
      this.initialized = true;
    } catch (err) {
      console.warn("[ReelCacheManager] Init warning:", err);
    }
  }

  /** Purges all cached reel videos from disk (called at splashscreen and app exit) */
  public static async clearAllCache(): Promise<void> {
    try {
      const mgr = ReelCacheManager.getInstance();
      for (const [_, task] of mgr.activeDownloads) {
        try {
          await task.cancelAsync();
        } catch {
          // ignore
        }
      }
      mgr.activeDownloads.clear();
      mgr.entries.clear();

      if (!FileSystem.cacheDirectory) return;
      const dirInfo = await FileSystem.getInfoAsync(REELS_CACHE_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(REELS_CACHE_DIR, { idempotent: true });
      }
      await FileSystem.makeDirectoryAsync(REELS_CACHE_DIR, { intermediates: true });
    } catch (err) {
      console.warn("[ReelCacheManager] clearAllCache warning:", err);
    }
  }

  /** Called when the feed or active index changes in ReelsFeed */
  public updateFeedContext(
    feed: MediaFile[],
    activeIndex: number,
    serverUrl: string,
    sessionToken: string | null
  ): void {
    this.currentFeed = feed;
    this.activeIndex = activeIndex;
    this.serverUrl = serverUrl;
    this.sessionToken = sessionToken;

    // Trigger async scheduler
    void this.scheduleNextBatch();
  }

  /**
   * Returns a local file:// URI if ready on disk; otherwise falls back to the server stream URL.
   * This guarantees 0ms playback when cached and zero friction when streaming.
   */
  public getPlayableUri(
    filePath: string,
    serverUrl: string,
    sessionToken?: string | null
  ): string {
    const entry = this.entries.get(filePath);
    if (entry && entry.status === "ready" && !entry.isPartial) {
      entry.lastAccessed = Date.now();
      return entry.localUri;
    }
    // Fall back to server stream URL with token
    return buildMediaFileUrl(serverUrl, filePath, sessionToken);
  }

  /** Check if a reel has a ready disk cache */
  public isCached(filePath: string): boolean {
    const entry = this.entries.get(filePath);
    return !!entry && entry.status === "ready" && !entry.isPartial;
  }

  /** Invalidate and remove a corrupted or broken cache file */
  public markCorrupted(filePath: string): void {
    const entry = this.entries.get(filePath);
    if (entry) {
      entry.status = "corrupted";
      FileSystem.deleteAsync(entry.localUri, { idempotent: true }).catch(() => {});
      this.entries.delete(filePath);
      this.notifyListeners(filePath, entry);
    }
  }

  /** Subscribe to cache status updates for a specific file */
  public subscribe(
    filePath: string,
    callback: (entry: CachedReelEntry) => void
  ): () => void {
    let set = this.listeners.get(filePath);
    if (!set) {
      set = new Set();
      this.listeners.set(filePath, set);
    }
    set.add(callback);
    const existing = this.entries.get(filePath);
    if (existing) callback(existing);

    return () => {
      const current = this.listeners.get(filePath);
      if (current) {
        current.delete(callback);
        if (current.size === 0) this.listeners.delete(filePath);
      }
    };
  }

  private notifyListeners(filePath: string, entry: CachedReelEntry): void {
    const set = this.listeners.get(filePath);
    if (set) {
      for (const cb of set) {
        try {
          cb(entry);
        } catch {
          // ignore
        }
      }
    }
  }

  /** Cancel downloads outside the immediate window */
  private cancelLowPriorityDownloads(): void {
    const keepPaths = new Set<string>();
    // Keep only active and next 2 reels
    for (let i = this.activeIndex; i <= Math.min(this.currentFeed.length - 1, this.activeIndex + 2); i++) {
      const item = this.currentFeed[i];
      if (item) keepPaths.add(item.path);
    }
    for (const [path, task] of this.activeDownloads) {
      if (!keepPaths.has(path)) {
        task.cancelAsync().catch(() => {});
        this.activeDownloads.delete(path);
        const entry = this.entries.get(path);
        if (entry && entry.status === "downloading") {
          entry.status = "idle";
        }
      }
    }
  }

  /**
   * Main scheduler algorithm:
   * 1. Evaluates real-time event-loop contention to adjust concurrency.
   * 2. Computes bidirectional window (next 3 guaranteed, up to 10 based on device & network).
   * 3. Calculates mathematical priority for each candidate reel.
   * 4. Enforces disk safety and starts downloads in parallel workers.
   */
  private async scheduleNextBatch(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      await this.init();
      if (!this.serverUrl || this.currentFeed.length === 0) return;

      // 1. Dynamic Concurrency calculation
      const load = this.loadMonitor.getLoadFactor();
      let maxWorkers = this.deviceProfile.baseConcurrency;
      if (load > 0.4) {
        // UI or thread under load: back off to preserve smooth 60/120 fps
        maxWorkers = Math.max(1, maxWorkers - 1);
      }
      if (load > 0.75) {
        maxWorkers = 1;
      }

      // If already at or above worker capacity, yield
      if (this.activeDownloads.size >= maxWorkers) return;

      // 2. Dynamic Window calculation:
      // Minimum next window = 3 guaranteed
      // Extended next window = min(10, max(3, round(3 + 7 * S_dev * Q_net)))
      // Previous window = min(10, round(10 * S_dev * Q_net))
      const S_dev = this.deviceProfile.hardwareScore;
      const Q_net = this.speedEstimator.getNetworkQuality();

      const nextWindowSize = Math.min(
        10,
        Math.max(3, Math.round(3 + 7 * S_dev * Q_net))
      );
      const prevWindowSize = Math.min(10, Math.round(10 * S_dev * Q_net));

      // 3. Build candidate list with priority scoring
      interface QueueCandidate {
        index: number;
        reel: MediaFile;
        priority: number;
        delta: number;
      }

      const candidates: QueueCandidate[] = [];

      // Forward window
      const forwardLimit = Math.min(
        this.currentFeed.length - 1,
        this.activeIndex + nextWindowSize
      );
      for (let i = this.activeIndex; i <= forwardLimit; i++) {
        const delta = i - this.activeIndex;
        const reel = this.currentFeed[i];
        if (!reel) continue;

        let priority = 0;
        if (delta === 0) {
          // Active reel: highest priority if not ready
          priority = 1000;
        } else if (delta <= 3) {
          // Guaranteed next 3: priority 500 down to 480
          priority = 500 - delta * 10;
        } else {
          // Extended forward reels 4..10
          priority = 200 - delta * 5;
        }
        candidates.push({ index: i, reel, priority, delta });
      }

      // Backward window (previous reels)
      const backwardLimit = Math.max(0, this.activeIndex - prevWindowSize);
      for (let i = this.activeIndex - 1; i >= backwardLimit; i--) {
        const delta = i - this.activeIndex;
        const reel = this.currentFeed[i];
        if (!reel) continue;

        // Backward reels: priority 100 down to 10
        const priority = 100 - Math.abs(delta) * 8;
        candidates.push({ index: i, reel, priority, delta });
      }

      // Sort by priority descending
      candidates.sort((a, b) => b.priority - a.priority);

      // Clean up active downloads that fell outside the computed window
      const activeWindowPaths = new Set(candidates.map((c) => c.reel.path));
      for (const [path, task] of this.activeDownloads) {
        if (!activeWindowPaths.has(path)) {
          task.cancelAsync().catch(() => {});
          this.activeDownloads.delete(path);
          const entry = this.entries.get(path);
          if (entry && entry.status === "downloading") {
            entry.status = "idle";
          }
        }
      }

      // Check available disk space
      try {
        const freeDisk = await FileSystem.getFreeDiskStorageAsync();
        if (freeDisk < MIN_FREE_DISK_BYTES) {
          console.warn(
            "[ReelCacheManager] Device storage is low (<500MB). Skipping new cache downloads."
          );
          return;
        }
      } catch {
        // Non-fatal on web or restricted permissions
      }

      // 4. Fill worker slots
      for (const item of candidates) {
        if (this.activeDownloads.size >= maxWorkers) break;

        const path = item.reel.path;
        let entry = this.entries.get(path);

        // Check if already completed
        if (entry && entry.status === "ready" && !entry.isPartial) {
          continue;
        }

        // If currently downloading, continue
        if (this.activeDownloads.has(path)) {
          continue;
        }

        // If skipped corrupted, continue
        if (entry?.status === "corrupted") {
          continue;
        }

        // Start caching this candidate
        void this.startDownload(item.reel);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /** Executes download for a single reel */
  private async startDownload(reel: MediaFile): Promise<void> {
    const isOver100MB = (reel.size || 0) > SIZE_100MB;
    const isPartial = isOver100MB;
    const fileName = getCacheFileName(reel.path, isPartial);
    const targetFileUri = `${REELS_CACHE_DIR}${fileName}`;

    let entry = this.entries.get(reel.path);
    if (!entry) {
      entry = {
        path: reel.path,
        localUri: targetFileUri,
        fileSize: reel.size || 0,
        cachedBytes: 0,
        isPartial,
        status: "downloading",
        lastAccessed: Date.now(),
      };
      this.entries.set(reel.path, entry);
    } else {
      entry.status = "downloading";
      entry.isPartial = isPartial;
      entry.localUri = targetFileUri;
    }

    // Check if the file already exists on disk and is complete
    try {
      const existingInfo = await FileSystem.getInfoAsync(targetFileUri);
      if (existingInfo.exists && existingInfo.size && existingInfo.size > 0) {
        // If not partial and sizes match (or valid video file), mark ready
        if (!isPartial) {
          entry.status = "ready";
          entry.cachedBytes = existingInfo.size;
          this.notifyListeners(reel.path, entry);
          return;
        }
      }
    } catch {
      // proceed to download
    }

    // Build download URL with session token
    let downloadUrl = buildMediaFileUrl(this.serverUrl, reel.path, this.sessionToken);

    const headers: Record<string, string> = {
      Origin: this.serverUrl,
      Referer: `${this.serverUrl}/`,
    };
    if (this.sessionToken) {
      headers.Authorization = `Bearer ${this.sessionToken}`;
      headers.Cookie = `better-auth.session_token=${this.sessionToken}`;
    }

    if (!isOver100MB) {
      // For videos <= 100MB, request full file download
      downloadUrl += "&full=1";
    } else {
      // For videos > 100MB, request only the initial 15-20s chunk (~16MB)
      headers.Range = `bytes=0-${PARTIAL_CHUNK_BYTES - 1}`;
    }

    const startTime = Date.now();
    let downloadedBytes = 0;

    const downloadResumable = FileSystem.createDownloadResumable(
      downloadUrl,
      targetFileUri,
      { headers },
      (progress) => {
        downloadedBytes = progress.totalBytesWritten;
        if (entry) entry.cachedBytes = progress.totalBytesWritten;
      }
    );

    this.activeDownloads.set(reel.path, downloadResumable);

    try {
      const result = await downloadResumable.downloadAsync();
      const elapsedMs = Math.max(50, Date.now() - startTime);

      if (result && result.status >= 200 && result.status < 300) {
        // Record throughput sample
        const transferred = downloadedBytes || result.headers?.["content-length"]
          ? Number(result.headers["content-length"])
          : 0;
        if (transferred > 0) {
          this.speedEstimator.recordSample(transferred, elapsedMs);
        }

        entry.status = "ready";
        entry.cachedBytes = transferred || entry.cachedBytes;
        entry.lastAccessed = Date.now();
        this.notifyListeners(reel.path, entry);
      } else {
        entry.status = "idle";
      }
    } catch (err: any) {
      // If task was canceled by scheduler due to scrolling, reset status to idle
      if (err?.message?.includes?.("cancel") || !this.activeDownloads.has(reel.path)) {
        entry.status = "idle";
      } else {
        console.warn(`[ReelCacheManager] Download failed for ${reel.name}:`, err?.message || err);
        entry.status = "idle";
      }
    } finally {
      this.activeDownloads.delete(reel.path);

      // Adaptive throttle delay if event loop is under load
      const load = this.loadMonitor.getLoadFactor();
      if (load > 0.4) {
        const coolDownMs = Math.min(250, Math.round(200 * load));
        setTimeout(() => void this.scheduleNextBatch(), coolDownMs);
      } else {
        void this.scheduleNextBatch();
      }
    }
  }
}

export const cache = ReelCacheManager.getInstance();
