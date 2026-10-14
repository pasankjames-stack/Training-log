// Health Track — offline cache.
// Serves the app page and fonts from the phone instantly, then quietly
// fetches a fresh copy in the background for next time ("stale while
// revalidate"). Never touches requests to Google Apps Script, so your
// data always comes live from the sheet.
const CACHE = "health-track-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isPage = req.mode === "navigate" && url.origin === self.location.origin;
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!isPage && !isFont) return;   // everything else (incl. the sheet) goes straight to the network

  const cacheP = caches.open(CACHE);
  const fresh = cacheP.then((c) =>
    fetch(req).then((res) => {
      if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone());
      return res;
    })
  );
  e.respondWith(
    cacheP
      .then((c) => c.match(req, { ignoreSearch: true }))
      .then((cached) => cached || fresh)
  );
  e.waitUntil(fresh.catch(() => {}));
});
