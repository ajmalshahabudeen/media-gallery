"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard Error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl border border-border/80 bg-card shadow-xl flex flex-col items-center text-center gap-6">
        <div className="rounded-full bg-destructive/10 p-4 border border-destructive/20 text-destructive ring-8 ring-destructive/5">
          <AlertTriangle className="size-10" />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-xl font-bold tracking-tight">
            Dashboard Error Encountered
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            There was a problem loading this section of the dashboard.
          </p>
        </div>

        {error.message && (
          <div className="w-full p-3 rounded-lg bg-muted/50 border border-border text-left font-mono text-xs text-muted-foreground break-all max-h-32 overflow-y-auto">
            {error.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
          <Button onClick={() => reset()} className="w-full sm:w-1/2 gap-2" variant="default">
            <RefreshCw className="size-4" />
            <span>Reload Page</span>
          </Button>

          <Button
            variant="outline"
            className="w-full sm:w-1/2"
            render={
              <Link href="/dashboard" className="flex items-center gap-2">
                <LayoutDashboard className="size-4" />
                <span>Back to Dashboard</span>
              </Link>
            }
          />
        </div>
      </div>
    </div>
  );
}
