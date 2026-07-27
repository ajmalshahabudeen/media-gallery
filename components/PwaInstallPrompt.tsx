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
import copy from "copy-to-clipboard";
import { Download, Smartphone, ShieldCheck, Copy, Check, ExternalLink } from "lucide-react";

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
  const [copiedType, setCopiedType] = useState<"flags" | "origin" | "standalone" | null>(null);
  const [currentOrigin] = useState(() => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "http://192.168.1.101:38479";
  });

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
      setIsGuideOpen(true);
    }
  };

  const copyFlagsUrl = () => {
    copy("chrome://flags/#unsafely-treat-insecure-origin-as-secure");
    setCopiedType("flags");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const copyOriginUrl = () => {
    copy(currentOrigin);
    setCopiedType("origin");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const copyStandaloneFlagUrl = () => {
    copy("chrome://flags/#enable-desktop-pwas-app-icon-shortcuts");
    setCopiedType("standalone");
    setTimeout(() => setCopiedType(null), 2000);
  };

  if (isInstalled) return null;

  return (
    <>
      <Button
        variant="outline"
        size="xs"
        onClick={handleInstallClick}
        className="gap-1.5 border-dashed border-primary/40 text-primary hover:bg-primary/10"
        title="Install Server Gallery PWA App"
      >
        <Download className="size-3.5" />
        <span className="font-semibold text-xs hidden sm:inline">Install App</span>
      </Button>

      <Dialog open={isGuideOpen} onOpenChange={setIsGuideOpen}>
        <DialogContent className="max-w-md p-6 gap-5">
          <DialogHeader className="pt-14">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Smartphone className="size-5" />
              </div>
              <DialogTitle className="text-base font-bold">Enable PWA Installation on HTTP LAN</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              To allow Chrome / Edge to install this PWA over local network HTTP, enable these built-in browser flags once.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 text-xs">
            {/* Step 1: Chrome Flag */}
            <div className="p-3.5 rounded-xl border bg-muted/20 flex flex-col gap-2">
              <div className="flex items-center justify-between font-bold text-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  <span>Step 1: Open Insecure Origin Flag</span>
                </div>
                <Button variant="ghost" size="xs" onClick={copyFlagsUrl} className="h-7 text-[11px] gap-1">
                  {copiedType === "flags" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  <span>{copiedType === "flags" ? "Copied!" : "Copy Flag URL"}</span>
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Paste into Chrome/Edge address bar:
              </p>
              <code className="bg-background px-2.5 py-1.5 rounded border text-[11px] font-mono select-all break-all text-primary">
                chrome://flags/#unsafely-treat-insecure-origin-as-secure
              </code>
            </div>

            {/* Step 2: Add Origin */}
            <div className="p-3.5 rounded-xl border bg-muted/20 flex flex-col gap-2">
              <div className="flex items-center justify-between font-bold text-foreground">
                <div className="flex items-center gap-2">
                  <ExternalLink className="size-4 text-primary" />
                  <span>Step 2: Add Your Server Origin</span>
                </div>
                <Button variant="ghost" size="xs" onClick={copyOriginUrl} className="h-7 text-[11px] gap-1">
                  {copiedType === "origin" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  <span>{copiedType === "origin" ? "Copied!" : "Copy Origin"}</span>
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Enable <strong>Insecure origins treated as secure</strong> and paste:
              </p>
              <code className="bg-background px-2.5 py-1.5 rounded border text-[11px] font-mono select-all break-all text-emerald-500">
                {currentOrigin || "http://192.168.1.101:38479"}
              </code>
            </div>

            {/* Step 3: Standalone App Mode Flag (Android) */}
            <div className="p-3.5 rounded-xl border bg-muted/20 flex flex-col gap-2">
              <div className="flex items-center justify-between font-bold text-foreground">
                <div className="flex items-center gap-2">
                  <Smartphone className="size-4 text-primary" />
                  <span>Step 3: Standalone App Flag (Android)</span>
                </div>
                <Button variant="ghost" size="xs" onClick={copyStandaloneFlagUrl} className="h-7 text-[11px] gap-1">
                  {copiedType === "standalone" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  <span>{copiedType === "standalone" ? "Copied!" : "Copy Flag URL"}</span>
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Removes address bar on Android shortcuts:
              </p>
              <code className="bg-background px-2.5 py-1.5 rounded border text-[11px] font-mono select-all break-all text-amber-500">
                chrome://flags/#enable-desktop-pwas-app-icon-shortcuts
              </code>
            </div>

            {/* Step 4: Relaunch */}
            <div className="p-3.5 rounded-xl border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 flex flex-col gap-1 text-[11px]">
              <span className="font-bold">Step 4: Click Relaunch</span>
              <span>After restarting Chrome/Edge, click <strong>Install App</strong> to install Server Gallery in full-screen app mode!</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
