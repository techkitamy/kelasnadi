/* Kelas Nadi — service worker (v4)
   Strategi: NETWORK-FIRST + precache yang tahan 304.
   - JANGAN kembali ke cache-first: pengguna akan tersekat pada versi lama.
   - Precache mesti guna { cache: 'reload' } supaya dapat respons 200 penuh,
     bukan 304 (respons 304 dulu ditolak → index.html & ikon tak masuk cache,
     menyebabkan app gagal dibuka offline).
   Jangan tukar senarai ASSETS tanpa mengemas kini tests/test_assets.py
*/
const CACHE = 'kelasnadi-v5';
const ASSETS = [
  './', './index.html', './style.css', './core.js', './app.js', './content.json', './manifest.json',
  './version.json',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon-180.png', './favicon-32.png',
];

async function precache() {
  const c = await caches.open(CACHE);
  await Promise.all(ASSETS.map(async (url) => {
    try {
      const res = await fetch(url, { cache: 'reload' });
      if (res && res.ok) await c.put(url, res);
    } catch (e) { /* offline semasa install — runtime cache akan isi kemudian */ }
  }));
}

self.addEventListener('install', (e) => {
  /* JANGAN skipWaiting di sini: biar versi baru MENUNGGU supaya app boleh
     tunjuk "Versi baru tersedia" dengan jujur (elak amaran palsu). */
  e.waitUntil(precache());
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data && e.data.type === 'VERSION' && e.ports && e.ports[0]) e.ports[0].postMessage({ cache: CACHE });
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let same = false;
  try { same = new URL(req.url).origin === self.location.origin; } catch (err) { same = false; }
  if (!same) return;   /* tiada permintaan pihak ketiga — privasi */

  const fallback = async () => {
    const hit = await caches.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (hit) return hit;
    if (req.mode === 'navigate') {
      return (await caches.match('./')) || (await caches.match('./index.html'));
    }
    return Response.error();
  };

  e.respondWith(
    /* cache: 'no-cache' = wajib semak semula dengan pelayan (elak CSS/JS basi
       daripada cache HTTP pelayar; python http.server tiada Cache-Control). */
    fetch(req, { cache: 'no-cache' })
      .then(async (res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          const c = await caches.open(CACHE);
          c.put(req, copy);
          return res;
        }
        /* 304 / respons tak ok: jangan hantar respons tak boleh guna kepada halaman.
           Cuba cache kita, kalau tiada, paksa ambilan penuh. */
        const hit = await caches.match(req, { ignoreSearch: req.mode === 'navigate' });
        if (hit) return hit;
        try {
          const fresh = await fetch(req, { cache: 'reload' });
          if (fresh && fresh.ok) {
            const c2 = await caches.open(CACHE);
            c2.put(req, fresh.clone());
          }
          return fresh;
        } catch (err) {
          return res;
        }
      })
      .catch(fallback)
  );
});
