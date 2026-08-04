"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clapperboard, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaStore, type MediaFile } from "@/store/useMediaStore";
import { ReelItem, type ReelItemData } from "@/components/preview/ReelItem";
import { Button } from "@/components/ui/button";

type ReelsFilter = "all" | "favorites";

interface ReelsResponse {
  videos: ReelItemData[];
  total: number;
  hasMore: boolean;
  filter: string;
}

export function ReelsFeed() {
  const { toggleFavorite, fetchFavorites, favorites } = useMediaStore();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<ReelsFilter>("all");
  const [videos, setVideos] = useState<ReelItemData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastScrollTop = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const favoritePaths = useRef(new Set<string>());
  const loadingMoreLock = useRef(false);
  const filterRef = useRef<ReelsFilter>(filter);

  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  // Keep favorite flags in sync with store (async to avoid sync setState-in-effect lint)
  useEffect(() => {
    favoritePaths.current = new Set(
      favorites.filter((f) => f.type === "video").map((f) => f.path)
    );
    const timer = window.setTimeout(() => {
      setVideos((prev) =>
        prev.map((v) => ({
          ...v,
          isFavorite: favoritePaths.current.has(v.path),
        }))
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [favorites]);

  const loadReels = useCallback(
    async (opts: {
      filter: ReelsFilter;
      offset?: number;
      append?: boolean;
      reshuffle?: boolean;
    }) => {
      const { filter: f, offset = 0, append = false, reshuffle = false } = opts;
      if (append) {
        if (loadingMoreLock.current) return;
        loadingMoreLock.current = true;
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
      }

      try {
        const params = new URLSearchParams({
          filter: f,
          limit: "30",
          offset: String(offset),
        });
        if (reshuffle) params.set("reshuffle", "true");

        const res = await fetch(`/api/media/reels?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load reels");
        const data = (await res.json()) as ReelsResponse;

        const mapped = (data.videos || []).map((v) => ({
          ...v,
          type: "video" as const,
          isFavorite: favoritePaths.current.has(v.path) || !!v.isFavorite,
        }));

        setVideos((prev) => (append ? [...prev, ...mapped] : mapped));
        setHasMore(!!data.hasMore);
        setTotal(data.total || mapped.length);
        if (!append) {
          setActiveIndex(0);
          requestAnimationFrame(() => {
            const scroller = scrollerRef.current;
            if (scroller) scroller.scrollTop = 0;
          });
        }
      } catch {
        if (!append) {
          setError("Could not load reels. Scan your media library first.");
          setVideos([]);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        loadingMoreLock.current = false;
      }
    },
    []
  );

  useEffect(() => {
    void fetchFavorites();
  }, [fetchFavorites]);

  // Initial + filter change load (deferred setState path)
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      void loadReels({ filter, reshuffle: false });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [filter, loadReels]);

  // IntersectionObserver to know which reel is active
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || videos.length === 0) return;

    const slides = root.querySelectorAll<HTMLElement>("[data-reel-index]");
    const observer = new IntersectionObserver(
      (entries) => {
        let best: { index: number; ratio: number } | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = Number((entry.target as HTMLElement).dataset.reelIndex);
          if (!Number.isFinite(idx)) continue;
          if (!best || entry.intersectionRatio > best.ratio) {
            best = { index: idx, ratio: entry.intersectionRatio };
          }
        }
        if (best && best.ratio >= 0.55) {
          setActiveIndex(best.index);
        }
      },
      { root, threshold: [0.55, 0.75, 0.9] }
    );

    slides.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [videos]);

  // Prefetch next page near end — triggered from scroll observer via activeIndex
  useEffect(() => {
    if (!hasMore || isLoadingMore || isLoading) return;
    if (activeIndex < videos.length - 4) return;
    if (loadingMoreLock.current) return;

    const timer = window.setTimeout(() => {
      void loadReels({
        filter: filterRef.current,
        offset: videos.length,
        append: true,
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeIndex, videos.length, hasMore, isLoadingMore, isLoading, loadReels]);

  // Auto-hide header on scroll direction
  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const st = el.scrollTop;
    const delta = st - lastScrollTop.current;

    if (Math.abs(delta) > 8) {
      if (delta > 0 && st > 40) {
        setHeaderVisible(false);
      } else if (delta < 0) {
        setHeaderVisible(true);
      }
      lastScrollTop.current = st;
    }

    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (st > 40) {
      hideTimer.current = setTimeout(() => setHeaderVisible(false), 1600);
    } else {
      setHeaderVisible(true);
    }
  };

  const handleToggleFavorite = async (reel: ReelItemData) => {
    const file: MediaFile = {
      id: reel.id,
      name: reel.name,
      path: reel.path,
      folder: reel.folder,
      size: reel.size,
      extension: reel.extension,
      type: "video",
      mimeType: reel.mimeType || "video/mp4",
      modifiedAt: reel.modifiedAt,
    };

    // Optimistic UI
    setVideos((prev) =>
      prev.map((v) =>
        v.path === reel.path ? { ...v, isFavorite: !v.isFavorite } : v
      )
    );

    const ok = await toggleFavorite(file);
    if (!ok) {
      setVideos((prev) =>
        prev.map((v) =>
          v.path === reel.path ? { ...v, isFavorite: !!reel.isFavorite } : v
        )
      );
    } else if (filter === "favorites" && reel.isFavorite) {
      setVideos((prev) => prev.filter((v) => v.path !== reel.path));
    }
  };

  const handleFilterChange = (next: ReelsFilter) => {
    if (next === filter) return;
    setFilter(next);
    setHeaderVisible(true);
  };

  const handleShuffle = () => {
    void loadReels({ filter, reshuffle: true });
  };

  return (
    <div className="reels-root relative h-full w-full bg-black overflow-hidden">
      {/* Top filter bar — Instagram style, auto-hides on scroll */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 z-40 transition-all duration-300 ease-out",
          headerVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-full pointer-events-none"
        )}
      >
        <div className="bg-gradient-to-b from-black/70 via-black/40 to-transparent pt-3 pb-8 px-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 rounded-full bg-black/35 backdrop-blur-md border border-white/10 p-1">
              <button
                type="button"
                onClick={() => handleFilterChange("all")}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-semibold transition-colors",
                  filter === "all"
                    ? "bg-white text-black"
                    : "text-white/85 hover:text-white"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange("favorites")}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-semibold transition-colors",
                  filter === "favorites"
                    ? "bg-white text-black"
                    : "text-white/85 hover:text-white"
                )}
              >
                Favorites
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-[11px] text-white/60 font-mono tabular-nums">
                {total > 0 ? `${Math.min(activeIndex + 1, total)}/${total}` : ""}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleShuffle}
                className="h-8 gap-1.5 rounded-full bg-black/35 backdrop-blur-md border border-white/10 text-white hover:bg-black/50 hover:text-white"
                title="Shuffle reels"
              >
                <RefreshCw className="size-3.5" />
                <span className="text-xs">Shuffle</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black">
          <Loader2 className="size-10 animate-spin text-white/80" />
          <p className="text-sm text-white/60">Loading reels…</p>
        </div>
      )}

      {/* Empty / error */}
      {!isLoading && videos.length === 0 && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <Clapperboard className="size-12 text-white/50 mx-auto" />
          </div>
          <div>
            <p className="text-white font-semibold text-lg">
              {filter === "favorites" ? "No favorite videos yet" : "No videos found"}
            </p>
            <p className="text-white/55 text-sm mt-1.5 max-w-sm">
              {error ||
                (filter === "favorites"
                  ? "Like videos from All reels or the gallery to see them here."
                  : "Add media folders in Settings and scan your library first.")}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void loadReels({ filter, reshuffle: true })}
            className="gap-2"
          >
            <RefreshCw className="size-4" />
            Retry
          </Button>
        </div>
      )}

      {/* Vertical snap scroller */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="reels-scroller h-full w-full overflow-y-scroll overscroll-y-contain snap-y snap-mandatory touch-pan-y"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {videos.map((reel, index) => (
          <div
            key={`${reel.path}-${index}`}
            data-reel-index={index}
            className="h-full w-full snap-start snap-always"
          >
            <ReelItem
              reel={reel}
              isActive={index === activeIndex}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted((m) => !m)}
              onToggleFavorite={handleToggleFavorite}
            />
          </div>
        ))}

        {isLoadingMore && (
          <div className="h-16 flex items-center justify-center bg-black">
            <Loader2 className="size-6 animate-spin text-white/60" />
          </div>
        )}
      </div>
    </div>
  );
}
