// Minimal admin service worker. Its only job is to satisfy Chrome's
// PWA install criteria — the install prompt won't show without an SW
// that has a fetch handler. The fetch strategy is a plain network
// passthrough; offline caching is intentionally left out so we don't
// silently serve stale admin pages while developing.
//
// Scope is implicit `/admin/` because this file lives at /admin/sw.js.

const VERSION = "admin-sw-v1";

self.addEventListener("install", () => {
    // Don't make the user reload twice on first deploy.
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
    // Only intervene on GETs — we don't want to break form submissions
    // or JSON mutations by trying to clone request bodies.
    if (event.request.method !== "GET") return;

    event.respondWith(
        fetch(event.request).catch(
            () =>
                new Response("Offline", {
                    status: 503,
                    statusText: "Offline",
                    headers: { "Content-Type": "text/plain" },
                }),
        ),
    );
});
