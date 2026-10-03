/* E2E kemas kini service worker (dev/CI sahaja)
   Simulasi: user pakai v3.0.0 → deploy v3.0.1 → buka app → mesej versi baru → Muat semula
   → service worker baru aktif → versi baru digunakan → TIADA reload loop. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const H = require('./helpers');

const FILES = ['index.html', 'style.css', 'core.js', 'app.js', 'content.json', 'manifest.json', 'sw.js', 'version.json',
  'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon-180.png', 'favicon-32.png', 'favicon.ico'];

let staging, server, browser, base;
let VERSI_LAMA, VERSI_BARU;

function deploy(stage, version) {
  /* "deploy" versi baru: naikkan version.json + APP_VERSION + nama cache SW */
  const sentuh = (f) => { const t = new Date(Date.now() + 2000); fs.utimesSync(f, t, t); };   /* mtime mesti > permintaan terakhir (elak 304 palsu) */
  const vp = path.join(stage, 'version.json');
  const vj = JSON.parse(fs.readFileSync(vp, 'utf8'));
  vj.version = version;
  fs.writeFileSync(vp, JSON.stringify(vj, null, 2));
  sentuh(vp);
  const ap = path.join(stage, 'app.js');
  fs.writeFileSync(ap, fs.readFileSync(ap, 'utf8').replace(/const APP_VERSION = '[^']+';/, `const APP_VERSION = '${version}';`));
  sentuh(ap);
  const sw = path.join(stage, 'sw.js');
  fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(/const CACHE = '[^']+';/, `const CACHE = 'kelasnadi-v${version.replace(/\./g, '')}';`));
  sentuh(sw);
}

test.before(async () => {
  staging = fs.mkdtempSync(path.join(os.tmpdir(), 'kn-e2e-'));
  for (const f of FILES) fs.copyFileSync(path.join(H.ROOT, f), path.join(staging, f));
  /* versi "deploy baru" dikira dinamik — supaya ujian tak rosak bila repo naik versi */
  VERSI_LAMA = JSON.parse(fs.readFileSync(path.join(staging, 'version.json'), 'utf8')).version;
  const [a, b, c] = VERSI_LAMA.split('.').map(Number);
  VERSI_BARU = `${a}.${b}.${c + 1}`;
  server = await H.startServer(staging);
  browser = await H.launch();
  base = server.url;
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.close();
  if (staging) fs.rmSync(staging, { recursive: true, force: true });
});

test('kemas kini SW: v3.0.0 → v3.0.1 → Muat semula → aktif, tiada reload loop', { timeout: 90000 }, async () => {
  const page = await H.newPage(browser, { width: 390, height: 844 });
  await H.openApp(page, base + '/');

  /* tunggu SW memasang & mengawal halaman (pemasangan pertama) */
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, { timeout: 30000 });
  const cacheAwal = await page.evaluate(() => caches.keys());
  assert.ok(cacheAwal.length === 1, `satu cache sahaja (dapat: ${cacheAwal})`);
  const versiAwal = await page.evaluate(() => APP_VERSION);
  assert.strictEqual(versiAwal, VERSI_LAMA);
  assert.strictEqual(await page.$eval('#updateBar', (e) => e.hidden), true, 'tiada mesej versi baru pada pemasangan pertama');

  const loadsSebelum = await page.evaluate(() => window.__loads);
  assert.ok(loadsSebelum >= 1);

  /* ---- deploy versi baru ---- */
  deploy(staging, VERSI_BARU);

  /* SENARIO SEBENAR: app lama masih TERBUKA (JS lama sedang berjalan).
     Bila user kembali ke tab (visibilitychange), app semak version.json → mesej muncul.
     (Kalau user reload, dia terus dapat JS baru — jadi mesej tidak perlu.) */
  assert.strictEqual(await page.evaluate(() => APP_VERSION), VERSI_LAMA, 'JS lama masih berjalan');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForFunction(() => !document.getElementById('updateBar').hidden, { timeout: 20000 });
  const bar = await page.$eval('#updateBar', (e) => e.textContent.replace(/\s+/g, ' ').trim());
  assert.match(bar, /Versi baru Kelas Nadi tersedia/);
  assert.match(bar, /Muat semula/);
  assert.strictEqual(await page.evaluate(() => APP_VERSION), VERSI_LAMA, 'app lama masih digunakan sebelum muat semula');

  /* tekan Muat semula */
  await page.click('#updateReload');
  await page.waitForFunction(() => {
    try { return typeof APP_VERSION !== 'undefined' && APP_VERSION !== null; } catch (e) { return false; }
  }, { timeout: 30000 });
  await page.waitForSelector('[data-stream]');
  await page.waitForFunction((v) => APP_VERSION === v, { timeout: 30000 }, VERSI_BARU);
  /* cache SW baru terbentuk semasa install (sebelum/semasa pengaktifan) */
  await page.waitForFunction(async (nama) => (await caches.keys()).some((c) => c === nama), { timeout: 20000 },
    `kelasnadi-v${VERSI_BARU.replace(/\./g, '')}`);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, { timeout: 20000 });

  /* versi baru digunakan, bar hilang, SW baru mengawal, cache baru */
  const selepas = await page.evaluate(async () => ({
    versi: APP_VERSION,
    barHidden: document.getElementById('updateBar').hidden,
    controller: !!navigator.serviceWorker.controller,
    cache: await caches.keys(),
    loads: window.__loads,
    app: document.querySelectorAll('[data-stream]').length,
  }));
  assert.strictEqual(selepas.versi, VERSI_BARU, 'versi baru digunakan');
  assert.strictEqual(selepas.barHidden, true, 'bar kemas kini hilang selepas aktif');
  assert.strictEqual(selepas.controller, true, 'SW masih mengawal');
  assert.ok(selepas.cache.some((c) => c === `kelasnadi-v${VERSI_BARU.replace(/\./g, '')}`), `cache baru aktif (dapat: ${selepas.cache})`);
  assert.strictEqual(selepas.app, 3, 'app berfungsi selepas kemas kini');

  /* tiada reload loop: tambah maksimum 2 muat (reload sendiri + 1) */
  assert.ok(selepas.loads <= loadsSebelum + 3, `muat halaman ${selepas.loads} (sebelum ${loadsSebelum}) — kemungkinan reload loop`);

  /* tunggu beberapa saat & sahkan tiada muat tambahan (loop berterusan) */
  await new Promise((r) => setTimeout(r, 4000));
  const loadsAkhir = await page.evaluate(() => window.__loads);
  assert.strictEqual(loadsAkhir, selepas.loads, `halaman tidak dimuat semula lagi (loop) — ${loadsAkhir} vs ${selepas.loads}`);
  assert.strictEqual(await page.evaluate(() => document.getElementById('updateBar').hidden), true, 'bar kekal tersembunyi (versi sama)');

  /* muat semula biasa: versi sama → TIADA mesej palsu */
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-stream]');
  await new Promise((r) => setTimeout(r, 2500));
  assert.strictEqual(await page.evaluate(() => document.getElementById('updateBar').hidden), true, 'tiada amaran palsu bila versi sama');

  assert.deepStrictEqual(page.__errors, [], 'tiada ralat JS semasa kemas kini');
  await page.close();
});
