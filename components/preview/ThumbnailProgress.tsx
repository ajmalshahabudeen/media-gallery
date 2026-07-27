"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, CheckCircle2, Loader2 } from "lucide-react";

interface ProgressData {
  isIndexing?: boolean;
  previewProgress?: {
    isGenerating: boolean;
    total: number;
    completed: number;
    percentage: number;
  };
}

export function ThumbnailProgress() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch("/api/media/progress");
        if (res.ok) {
          const json = await res.json();
          setData(json);

          if (
            json.previewProgress &&
            json.previewProgress.total > 0 &&
            json.previewProgress.completed >= json.previewProgress.total
          ) {
            setShowDone(true);
            setTimeout(() => setShowDone(false), 4000);
          }
        }
      } catch {
        // Fallback on network errors
      }
    };

    fetchProgress();

    const isGenerating = data?.previewProgress?.isGenerating || data?.isIndexing;
    const intervalTime = isGenerating ? 1500 : 5000;

    const timer = setInterval(fetchProgress, intervalTime);
    return () => clearInterval(timer);
  }, [data?.previewProgress?.isGenerating, data?.isIndexing]);

  const p = data?.previewProgress;

  if (!p || (p.total === 0 && !data?.isIndexing && !showDone)) {
    return null;
  }

  if (showDone && (!p.isGenerating || p.completed >= p.total)) {
    return (
      <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium animate-fade-in shadow-xs">
        <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
        <span>Thumbnails Ready (100%)</span>
      </div>
    );
  }

  if (!p.isGenerating && p.percentage >= 100) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1 max-w-30 sm:max-w-xs w-auto sm:w-full px-1.5 sm:px-2">
      <div className="flex items-center justify-between w-full text-[11px] font-mono text-muted-foreground">
        <div className="flex items-center gap-1 font-medium text-foreground truncate">
          {p.isGenerating ? (
            <Loader2 className="size-3 text-purple-400 animate-spin shrink-0" />
          ) : (
            <Sparkles className="size-3 text-amber-400 shrink-0" />
          )}
          <span className="truncate hidden sm:inline">Thumbnails</span>
        </div>
        <span className="font-bold text-purple-400 ml-1 sm:ml-2">
          {p.percentage}% <span className="hidden sm:inline">({p.completed}/{p.total})</span>
        </span>
      </div>

      {/* Progress Bar Line - Hidden on Mobile (<sm), Visible on Desktop (sm+) */}
      <div className="hidden sm:block w-full h-1.5 rounded-full bg-muted/60 overflow-hidden relative shadow-inner">
        <div
          className="h-full bg-linear-to-r from-purple-500 via-indigo-500 to-emerald-400 transition-all duration-500 ease-out rounded-full relative"
          style={{ width: `${Math.max(4, p.percentage)}%` }}
        >
          {p.isGenerating && (
            <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
          )}
        </div>
      </div>
    </div>
  );
}
