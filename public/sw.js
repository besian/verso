// fletora. service worker: makes the site installable and quick to reopen.
// Pages: network first, falling back to the cached app when offline.
// Built assets (hashed names) and page images (immutable URLs): cache first.
const VERSION = 'v4', APP = 'verso-app-' + VERSION, IMG = 'verso-img-' + VERSION, MAX_IMAGES = 400;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== APP && k !== IMG).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_IMAGES; i++) await cache.delete(keys[i]);
}
async function cacheFirst(req, name) {
  const cache = await caches.open(name), hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') { cache.put(req, res.clone()); if (name === IMG) trim(cache); }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(APP).then(c => c.put('/', copy)); return res; }).catch(() => caches.match('/')));
  } else if (url.origin === location.origin && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/fonts/'))) {
    e.respondWith(cacheFirst(req, APP));
  } else if (url.hostname === 'firebasestorage.googleapis.com' && url.searchParams.get('alt') === 'media') {
    e.respondWith(cacheFirst(req, IMG));
  }
});
