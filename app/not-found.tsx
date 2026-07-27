import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, ArrowLeft, LayoutDashboard } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background text-foreground">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl border border-border/80 bg-card shadow-2xl flex flex-col items-center text-center gap-6 animate-in fade-in-50 zoom-in-95 duration-200">
        {/* 404 Badge Icon */}
        <div className="rounded-full bg-primary/10 p-4 border border-primary/20 text-primary ring-8 ring-primary/5">
          <FileQuestion className="size-10" />
        </div>

        {/* 404 Text Content */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-mono font-bold tracking-widest text-primary uppercase">
            Error 404
          </span>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Page Not Found
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The page, media asset, or dashboard route you are trying to access does not exist or has been moved.
          </p>
        </div>

        {/* Navigation Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
          <Button
            variant="default"
            className="w-full sm:w-1/2"
            render={
              <Link href="/dashboard" className="flex items-center gap-2">
                <LayoutDashboard className="size-4" />
                <span>Dashboard</span>
              </Link>
            }
          />

          <Button
            variant="outline"
            className="w-full sm:w-1/2"
            render={
              <Link href="/" className="flex items-center gap-2">
                <ArrowLeft className="size-4" />
                <span>Home</span>
              </Link>
            }
          />
        </div>
      </div>
    </div>
  );
}
