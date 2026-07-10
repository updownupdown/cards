const CACHE_NAME = "solo-suite-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.json",
  "./favicon.ico",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-1024.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png",
  "./icon-1024-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {
        // Cache warmup is best effort.
      }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (data && data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Content-hashed resources are immutable: Expo fingerprints their filenames on
// every export (e.g. Scoundrel.c6c46ac5....png, entry-64ef....js), so a change
// always produces a new URL. These are safe to serve cache-first forever, which
// means large assets (backgrounds, thumbnails, card backs, fonts) are only ever
// downloaded once and load instantly on subsequent visits and offline.
//   - /_expo/static/ : JS + CSS bundles
//   - /assets/       : images and fonts pulled in via require()
function isImmutableAsset(pathname) {
  return pathname.includes("/_expo/static/") || pathname.includes("/assets/");
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    if (request.mode === "navigate") {
      const offlineFallback = await cache.match(
        new URL("./offline.html", self.registration.scope).toString(),
      );
      if (offlineFallback) {
        return offlineFallback;
      }
    }

    return new Response("<h1>Offline</h1><p>Reconnect and retry.</p>", {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Immutable, content-hashed bundles and assets are served cache-first so
  // large files are never re-downloaded and load instantly (also offline).
  if (isImmutableAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // The small, mutable app shell (route HTML, manifest.json, favicon and the
  // app icons) is served network-first so installed users automatically
  // pick up new games, updated icons, and other content whenever they are
  // online. The cache is only used as an offline fallback.
  event.respondWith(networkFirst(request));
});
