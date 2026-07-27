"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  PictureInPicture2,
  Settings,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface VideoPreviewProps {
  src: string;
  title: string;
}

export function VideoPreview({ src, title }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-hide controls after 3s of inactivity while playing
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onLoadedMetadata = () => {
      setDuration(video.duration);
      setErrorMessage(null);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setShowControls(true);
    };
    const onPlay = () => {
      setIsPlaying(true);
      setErrorMessage(null);
    };
    const onPause = () => {
      setIsPlaying(false);
      setShowControls(true);
    };
    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => {
      setIsBuffering(false);
      setErrorMessage(null);
    };
    const onError = () => {
      // Only show error for genuine fatal media errors
      const err = video.error;
      if (err) {
        switch (err.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            // User aborted — not a real error
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            setErrorMessage("Network error while loading video");
            break;
          case MediaError.MEDIA_ERR_DECODE:
            setErrorMessage("Video decoding error");
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            setErrorMessage("Video format not supported by browser");
            break;
          default:
            setErrorMessage("Unable to play video");
        }
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("ended", onEnded);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
    };
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Clear auto-hide timer when paused (handled by onPause/onEnded event listeners above)
  // Controls are shown in onPause and onEnded handlers directly

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleSeek = (value: number | readonly number[]) => {
    if (!videoRef.current) return;
    const newTime = Array.isArray(value) ? value[0] : (value as number);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number | readonly number[]) => {
    if (!videoRef.current) return;
    const newVol = Array.isArray(value) ? value[0] : (value as number);
    videoRef.current.volume = newVol;
    setVolume(newVol);
    setIsMuted(newVol === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.volume = volume || 1;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const handleSpeedChange = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackRate(speed);
  };

  const skipSeconds = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(
      Math.max(0, videoRef.current.currentTime + seconds),
      duration
    );
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {
      // Ignore PiP errors
    }
  };

  const formatTime = (timeInSec: number) => {
    if (isNaN(timeInSec)) return "0:00";
    const hours = Math.floor(timeInSec / 3600);
    const minutes = Math.floor((timeInSec % 3600) / 60);
    const seconds = Math.floor(timeInSec % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skipSeconds(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          skipSeconds(10);
          break;
        case "ArrowUp":
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case "ArrowDown":
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case "m":
          toggleMute();
          break;
        case "f":
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, volume, isMuted, duration]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden select-none"
      style={{ minHeight: isFullscreen ? "100vh" : "100%" }}
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
    >
      {/* Video Element — centered and filling available space */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain cursor-pointer"
        style={{ maxHeight: isFullscreen ? "100vh" : "calc(100dvh - 180px)" }}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        preload="metadata"
        playsInline
      />

      {/* Buffering Spinner Overlay */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <Loader2 className="size-12 text-white/80 animate-spin" />
        </div>
      )}

      {/* Large centered play button when paused (VLC style) */}
      {!isPlaying && !isBuffering && !errorMessage && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <button
            onClick={togglePlay}
            className="pointer-events-auto size-20 sm:size-24 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-200 shadow-2xl"
          >
            <Play className="size-10 sm:size-12 fill-white ml-1" />
          </button>
        </div>
      )}

      {/* Error overlay */}
      {errorMessage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 text-white/70">
          <div className="text-sm font-medium">{errorMessage}</div>
          <div className="text-xs text-white/50 font-mono">{title}</div>
          <button
            onClick={() => {
              setErrorMessage(null);
              if (videoRef.current) {
                videoRef.current.load();
              }
            }}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/20 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Bottom Controls Overlay — gradient fade like VLC/MX */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-linear-to-t from-black/90 via-black/50 to-transparent pt-16 pb-3 px-4 sm:px-6">
          {/* Seek Bar */}
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[11px] text-white/80 font-mono w-14 text-right shrink-0">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1 cursor-pointer"
            />
            <span className="text-[11px] text-white/80 font-mono w-14 shrink-0">
              {formatTime(duration)}
            </span>
          </div>

          {/* Action Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="text-white hover:bg-white/20 size-10 rounded-full"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="size-5" /> : <Play className="size-5 fill-white" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => skipSeconds(-10)}
                className="text-white hover:bg-white/20 size-9 rounded-full"
                title="Rewind 10s"
              >
                <RotateCcw className="size-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => skipSeconds(10)}
                className="text-white hover:bg-white/20 size-9 rounded-full"
                title="Forward 10s"
              >
                <RotateCw className="size-4" />
              </Button>

              {/* Volume */}
              <div className="flex items-center gap-1 ml-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20 size-9 rounded-full"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="size-4" />
                  ) : (
                    <Volume2 className="size-4" />
                  )}
                </Button>
                <div className="w-20 hidden sm:block">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={1}
                    step={0.05}
                    onValueChange={handleVolumeChange}
                    className="cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <span
                className="text-[11px] text-white/60 font-medium truncate max-w-32 hidden md:inline"
                title={title}
              >
                {title}
              </span>

              {/* Speed Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger render={
                  <Button variant="ghost" size="xs" className="text-white hover:bg-white/20 gap-1 text-xs">
                    <Settings className="size-3.5" />
                    <span>{playbackRate}x</span>
                  </Button>
                } />
                <DropdownMenuContent align="end" className="bg-popover">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                    <DropdownMenuItem
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={playbackRate === speed ? "font-bold text-primary" : ""}
                    >
                      {speed}x {speed === 1 && "(Normal)"}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* PiP */}
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePiP}
                className="text-white hover:bg-white/20 size-9 rounded-full"
                title="Picture in Picture"
              >
                <PictureInPicture2 className="size-4" />
              </Button>

              {/* Fullscreen */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20 size-9 rounded-full"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? (
                  <Minimize2 className="size-4" />
                ) : (
                  <Maximize2 className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
