const CACHE_PREFIX = 'idealab-mec-shell-';
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const OFFLINE_ICONS = ['/brand/app-icon-192.png', '/brand/app-icon-512.png'];
const SHELL_FILES = [
  '/offline.html',
  '/offline.css',
  ...OFFLINE_ICONS,
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL_FILES);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  let shellAsset = null;
  if (request.destination === 'style' && url.pathname === '/offline.css') shellAsset = '/offline.css';
  else if (request.destination === 'image' && OFFLINE_ICONS.includes(url.pathname)) shellAsset = url.pathname;
  if (shellAsset) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache =>
      (await cache.match(shellAsset)) || fetch(request)));
    return;
  }

  if (request.mode !== 'navigate') return;

  event.respondWith(fetch(request).catch(async () => {
    const shell = await caches.open(CACHE_NAME);
    return (await shell.match('/offline.html')) || Response.error();
  }));
});
