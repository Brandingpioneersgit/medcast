/* MedCasts service worker.
 *
 * Strategies:
 * - HTML navigations: stale-while-revalidate. Serve cached page instantly,
 *   fetch fresh in the background. Falls back to /offline on net fail.
 * - Static asset (JS/CSS/font/image hash-named): cache-first, immutable.
 * - Unsplash cover images: stale-while-revalidate, capped at 60 entries.
 * - Anything else: network-only (let the browser handle it).
 *
 * Bump CACHE_NAME on shape changes so old caches are evicted on activate.
 */
const VERSION = "v3";
const SHELL = `mc-shell-${VERSION}`;
const PAGES = `mc-pages-${VERSION}`;
const IMAGES = `mc-img-${VERSION}`;
const SHELL_URLS = [
  "/en/",
  "/en/offline",
  "/fonts/fraunces-latin-wght-normal.woff2",
  "/fonts/inter-latin-400-normal.woff2",
];
const IMAGE_HOST = "images.unsplash.com";
const MAX_IMAGE_ENTRIES = 60;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(SHELL_URLS).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => ![SHELL, PAGES, IMAGES].includes(n))
          .map((n) => caches.delete(n)),
      ),
    ),
  );
  self.clients.claim();
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Cross-origin: handle Unsplash (cover photos) only.
  if (url.origin !== self.location.origin) {
    if (url.host === IMAGE_HOST) {
      event.respondWith(
        (async () => {
          const cache = await caches.open(IMAGES);
          const cached = await cache.match(request);
          const network = fetch(request).then((res) => {
            if (res.ok) {
              cache.put(request, res.clone());
              trimCache(IMAGES, MAX_IMAGE_ENTRIES);
            }
            return res;
          }).catch(() => cached || Response.error());
          return cached || network;
        })(),
      );
    }
    return;
  }

  // Skip API + sitemap (always network).
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/sitemap")) return;

  // HTML navigations — stale-while-revalidate, fall back to /offline.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGES);
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res.ok && res.headers.get("content-type")?.includes("text/html")) {
              cache.put(request, res.clone());
              trimCache(PAGES, 30);
            }
            return res;
          })
          .catch(async () => cached || (await caches.match("/en/offline")) || Response.error());
        return cached
          ? Promise.race([cached, network]).then((r) => r ?? network)
          : network;
      })(),
    );
    return;
  }

  // Hash-named static assets — cache-first.
  if (
    /\.(js|css|woff2?|png|jpg|jpeg|webp|avif|svg|ico)(\?|$)/.test(url.pathname) ||
    url.pathname.startsWith("/_astro/") ||
    url.pathname.startsWith("/fonts/")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(SHELL).then((cache) => cache.put(request, clone));
            }
            return res;
          }),
      ),
    );
  }
});
