// Only public assets enter this cache. Never cache application data or API responses.
const CACHE = 'business-portal-v1';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './model.js', './strings.json', '../js/i18n.js', '../js/storage.js'];
const urls = ASSETS.map(path => new URL(path, self.registration.scope).href);
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(c => c.addAll(urls))));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('business-portal-') && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.headers.has('Authorization') || !urls.includes(event.request.url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return await cache.match(event.request) || fetch(event.request);
  })());
});
