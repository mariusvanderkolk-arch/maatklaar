// Eenvoudige service worker: app-shell offline beschikbaar.
// De testversie (/maatklaar-test/) draait op hetzelfde domein en krijgt een eigen cache.
const TEST = self.location.pathname.includes('/maatklaar-test/')
const CACHE = TEST ? 'maatklaar-test-v1' : 'maatklaar-v1'
const VAN_MIJ = (k) => (TEST ? k.startsWith('maatklaar-test') || k.startsWith('slimmer-wonen-test') : !k.startsWith('maatklaar-test') && !k.startsWith('slimmer-wonen-test'))

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest'])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && VAN_MIJ(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return
  // video's niet via de service worker (range-requests, groot bestand)
  if (new URL(req.url).pathname.endsWith('.mp4')) return
  if (req.mode === 'navigate') {
    // netwerk eerst, val terug op de cache
    e.respondWith(
      fetch(req)
        .then((res) => {
          const kopie = res.clone()
          caches.open(CACHE).then((c) => c.put('./index.html', kopie))
          return res
        })
        .catch(() => caches.match('./index.html')),
    )
    return
  }
  // statische bestanden: cache eerst
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const kopie = res.clone()
            caches.open(CACHE).then((c) => c.put(req, kopie))
          }
          return res
        }),
    ),
  )
})

// Melding "offerte getekend": tik opent (of focust) de app op de juiste offerte
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const doel = new URL(e.notification.data?.url || './', self.registration.scope).href
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lijst) => {
      const open = lijst.find((c) => c.url.startsWith(self.registration.scope))
      if (open) return open.navigate(doel).then((c) => (c || open).focus())
      return self.clients.openWindow(doel)
    }),
  )
})
