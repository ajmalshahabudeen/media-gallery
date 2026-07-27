"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function FullScreenLoader() {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      {/* Sidebar Skeleton */}
      <div className="hidden md:flex flex-col w-64 border-r border-border/60 bg-card/50 p-4 shrink-0 justify-between">
        <div className="flex flex-col gap-6">
          {/* Logo Brand Skeleton */}
          <div className="flex items-center gap-3 pb-4 border-b border-border/40">
            <Skeleton className="size-9 rounded-lg shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-3 w-20 rounded-md" />
            </div>
          </div>

          {/* Nav Items Skeletons */}
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-md">
                <Skeleton className="size-5 rounded-md shrink-0" />
                <Skeleton className="h-4 w-32 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* User Footer Skeleton */}
        <div className="pt-4 border-t border-border/40 flex items-center gap-3">
          <Skeleton className="size-9 rounded-full shrink-0" />
          <div className="flex flex-col gap-1.5 flex-1">
            <Skeleton className="h-3.5 w-24 rounded-md" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>
        </div>
      </div>

      {/* Main Content Area Skeleton */}
      <div className="flex flex-col flex-1 h-full min-w-0">
        {/* Header Bar Skeleton */}
        <header className="h-14 border-b border-border/60 bg-card/40 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="h-4 w-32 rounded-md hidden sm:block" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </header>

        {/* Body Content Skeleton */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Search Bar Skeleton */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <Skeleton className="h-10 w-full sm:w-80 rounded-lg" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-20 rounded-lg" />
            </div>
          </div>

          {/* Grid Media Card Skeletons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col rounded-xl border border-border/50 bg-card p-3 space-y-3 shadow-xs"
              >
                <Skeleton className="h-36 w-full rounded-lg" />
                <div className="space-y-2 pt-1">
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-3 w-16 rounded-md" />
                    <Skeleton className="h-3 w-12 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default FullScreenLoader;
