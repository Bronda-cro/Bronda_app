// Service worker: deja la app abrir rápido y funcionar sin señal (la parte visual).
const CACHE = "bronda-v2";
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // datos y archivos de Supabase: siempre a la red
  if (url.hostname.endsWith("supabase.co")) return;
  const cacheable = url.origin === self.location.origin || /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|cdn\.tailwindcss\.com|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(url.hostname);
  if (!cacheable) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const fetching = fetch(req).then((res) => { if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone()); return res; }).catch(() => cached);
      return cached || fetching;
    })
  );
});
