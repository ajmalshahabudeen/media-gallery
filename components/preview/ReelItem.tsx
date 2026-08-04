"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
} from "react";
import { Heart, Loader2, Volume2, VolumeX, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaFile } from "@/store/useMediaStore";

export interface ReelItemData extends MediaFile {
  isFavorite?: boolean;
}

interface ReelItemProps {
  reel: ReelItemData;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onToggleFavorite: (reel: ReelItemData) => void;
}

export function ReelItem({
  reel,
  isActive,
  isMuted,
  onToggleMute,
  onToggleFavorite,
}: ReelItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [showSkipHint, setShowSkipHint] = useState<"back" | "fwd" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const src = `/api/media/file?path=${encodeURIComponent(reel.path)}`;

  // Play/pause based on active visibility
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.muted = isMuted;
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Autoplay blocked — stay paused until user taps
        });
      }
    } else {
      video.pause();
      // Reset near start so next view is snappy (timeupdate/pause handlers sync UI)
      if (video.currentTime > 1) {
        try {
          video.currentTime = 0;
        } catch {
          // ignore
        }
      }
    }
  }, [isActive, isMuted]);

  // Keep mute in sync
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const seekBy = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    const next = Math.max(0, Math.min(video.duration, video.currentTime + delta));
    video.currentTime = next;
    setCurrentTime(next);
    setProgress(video.duration > 0 ? next / video.duration : 0);
    setShowSkipHint(delta < 0 ? "back" : "fwd");
    window.setTimeout(() => setShowSkipHint(null), 600);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Ignore if the target is a button (like / mute)
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const now = Date.now();
    const last = lastTapRef.current;

    // Double-tap detection (within 280ms, similar X zone)
    if (last && now - last.time < 280) {
      lastTapRef.current = null;
      const zone = x < width * 0.35 ? "left" : x > width * 0.65 ? "right" : "center";
      if (zone === "left") {
        seekBy(-10);
        return;
      }
      if (zone === "right") {
        seekBy(10);
        return;
      }
      // Center double-tap → like (Instagram style)
      if (!reel.isFavorite) {
        onToggleFavorite(reel);
      }
      setShowHeartBurst(true);
      window.setTimeout(() => setShowHeartBurst(false), 700);
      return;
    }

    lastTapRef.current = { time: now, x };
    // Single tap delayed slightly so double-tap can cancel
    window.setTimeout(() => {
      if (lastTapRef.current && lastTapRef.current.time === now) {
        lastTapRef.current = null;
        togglePlay();
      }
    }, 280);
  };

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    setCurrentTime(video.currentTime);
    setProgress(video.currentTime / video.duration);
  };

  const onLoadedMetadata = (e: SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    setDuration(video.duration || 0);
    setErrorMessage(null);
  };

  const formatTime = (t: number) => {
    if (!Number.isFinite(t) || t < 0) return "0:00";
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div
      className="reels-slide relative h-full w-full snap-start snap-always bg-black overflow-hidden select-none"
      onPointerUp={handlePointerUp}
    >
      <video
        ref={videoRef}
        src={isActive || progress > 0 ? src : undefined}
        className="absolute inset-0 h-full w-full object-contain bg-black"
        playsInline
        loop
        muted={isMuted}
        preload={isActive ? "auto" : "metadata"}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onPlay={() => {
          setIsPlaying(true);
          setErrorMessage(null);
        }}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => {
          setIsBuffering(false);
          setErrorMessage(null);
        }}
        onEnded={() => {
          // loop attribute handles restart; keep state in sync
          setProgress(0);
        }}
        onError={() => {
          const err = videoRef.current?.error;
          if (!err) return;
          if (err.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
            setErrorMessage("Format not supported");
          } else if (err.code === MediaError.MEDIA_ERR_NETWORK) {
            setErrorMessage("Network error");
          } else if (err.code === MediaError.MEDIA_ERR_DECODE) {
            setErrorMessage("Decode error");
          }
        }}
      />

      {/* Gradient overlays (Instagram style) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      {/* Buffering */}
      {isBuffering && isActive && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <Loader2 className="size-10 animate-spin text-white/90" />
        </div>
      )}

      {/* Play icon when paused */}
      {!isPlaying && !isBuffering && isActive && !errorMessage && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="rounded-full bg-black/45 backdrop-blur-sm p-5 border border-white/15">
            <Play className="size-10 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Heart burst on double-tap like */}
      {showHeartBurst && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <Heart className="size-28 text-white fill-white drop-shadow-2xl animate-reel-heart" />
        </div>
      )}

      {/* Skip hint */}
      {showSkipHint && (
        <div
          className={cn(
            "absolute inset-y-0 z-20 flex items-center pointer-events-none",
            showSkipHint === "back" ? "left-6" : "right-6"
          )}
        >
          <div className="rounded-full bg-black/50 px-3 py-2 text-white text-sm font-semibold backdrop-blur-sm border border-white/10">
            {showSkipHint === "back" ? "−10s" : "+10s"}
          </div>
        </div>
      )}

      {/* Error */}
      {errorMessage && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
          <p className="rounded-xl bg-black/70 px-4 py-3 text-sm text-white/90 border border-white/10">
            {errorMessage}
          </p>
        </div>
      )}

      {/* Right action rail — like only (Instagram style) */}
      <div className="absolute right-3 bottom-28 z-30 flex flex-col items-center gap-5">
        <button
          type="button"
          aria-label={reel.isFavorite ? "Unlike" : "Like"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(reel);
            if (!reel.isFavorite) {
              setShowHeartBurst(true);
              window.setTimeout(() => setShowHeartBurst(false), 700);
            }
          }}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="rounded-full bg-black/25 backdrop-blur-sm p-3 border border-white/10 transition-transform group-active:scale-90">
            <Heart
              className={cn(
                "size-7 transition-colors",
                reel.isFavorite ? "fill-red-500 text-red-500" : "text-white fill-transparent"
              )}
            />
          </div>
          <span className="text-[11px] font-semibold text-white drop-shadow-md">
            {reel.isFavorite ? "Liked" : "Like"}
          </span>
        </button>

        <button
          type="button"
          aria-label={isMuted ? "Unmute" : "Mute"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleMute();
          }}
          className="rounded-full bg-black/25 backdrop-blur-sm p-3 border border-white/10 transition-transform active:scale-90"
        >
          {isMuted ? (
            <VolumeX className="size-6 text-white" />
          ) : (
            <Volume2 className="size-6 text-white" />
          )}
        </button>
      </div>

      {/* Bottom meta */}
      <div className="absolute left-0 right-16 bottom-10 z-20 px-4 pointer-events-none">
        <p className="text-white font-semibold text-[15px] leading-snug drop-shadow-md line-clamp-2">
          {reel.name}
        </p>
        {reel.folder ? (
          <p className="text-white/70 text-xs mt-1 truncate drop-shadow-md">{reel.folder}</p>
        ) : null}
        {duration > 0 && (
          <p className="text-white/55 text-[11px] mt-1.5 font-mono tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </p>
        )}
      </div>

      {/* Thin progress bar at very bottom */}
      <div className="absolute inset-x-0 bottom-0 z-30 h-[3px] bg-white/20">
        <div
          className="h-full bg-white transition-[width] duration-100 ease-linear"
          style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
        />
      </div>
    </div>
  );
}
