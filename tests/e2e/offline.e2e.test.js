/* E2E offline (dev/CI sahaja)
   Offline SEBENAR: pelayan web dimatikan (bukan emulasi rangkaian — emulasi CDP
   tidak terpakai kepada service worker, jadi ia boleh memberi keputusan palsu).
   Aliran: buka online → matikan pelayan → reload root → reload root → kuiz → progress → cetak
   → navigasi laluan tak wujud → hidupkan pelayan → kembali normal. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const H = require('./helpers');

let server, browser, base, page;

test.before(async () => {
  server = await H.startServer();
  browser = await H.launch();
  base = server.url;
  page = await H.newPage(browser, { width: 390, height: 844 });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.close();
});

test('offline sebenar (pelayan dimatikan): reload, kuiz, progress, cetak, kembali online', { timeout: 120000 }, async () => {
  /* 1. ONLINE dahulu: muat app sampai SW mengawal + cache lengkap */
  await H.openApp(page, base + '/');
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, { timeout: 30000 });
  const cache = await page.evaluate(async () => {
    const nama = (await caches.keys()).find((k) => k.startsWith('kelasnadi-v'));
    const c = await caches.open(nama);
    return (await c.keys()).map((k) => k.url.replace(location.origin, ''));
  });
  for (const perlu of ['/', '/index.html', '/core.js', '/app.js', '/style.css', '/content.json', '/version.json']) {
    assert.ok(cache.includes(perlu), `cache mesti ada ${perlu} (dapat: ${cache.join(',')})`);
  }

  /* 2. MATIKAN PELAYAN = offline sebenar */
  await server.stop();

  /* bukti rangkaian benar-benar mati: permintaan baharu mesti GAGAL */
  const rangkaian = await page.evaluate(async () => {
    try {
      await fetch('/bukti-offline-' + Date.now() + '.txt', { cache: 'no-store' });
      return 'hidup';
    } catch (e) { return 'mati'; }
  });
  assert.strictEqual(rangkaian, 'mati', 'rangkaian mesti benar-benar mati (bukti offline sebenar)');
  /* permintaan yang sengaja gagal di atas mencatat console error — itulah buktinya.
     Kosongkan supaya pemeriksaan "tiada ralat JS" di akhir menguji ralat SEBENAR sahaja. */
  page.__errors.length = 0;

  /* 3. reload URL root → mesti dilayan dari cache service worker */
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-stream]', { timeout: 20000 });
  assert.strictEqual(await page.$$eval('[data-stream]', (e) => e.length), 3, 'app render dari cache selepas pelayan mati');
  assert.ok(await page.evaluate(() => !!window.KelasNadiCore), 'core.js dari cache');
  assert.ok(await page.evaluate(() => Array.isArray(S.data.streams) && S.data.streams.length === 3), 'content.json dari cache');

  /* 4. reload sekali lagi pada URL root */
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-stream]', { timeout: 20000 });
  assert.strictEqual(await page.$$eval('[data-stream]', (e) => e.length), 3, 'reload kedua berjaya offline');

  /* 5. buat kuiz penuh + simpan progress (offline) */
  await page.evaluate(() => localStorage.removeItem('kelasnadi.progress.v3'));
  await H.pickStream(page, 'prasekolah');
  await H.pickSubject(page, 'abc');
  await H.startQuiz(page, 10);
  assert.strictEqual(await page.$$eval('.qcard', (e) => e.length), 10, 'kuiz boleh dimulakan offline');
  await H.answerAll(page, 8);
  await H.waitResult(page);
  const simpan = await page.evaluate(() => {
    const betul = S.active.items.filter((q) => q._ok).length;
    const jumlah = S.active.items.length;
    const s = JSON.parse(localStorage.getItem('kelasnadi.progress.v3') || '{}');
    const k = Object.keys(s)[0];
    return k ? { betul, jumlah, disimpanRight: s[k].bestRight, disimpanTotal: s[k].bestTotal, plays: s[k].plays } : null;
  });
  assert.ok(simpan, 'progress disimpan semasa offline');
  assert.strictEqual(simpan.jumlah, 10, 'kuiz offline ada 10 soalan');
  assert.strictEqual(simpan.disimpanRight, simpan.betul, 'markah disimpan = markah sebenar app');
  assert.strictEqual(simpan.disimpanTotal, simpan.jumlah);
  assert.ok(simpan.betul >= 5, `sekurang-kurangnya separuh betul (dapat ${simpan.betul}/${simpan.jumlah})`);
  assert.strictEqual(simpan.plays, 1);

  /* 6. cetak semasa offline */
  await page.click('#printResult');
  const cetak = await page.evaluate(() => ({
    prints: window.__prints,
    items: document.querySelectorAll('#print-root .item').length,
    title: document.querySelector('#print-root .subtitle').textContent,
  }));
  assert.strictEqual(cetak.prints, 1, 'window.print dipanggil');
  assert.ok(cetak.items >= 10, 'lembaran ada item');
  assert.ok(cetak.title.length > 0, 'tajuk cetakan ada');

  /* 7. navigasi ke laluan yang TIDAK pernah dibuka → fallback index.html dari cache */
  await page.goto(base + '/halaman-tak-wujud', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-stream]', { timeout: 20000 });
  assert.strictEqual(await page.$$eval('[data-stream]', (e) => e.length), 3, 'fallback navigasi offline berfungsi');

  /* 8. pelayan hidup semula (port sama) → app normal */
  await server.start();
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-stream]', { timeout: 20000 });
  assert.strictEqual(await page.$$eval('[data-stream]', (e) => e.length), 3, 'app kembali normal selepas online');
  await H.startQuiz(page, 10);
  assert.strictEqual(await page.$$eval('.qcard', (e) => e.length), 10, 'kuiz berfungsi selepas online');

  /* 9. tiada ralat JS sepanjang ujian offline */
  assert.deepStrictEqual(page.__errors, [], `ralat JS semasa offline: ${JSON.stringify(page.__errors)}`);
});
