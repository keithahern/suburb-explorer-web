/// <reference lib="webworker" />
const sw = self as unknown as ServiceWorkerGlobalScope;

const BASE = (import.meta as any).env?.BASE_URL || '/';
const withBase = (p: string) => `${BASE.replace(/\/$/, '/')}${p.replace(/^\//, '')}`;
const APP_SHELL = [
  BASE,
  withBase('index.html'),
  withBase('manifest.webmanifest'),
  withBase('icons/icon.svg'),
];

const STATIC_CACHE = 'static-v1';
const RUNTIME_CACHE = 'runtime-v1';

sw.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(APP_SHELL)).then(() => sw.skipWaiting())
  );
});

sw.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, RUNTIME_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => sw.clients.claim())
  );
});

// Cache-first for app shell; SWR for tiles and data
sw.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;

  // App shell
  if (url.origin === location.origin) {
    if (APP_SHELL.includes(url.pathname)) {
      e.respondWith(caches.match(req).then((res) => res ?? fetch(req)));
      return;
    }
  }

  // Vector tiles or map assets: stale-while-revalidate
  if (/\.(pbf|mvt|json)$/i.test(url.pathname) || url.hostname.includes('tiles')) {
    e.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req).then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        });
        return cached ?? network;
      })
    );
    return;
  }
});


