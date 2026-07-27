"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, VolumeX, Music } from "lucide-react";

interface AudioPreviewProps {
  src: string;
  title: string;
}

export function AudioPreview({ src, title }: AudioPreviewProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (value: number | readonly number[]) => {
    if (!audioRef.current) return;
    const newTime = Array.isArray(value) ? value[0] : (value as number);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number | readonly number[]) => {
    if (!audioRef.current) return;
    const newVol = Array.isArray(value) ? value[0] : (value as number);
    audioRef.current.volume = newVol;
    setVolume(newVol);
    setIsMuted(newVol === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 1;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (timeInSec: number) => {
    if (isNaN(timeInSec)) return "00:00";
    const minutes = Math.floor(timeInSec / 60);
    const seconds = Math.floor(timeInSec % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-linear-to-br from-emerald-950/40 via-card to-background rounded-xl border border-emerald-500/20 shadow-lg">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Audio Icon & Wave graphic */}
      <div className="flex flex-col items-center justify-center gap-4 py-6">
        <div className="size-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/30 animate-pulse">
          <Music className="size-10" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-base truncate max-w-md">{title}</h3>
          <p className="text-xs text-muted-foreground">Audio Track</p>
        </div>

        {/* Simulated Waveform Visualizer */}
        <div className="flex items-center gap-1 h-12 my-2">
          {Array.from({ length: 28 }).map((_, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-300 ${
                isPlaying
                  ? "bg-emerald-500 animate-bounce"
                  : "bg-emerald-500/30"
              }`}
              style={{
                height: isPlaying
                  ? `${Math.sin(i + currentTime) * 40 + 50}%`
                  : "30%",
                animationDelay: `${(i % 5) * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Player Controls */}
      <div className="flex flex-col gap-4">
        {/* Timeline */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground w-12 text-right">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="flex-1 cursor-pointer"
          />
          <span className="text-xs font-mono text-muted-foreground w-12">
            {formatTime(duration)}
          </span>
        </div>

        {/* Buttons Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="size-9 rounded-full"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="size-4" />
              ) : (
                <Volume2 className="size-4" />
              )}
            </Button>
            <div className="w-24">
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.05}
                onValueChange={handleVolumeChange}
                className="cursor-pointer"
              />
            </div>
          </div>

          <Button
            onClick={togglePlay}
            size="icon"
            className="size-12 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
          >
            {isPlaying ? <Pause className="size-6" /> : <Play className="size-6 fill-white ml-0.5" />}
          </Button>

          <div className="w-28 text-right text-xs text-muted-foreground">
            {isPlaying ? "Playing..." : "Paused"}
          </div>
        </div>
      </div>
    </div>
  );
}
