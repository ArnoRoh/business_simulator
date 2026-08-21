// The service worker. ADR-0002 requires this app to work offline after the first load,
// and until now it did not — the manifest was there, the caching was not.
//
// Why it matters more here than it would elsewhere: learners pay per megabyte and
// connectivity comes and goes mid-session (AGENTS.md section 3). A chapter is twenty
// turns over half an hour. Losing the network at turn eleven and finding the app blank
// is not a degraded experience, it is a lost session and a lost learner — and their
// progress is already safe in localStorage, so the only thing standing between them and
// finishing is a fetch that need never have happened.
//
// Two rules, and they are chosen for a specific device and a specific bill:
//
//   The shell — HTML, CSS, JS, the manifest — is served CACHE FIRST. It changes only
//   when we deploy, it is what makes the app start at all, and paying for it twice is
//   paying for nothing. A new deploy gets a new CACHE version below, which is what
//   makes the old one disappear.
//
//   Content JSON is served NETWORK FIRST, falling back to cache. Scenario files are
//   corrected often — the bakery's turn 6 was a scripted bankruptcy for a while — and a
//   learner holding a stale chapter is worse than one waiting a moment for a fresh one.
//   The fallback means offline still works; it just prefers the truth when it can
//   reach it.
//
// build-info.json is never cached. It exists so a deploy can be verified by its commit
// rather than by its content (PROJECT_STATE.md), and a cached copy of it would report
// that a deploy succeeded when it had not — which is the exact failure it was added to
// catch.

// Deploy-stamped, do not hand-edit: the Pages workflow rewrites this name with the
// commit SHA on every publish (see "Stamp the build" in .github/workflows/pages.yml).
// That is not cosmetic. The shell is cache-first, so a changed CACHE name is the ONLY
// thing that makes a deploy reach a phone that has visited before: the new sw.js
// bytes trigger the browser's update check, install fills a cache under the new name,
// and activate deletes the old one. The in-repo value below is a placeholder for
// local use — the first CSS fix after this worker shipped deployed cleanly and no
// returning learner received it, because the name had not changed.
const CACHE = 'business-simulator-v1';

// The shell. Everything needed to open the app and reach the chapter list; scenario
// files are deliberately absent, because pre-fetching four chapters would spend a
// learner's data on three they may never open.
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/main.js',
  './js/engine.js',
  './js/ui.js',
  './js/carry.js',
  './js/format.js',
  './js/i18n.js',
  './js/record.js',
  './js/scene.js',
  './js/storage.js',
  './content/ui.json',
  './content/chapters.json',
];

self.addEventListener('install', (event) => {
  // `addAll` rejects if any single request fails, which would leave the app with no
  // worker at all. The shell list is checked by scripts/smoke-app.mjs against what is
  // actually on disk, so a file renamed without updating this list fails there rather
  // than silently disabling offline support for everyone.
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/build-info.json')) return;

  if (url.pathname.includes('/content/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || Response.error())),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => hit || fetch(request).then((response) => {
      if (response && response.ok && response.type === 'basic') {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })),
  );
});
