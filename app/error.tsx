"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error("Unhandled Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background text-foreground">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl border border-border/80 bg-card shadow-2xl flex flex-col items-center text-center gap-6 animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Error Badge Icon */}
        <div className="rounded-full bg-destructive/10 p-4 border border-destructive/20 text-destructive ring-8 ring-destructive/5">
          <AlertTriangle className="size-10" />
        </div>

        {/* Content */}
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Something Went Wrong
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            An unforeseen application error occurred. We have logged this event. You can try refreshing the component or return to the main dashboard.
          </p>
        </div>

        {/* Technical Error Details (if available) */}
        {error.message && (
          <div className="w-full p-3 rounded-lg bg-muted/50 border border-border text-left font-mono text-xs text-muted-foreground break-all max-h-32 overflow-y-auto">
            <span className="font-semibold text-foreground block mb-1">Error Details:</span>
            {error.message}
            {error.digest && <span className="block mt-1 text-[10px] opacity-75">Digest: {error.digest}</span>}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-1/2 gap-2"
            variant="default"
          >
            <RefreshCw className="size-4" />
            <span>Try Again</span>
          </Button>

          <Button
            variant="outline"
            className="w-full sm:w-1/2"
            render={
              <Link href="/dashboard" className="flex items-center gap-2">
                <Home className="size-4" />
                <span>Dashboard</span>
              </Link>
            }
          />
        </div>
      </div>
    </div>
  );
}
