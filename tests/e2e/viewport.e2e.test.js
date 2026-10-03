/* E2E viewport (dev/CI sahaja): tiada overflow, butang tak terpotong, Jawi kemas,
   bar tak menutup UI, HUD sticky tak menghalang soalan. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const H = require('./helpers');

let server, browser, base;

const VIEWPORTS = [
  { name: '360x800 (Android kecil)', width: 360, height: 800 },
  { name: '390x844 (iPhone 12/13)', width: 390, height: 844 },
  { name: '412x915 (Pixel 7)', width: 412, height: 915 },
  { name: '768x1024 (tablet portrait)', width: 768, height: 1024 },
  { name: '1280x800 (desktop)', width: 1280, height: 800 },
];

test.before(async () => {
  server = await H.startServer();
  browser = await H.launch();
  base = server.url;
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.close();
});

for (const vp of VIEWPORTS) {
  test(`viewport ${vp.name}`, { timeout: 60000 }, async () => {
    const page = await H.newPage(browser, { width: vp.width, height: vp.height });
    await H.openApp(page, base + '/');

    /* 1. tiada overflow mendatar pada halaman utama */
    const overflow = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      win: window.innerWidth,
    }));
    assert.ok(overflow.doc <= overflow.win + 1, `overflow mendatar: doc=${overflow.doc} win=${overflow.win}`);

    /* mula kuiz dengan campuran soalan Jawi (RTL) + Rumi */
    await H.pickStream(page, 'agama');
    await H.pickSubject(page, 'jawi');
    await H.startQuiz(page, 15);

    /* 2. tiada overflow selepas kuiz bermula (kad + pilihan Jawi) */
    const overflow2 = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
    assert.ok(overflow2.doc <= overflow2.win + 1, `overflow selepas kuiz: doc=${overflow2.doc} win=${overflow2.win}`);

    /* 3. semua butang penting dalam viewport & cukup besar */
    const buttons = await page.evaluate(() => {
      const out = [];
      const nodes = document.querySelectorAll('#start, #printSheet, #printTrace, #check, #next, .option, #soundBtn, #printTop, .inline-check');
      nodes.forEach((b) => {
        const r = b.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;               /* tersembunyi: abaikan */
        if (getComputedStyle(b).display === 'none') return;
        out.push({ id: b.id || b.className, top: Math.round(r.top), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) });
      });
      return out;
    });
    assert.ok(buttons.length > 0, 'ada butang untuk diperiksa');
    for (const b of buttons) {
      assert.ok(b.left >= -1 && b.right <= vp.width + 1, `butang ${b.id} terkeluar viewport (${b.left}..${b.right} daripada ${vp.width})`);
      assert.ok(b.h >= 24, `butang ${b.id} terlalu kecil (h=${b.h})`);
    }

    /* 4. Jawi tidak overflow dalam bekasnya */
    const jawi = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('.jawi, [lang="ms-Arab"]').forEach((el) => {
        out.push({ tag: el.tagName, sw: el.scrollWidth, cw: el.clientWidth, right: Math.round(el.getBoundingClientRect().right), win: window.innerWidth });
      });
      return out;
    });
    assert.ok(jawi.length > 0, 'ada elemen Jawi untuk diperiksa');
    for (const j of jawi) {
      assert.ok(j.sw <= j.cw + 1 || j.cw === 0, `Jawi overflow dalam bekas: scrollWidth=${j.sw} clientWidth=${j.cw}`);
      assert.ok(j.right <= vp.width + 1, `elemen Jawi terkeluar viewport (right=${j.right}, win=${j.win})`);
    }

    /* 5. HUD sticky tidak menghalang soalan yang dijawab */
    await page.evaluate(() => {
      const target = document.querySelectorAll('.qcard')[4] || document.querySelector('.qcard');
      target.scrollIntoView({ block: 'center' });
    });
    const lapis = await page.evaluate(() => {
      const hud = document.getElementById('hud').getBoundingClientRect();
      const card = document.querySelectorAll('.qcard')[4] || document.querySelector('.qcard');
      const r = card.getBoundingClientRect();
      return { hudBottom: Math.round(hud.bottom), cardTop: Math.round(r.top), cardVisible: r.height > 0 };
    });
    assert.ok(!lapis.cardVisible || lapis.cardTop >= lapis.hudBottom - 1,
      `kad soalan tertutup HUD sticky (cardTop=${lapis.cardTop}, hudBottom=${lapis.hudBottom})`);

    /* 6. bar amaran skop tidak menutup HUD / kad soalan */
    await page.click('[data-stream="sk"]');
    await page.waitForFunction(() => !document.getElementById('scopeBar').hidden);
    const barLapis = await page.evaluate(() => {
      const bar = document.getElementById('scopeBar').getBoundingClientRect();
      const hud = document.getElementById('hud').getBoundingClientRect();
      const btn = document.getElementById('scopeNew').getBoundingClientRect();
      const overlap = !(bar.bottom <= hud.top + 1 || bar.top >= hud.bottom - 1);
      return { overlap, barH: Math.round(bar.height), btnH: Math.round(btn.height), btnTop: Math.round(btn.top) };
    });
    assert.strictEqual(barLapis.overlap, false, 'bar skop bertindih dengan HUD');
    assert.ok(barLapis.btnH >= 24, 'butang bar skop cukup besar');
    assert.ok(barLapis.barH > 0, 'bar skop kelihatan');

    /* 7. tiada ralat JS / console pada viewport ini */
    assert.deepStrictEqual(page.__errors, [], `ralat pada ${vp.name}`);
    await page.close();
  });
}
