"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useMediaStore } from "@/store/useMediaStore";
import { MediaGalleryGrid } from "@/components/preview/MediaGalleryGrid";
import { Button } from "@/components/ui/button";
import { Star, ArrowLeft } from "lucide-react";

export default function FavoritesPage() {
  const { favorites, fetchFavorites } = useMediaStore();

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Star className="size-6 text-amber-400 fill-amber-400" />
            <h1 className="text-2xl font-bold tracking-tight">Favorite Media</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Quick access to your starred favorite media files ({favorites.length} items)
          </p>
        </div>

        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="size-4" />
            <span>Back to Gallery</span>
          </Button>
        </Link>
      </div>

      {/* Media Gallery Grid with GroupBy, SortBy & ViewModes */}
      <MediaGalleryGrid
        files={favorites}
        showFolders={false}
      />
    </div>
  );
}
