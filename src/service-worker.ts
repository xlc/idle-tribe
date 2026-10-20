// Built separately against the service worker APIs, without DOM globals.
declare const self: ServiceWorkerGlobalScope
declare const PRECACHE_ASSETS: string[]
declare const CACHE_NAME: string

const cachePrefix = 'tribe-app-'

self.addEventListener('install', (event) => {
  // Installation succeeds only after the complete version is available offline.
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(
          PRECACHE_ASSETS.map((path) => new Request(path, { cache: 'reload' })),
        ),
      ),
  )
})

self.addEventListener('activate', (event) => {
  // Let an update wait for existing game windows to close; never reload a run.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(cachePrefix) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  const path = url.pathname
  if (!PRECACHE_ASSETS.includes(path)) return
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(path)
      return cached ?? fetch(request)
    }),
  )
})

export {}
