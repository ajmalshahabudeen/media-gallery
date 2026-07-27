const CACHE_NAME = "server-gallery-cache-v3";
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  OFFLINE_URL,
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/apple-touch-icon.png",
  "/favicon-32x32.png",
  "/favicon-16x16.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only intercept GET navigation requests (HTML page loads)
  if (request.method === "GET" && request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Network succeeded - cache a copy for future offline use
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => {
          // Network failed (server IP changed / unreachable)
          // Serve the self-contained static offline page with LAN scanner
          return caches.match(OFFLINE_URL).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Last resort: try to match any cached version of the page
            return caches.match(request).then((r) => {
              return r || new Response(
                '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Server Gallery - Offline</title></head>' +
                '<body style="font-family:system-ui;background:#09090b;color:#fafafa;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:20px">' +
                '<div><h1 style="margin-bottom:12px">Server Unreachable</h1>' +
                '<p style="color:#a1a1aa;margin-bottom:20px">Cannot connect to the server. The IP address may have changed.</p>' +
                '<p style="color:#a1a1aa;font-size:14px">Try navigating to the server\'s new IP address on port 38479.</p></div>' +
                '</body></html>',
                { headers: { "Content-Type": "text/html" } }
              );
            });
          });
        })
    );
  }
});
