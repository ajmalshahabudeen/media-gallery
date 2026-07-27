"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Maximize2,
  RefreshCw,
} from "lucide-react";

interface PhotoPreviewProps {
  src: string;
  title: string;
}

export function PhotoPreview({ src, title }: PhotoPreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(prev - 0.25, 0.5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleRotateLeft = () => setRotation((prev) => (prev - 90) % 360);
  const handleRotateRight = () => setRotation((prev) => (prev + 90) % 360);

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsPanning(true);
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPosition({
      x: e.clientX - startPos.x,
      y: e.clientY - startPos.y,
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center bg-black/90 rounded-lg overflow-hidden border border-border/50 select-none min-h-[400px]"
    >
      {/* Top Toolbar */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-black/70 backdrop-blur-md p-1.5 rounded-lg border border-white/10 shadow-lg">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleZoomIn}
          className="text-white hover:bg-white/20"
          title="Zoom In"
        >
          <ZoomIn className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleZoomOut}
          className="text-white hover:bg-white/20"
          title="Zoom Out"
        >
          <ZoomOut className="size-4" />
        </Button>
        <span className="text-xs text-white/80 font-mono px-1">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleRotateLeft}
          className="text-white hover:bg-white/20"
          title="Rotate Left"
        >
          <RotateCcw className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleRotateRight}
          className="text-white hover:bg-white/20"
          title="Rotate Right"
        >
          <RotateCw className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleReset}
          className="text-white hover:bg-white/20"
          title="Reset View"
        >
          <RefreshCw className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleFullscreen}
          className="text-white hover:bg-white/20"
          title="Fullscreen"
        >
          <Maximize2 className="size-4" />
        </Button>
      </div>

      {/* Main Image Container */}
      <div
        className={`w-full h-[60vh] flex items-center justify-center overflow-hidden ${
          zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={title}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transition: isPanning ? "none" : "transform 0.2s ease-out",
          }}
          className="max-w-full max-h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Bottom Info Overlay */}
      <div className="w-full bg-black/80 px-4 py-2 flex items-center justify-between text-xs text-white/70 border-t border-white/10">
        <span className="truncate max-w-sm" title={title}>{title}</span>
        <span>Drag to pan when zoomed</span>
      </div>
    </div>
  );
}
