// Break the Cycle — service worker
// Bump CACHE_VERSION whenever you update index.html or the icons.
const CACHE_VERSION = "btc-v4";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(CORE_ASSETS).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // CRITICAL: never touch cross-origin requests (Supabase API, the JS library CDN, etc).
  // Let them go straight to the network every time — no caching, no interception.
  // This is what keeps cloud data reads always fresh.
  if (url.origin !== self.location.origin) {
    return; // do not call respondWith — browser hits the network normally
  }

  if (req.method !== "GET") return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy).catch(() => {}));
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match("./index.html"))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy).catch(() => {}));
          return res;
        })
        .catch(() => cached);
    })
  );
});
