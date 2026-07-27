"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  RotateCw,
  PictureInPicture2,
  Settings,
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

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onLoadedMetadata = () => setDuration(video.duration);
    const onEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
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
    if (isNaN(timeInSec)) return "00:00";
    const minutes = Math.floor(timeInSec / 60);
    const seconds = Math.floor(timeInSec % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col bg-black rounded-lg overflow-hidden group shadow-xl border border-border/50"
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full max-h-[65vh] object-contain cursor-pointer"
        onClick={togglePlay}
        playsInline
      />

      {/* Video Overlay controls */}
      <div className="bg-linear-to-t from-black/90 via-black/40 to-transparent p-4 flex flex-col gap-3 transition-opacity">
        {/* Seek Bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/80 font-mono w-12 text-right">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="flex-1 cursor-pointer"
          />
          <span className="text-xs text-white/80 font-mono w-12">
            {formatTime(duration)}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="text-white hover:bg-white/20 size-9 rounded-full"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="size-5" /> : <Play className="size-5 fill-white" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => skipSeconds(-10)}
              className="text-white hover:bg-white/20 size-8 rounded-full"
              title="Rewind 10s"
            >
              <RotateCcw className="size-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => skipSeconds(10)}
              className="text-white hover:bg-white/20 size-8 rounded-full"
              title="Forward 10s"
            >
              <RotateCw className="size-4" />
            </Button>

            {/* Volume */}
            <div className="flex items-center gap-2 ml-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-white hover:bg-white/20 size-8 rounded-full"
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
            <span className="text-xs text-white/70 font-medium truncate max-w-37.5 hidden md:inline" title={title}>
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
              className="text-white hover:bg-white/20 size-8 rounded-full"
              title="Picture in Picture"
            >
              <PictureInPicture2 className="size-4" />
            </Button>

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20 size-8 rounded-full"
              title="Toggle Fullscreen"
            >
              <Maximize2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
