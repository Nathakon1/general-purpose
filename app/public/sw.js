// Offline cache + Web Share Target. App files: network first, cache fallback.
// OCR files (large, versioned by package): cache first.
const CACHE = 'jodjai-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './icon.svg'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== 'share-target').map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  if (e.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      const form = await e.request.formData();
      const cache = await caches.open('share-target');
      let i = 0;
      for (const f of form.getAll('slips')) {
        if (!(f instanceof File)) continue;
        await cache.put(new Request(`./shared/${Date.now()}-${i++}-${encodeURIComponent(f.name || 'slip.jpg')}`), new Response(f, { headers: { 'content-type': f.type || 'image/jpeg' } }));
      }
      return Response.redirect('./#/import?shared=1', 303);
    })());
    return;
  }
  if (e.request.method !== 'GET') return;

  if (url.pathname.includes('/ocr/')) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    })));
    return;
  }
  e.respondWith(fetch(e.request).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html'))));
});
