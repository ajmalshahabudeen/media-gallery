"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Download, Smartphone, Share, PlusSquare, Monitor, CheckCircle2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(display-mode: standalone)").matches;
    }
    return false;
  });
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Show local network install guide
      setIsGuideOpen(true);
    }
  };

  if (isInstalled) return null;

  return (
    <>
      <Button
        variant="outline"
        size="xs"
        onClick={handleInstallClick}
        className="gap-1.5 border-dashed border-primary/40 text-primary hover:bg-primary/10"
        title="Install Server Gallery PWA App on your device"
      >
        <Download className="size-3.5" />
        <span className="font-semibold text-xs hidden sm:inline">Install App</span>
      </Button>

      <Dialog open={isGuideOpen} onOpenChange={setIsGuideOpen}>
        <DialogContent className="max-w-md p-6 gap-5">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Smartphone className="size-5" />
              </div>
              <DialogTitle className="text-base font-bold">Install Server Gallery PWA</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              How to install Server Gallery as an app on your local network (HTTP / Wi-Fi).
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 text-xs">
            {/* Chrome / Edge Desktop & Android */}
            <div className="p-3.5 rounded-xl border bg-muted/20 flex flex-col gap-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Monitor className="size-4 text-primary" />
                <span>Chrome / Edge (Desktop & Android)</span>
              </div>
              <ol className="list-decimal list-inside text-muted-foreground flex flex-col gap-1 font-mono text-[11px]">
                <li>Click the browser menu (⋮ or ⋯ top right)</li>
                <li>Select <strong>Save & Share</strong> or <strong>More Tools</strong></li>
                <li>Click <strong>Install Server Gallery...</strong> or <strong>Add to Home Screen</strong></li>
              </ol>
            </div>

            {/* iOS Safari */}
            <div className="p-3.5 rounded-xl border bg-muted/20 flex flex-col gap-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Share className="size-4 text-primary" />
                <span>iPhone / iPad (Safari)</span>
              </div>
              <ol className="list-decimal list-inside text-muted-foreground flex flex-col gap-1 font-mono text-[11px]">
                <li>Tap the <strong>Share</strong> button at the bottom bar</li>
                <li>Scroll down and tap <strong>Add to Home Screen</strong> (<PlusSquare className="size-3 inline mx-0.5" />)</li>
                <li>Tap <strong>Add</strong> top right</li>
              </ol>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px]">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>PWA will launch as a standalone app with offline recovery scanner!</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
