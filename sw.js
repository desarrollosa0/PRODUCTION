// Servicio de la app: guarda lo básico para abrir rápido. NUNCA guarda datos de Supabase.
const V = "produccion-v3";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./icon-180.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  // Datos, sesión y archivos de Supabase: siempre directo a internet.
  if (u.hostname.endsWith("supabase.co") || u.hostname.endsWith("supabase.in")) return;

  // Archivos de la propia app: primero internet (para recibir actualizaciones), si no hay red, la copia guardada.
  if (u.origin === location.origin) {
    e.respondWith(
      fetch(r)
        .then((res) => {
          if (res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put(r, cp)); }
          return res;
        })
        .catch(() => caches.match(r).then((m) => m || caches.match("./index.html")))
    );
    return;
  }

  // Librerías externas (gráficas, PDF, Excel...): usa la copia guardada y la renueva en segundo plano.
  if (u.hostname === "cdnjs.cloudflare.com" || u.hostname === "cdn.jsdelivr.net") {
    e.respondWith(
      caches.match(r).then((m) => {
        const net = fetch(r)
          .then((res) => {
            if (res.ok || res.type === "opaque") { const cp = res.clone(); caches.open(V).then((c) => c.put(r, cp)); }
            return res;
          })
          .catch(() => m);
        return m || net;
      })
    );
  }
});
