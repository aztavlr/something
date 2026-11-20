// Offline support. Network-first with a short timeout (fresh updates when online,
// instant cached app in a gym basement with bad signal), cache fallback when offline.
const CACHE = 'ironlog-v2.0.0';
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest',
  'css/base.css', 'css/app.css',
  'js/app.js', 'js/config.js', 'js/sha256.js', 'js/util.js', 'js/data.js', 'js/store.js', 'js/ui.js', 'js/charts.js',
  'js/gate.js', 'js/onboarding.js', 'js/share.js',
  'js/views/home.js', 'js/views/train.js', 'js/views/logger.js', 'js/views/history.js',
  'js/views/progress.js', 'js/views/profile.js', 'js/views/exercise.js', 'js/views/tools.js',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const isPage = req.mode === 'navigate';
    const cached = await cache.match(isPage ? './' : req, { ignoreSearch: true });
    const network = fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') cache.put(isPage ? './' : req, res.clone());
      return res;
    });
    if (!cached) return network.catch(() => cache.match('./'));
    const timeout = new Promise((resolve) => setTimeout(() => resolve(cached), 2500));
    try { return await Promise.race([network, timeout]); } catch (err) { return cached; }
  })());
});
