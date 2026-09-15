// PWA Service Worker — basic offline-first strategy.
const CACHE_NAME = "clinic-crm-v1";
const PRECACHE = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never cache API calls — always go to network.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(req).catch(() =>
        new Response(
          JSON.stringify({ ok: false, error: "اتصال به سرور برقرار نیست. لطفاً اتصال اینترنت خود را بررسی کنید." }),
          { status: 503, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    return;
  }
  // For navigation requests: network-first, fallback to cached "/".
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => undefined);
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match("/"))),
    );
    return;
  }
  // For static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => undefined);
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    }),
  );
});
