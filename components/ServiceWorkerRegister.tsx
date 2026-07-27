"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Service worker registered successfully
          if (reg.active) {
            reg.update();
          }
        })
        .catch(() => {
          // SW registration failed silently
        });
    }
  }, []);

  return null;
}
