// Shell updates wait for existing tabs to close. Downloaded chapters survive updates.
const CACHE = 'business-simulator-v1'; // Deploy-stamped shell version.
const SCOPE = new URL(self.registration.scope).pathname;
const PREFIX = `business-simulator:${SCOPE}:`;
const SHELL_CACHE = PREFIX + CACHE;
const CONTENT_CACHE = PREFIX + 'content';
const SHELL = [
  './', './index.html', './practice.html', './css/entry.css', './js/entry.js', './js/entrymodel.js', './manifest.webmanifest', './css/styles.css',
  './js/main.js', './js/engine.js', './js/ui.js', './js/carry.js', './js/format.js',
  './js/i18n.js', './js/record.js', './js/scene.js', './js/storage.js',
  './content/ui.json', './content/chapters.json', './content/game.json',
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const content = await caches.open(CONTENT_CACHE);
    // Older releases mixed chapters and shell files in one unscoped cache.
    // Copy only this scope's scenario URLs; leave the old cache itself untouched.
    for (const key of keys.filter(key => /^business-simulator-(?:v\d+|[a-f0-9]+)$/.test(key))) {
      const old = await caches.open(key);
      for (const request of await old.keys()) {
        const url = new URL(request.url);
        if (url.origin === self.location.origin && url.pathname.startsWith(SCOPE + 'content/scenario-') && !await content.match(request)) {
          await content.put(request, await old.match(request));
        }
      }
    }
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== SHELL_CACHE && key !== CONTENT_CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function content(request) {
  const cache = await caches.open(CONTENT_CACHE);
  try {
    const response = await fetch(request);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await cache.put(request, response.clone());
    return response;
  } catch { return await cache.match(request) || Response.error(); }
}
self.addEventListener('message', event => {
  if (event.data?.type !== 'CACHE_CHAPTER') return;
  const url = new URL(event.data.url, self.registration.scope);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE + 'content/')) return;
  event.waitUntil(content(new Request(url)).then(response => {
    event.ports[0]?.postMessage({ ready: response.ok });
  }).catch(() => event.ports[0]?.postMessage({ ready: false })));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/') || request.headers.has('Authorization') || request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE) || url.pathname.endsWith('/build-info.json')) return;
  if (url.pathname.includes('/content/scenario-')) {
    event.respondWith(content(request));
    return;
  }
  event.respondWith(caches.open(SHELL_CACHE).then(async cache => {
    const hit = await cache.match(request);
    if (hit) return hit;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
    return response;
  }));
});
