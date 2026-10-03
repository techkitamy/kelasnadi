/* E2E aliran penuh app (dev/CI sahaja)
   Jalankan: node --test --test-concurrency=1 tests/e2e/app.e2e.test.js
   Chromium sebenar + klik DOM sebenar. Setiap ujian BERDIKARI (setup sendiri) dan ada timeout. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const H = require('./helpers');

let server, browser, page, base;

/* setiap ujian ada timeout supaya suite tak boleh tergantung */
const T = (name, fn) => test(name, { timeout: 40000 }, fn);

async function fresh() {
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-stream]', { timeout: 15000 });
  await page.evaluate(() => { S.active = null; document.getElementById('result').hidden = true; });
  return page;
}

/* set nama + aliran + subjek + topik, kemudian mula kuiz */
async function setup(stream, subject, topic, count) {
  await fresh();
  await page.click('#profileName', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await H.pickStream(page, stream);
  if (subject) await H.pickSubject(page, subject);
  if (topic) await H.pickTopic(page, topic);
  await H.startQuiz(page, count);
}

test.before(async () => {
  server = await H.startServer();
  browser = await H.launch();
  page = await H.newPage(browser, { width: 390, height: 844 });
  base = server.url;
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.close();
});

T('1. app load tanpa console error', async () => {
  await H.openApp(page, base + '/');
  assert.deepStrictEqual(page.__errors, []);
  assert.strictEqual(await page.$$eval('[data-stream]', (e) => e.length), 3);
  assert.ok(await page.evaluate(() => !!window.KelasNadiCore));
  assert.strictEqual(await page.evaluate(() => APP_VERSION), '3.0.0');
});

T('2. pilih Prasekolah → subjek → topik → mula kuiz', async () => {
  await setup('prasekolah', 'abc', 'abc-huruf-besar', 10);
  const st = await H.state(page);
  assert.strictEqual(st.meta.streamId, 'prasekolah');
  assert.strictEqual(st.meta.subjectId, 'abc');
  assert.strictEqual(st.meta.topicId, 'abc-huruf-besar');
  assert.strictEqual(st.meta.count, '10');
  assert.strictEqual(st.items.length, 10);
  assert.ok(st.meta.title.includes('Huruf ABC'));
});

T('3a. jawab MCQ betul', async () => {
  const i = await page.evaluate(() => S.active.items.findIndex((q) => q.t === 'mcq'));
  const val = await H.answer(page, i, true);
  assert.ok(val !== null);
  const st = await H.state(page);
  assert.strictEqual(st.items[i].ok, true);
  assert.strictEqual(await page.$eval('#fb-' + i, (e) => e.textContent), '✅ Betul!');
});

T('3b. jawab MCQ salah', async () => {
  const i = await page.evaluate(() => S.active.items.findIndex((q) => q.t === 'mcq' && !q._done));
  await H.answer(page, i, false);
  const st = await H.state(page);
  assert.strictEqual(st.items[i].ok, false);
  assert.match(await page.$eval('#fb-' + i, (e) => e.textContent), /Belum tepat/);
});

T('3c. taip jawapan (subjek Matematik: soalan dijana)', async () => {
  await setup('sk', 'matematik', null, 10);
  const i = await page.evaluate(() => S.active.items.findIndex((q) => q.t === 'type'));
  assert.ok(i >= 0, 'ada soalan taip');
  const given = await H.answer(page, i, true);
  assert.ok(given !== null);
  const st = await H.state(page);
  assert.strictEqual(st.items[i].ok, true, 'jawapan taip betul diterima');
  assert.strictEqual(await page.$eval('#in-' + i, (e) => e.value), given);
  assert.strictEqual(await page.$eval('#in-' + i, (e) => e.disabled), true, 'input disabled selepas disemak');
});

T('4. selesaikan kuiz → result muncul + progress disimpan', async () => {
  await setup('prasekolah', 'abc', 'abc-huruf-besar', 10);
  await page.evaluate(() => localStorage.removeItem('kelasnadi.progress.v3'));
  const before = await H.state(page);
  await H.answerAll(page, 7);
  await H.waitResult(page);
  const st = await H.state(page);
  assert.match(await page.$eval('#resultText', (e) => e.textContent), /7 betul daripada 10/);
  assert.ok(st.store[before.meta.key], 'progress pada kunci snapshot');
  assert.strictEqual(st.store[before.meta.key].lastRight, 7);
  assert.strictEqual(st.store[before.meta.key].plays, 1);
  assert.strictEqual(st.store[before.meta.key].bestRight, 7);
});

T('5. "Betulkan yang salah" hanya mengandungi soalan salah', async () => {
  await setup('prasekolah', 'abc', 'abc-huruf-besar', 10);
  await H.answerAll(page, 6);
  await H.waitResult(page);
  await page.click('#fixBtn');
  await page.waitForFunction(() => document.getElementById('result').hidden === true);
  const items = await page.evaluate(() => S.active.items.length);
  assert.strictEqual(items, 4, '4 soalan salah diulang');
  assert.strictEqual(await page.evaluate(() => document.getElementById('result').hidden), true);
});

T('6. tukar mode Lembaran ↔ Satu-satu selepas beberapa soalan: state + skor kekal', async () => {
  await setup('prasekolah', 'abc', 'abc-huruf-besar', 10);
  await H.answer(page, 0, true);
  await H.answer(page, 1, false);
  const before = await H.state(page);

  await page.select('#mode', 'focus');
  await page.waitForFunction(() => !!document.querySelector('.focus-nav'));
  const mid = await H.state(page);
  assert.deepStrictEqual(mid.items.slice(0, 2), before.items.slice(0, 2));
  assert.strictEqual(mid.hud.right, before.hud.right);

  const terkunci = await page.evaluate(() => {
    document.getElementById('q-0').scrollIntoView();
    const card = document.getElementById('q-0');
    const opts = Array.from(card.querySelectorAll('.option'));
    if (opts.length) return opts.every((o) => o.disabled);
    const inp = card.querySelector('.answer-input');
    return !!inp && inp.disabled;
  });
  assert.strictEqual(terkunci, true, 'soalan yang dijawab kekal disabled dalam mod fokus');

  await page.select('#mode', 'sheet');
  await page.waitForFunction(() => document.querySelectorAll('.qcard').length > 1);
  const after = await H.state(page);
  assert.deepStrictEqual(after.items.slice(0, 2), before.items.slice(0, 2));
  assert.strictEqual(after.hud.right, before.hud.right);
  assert.match(await page.$eval('#fb-0', (e) => e.textContent), /Betul|Belum tepat/);
});

T('7. tukar stream ketika kuiz aktif → amaran skop → Kekal kuiz lama', async () => {
  await setup('prasekolah', 'abc', null, 10);
  const before = await H.state(page);
  await H.pickStream(page, 'agama');
  let st = await H.state(page);
  assert.strictEqual(st.scopeBar, true, 'bar amaran muncul');
  assert.strictEqual(st.meta.streamId, 'prasekolah', 'kuiz kekal skop asal');
  assert.match(await page.$eval('#scopeText', (e) => e.textContent), /Kuiz sedang berjalan/);

  await page.click('#scopeKeep');
  st = await H.state(page);
  assert.strictEqual(st.scopeBar, false);
  assert.strictEqual(await page.$eval('.stream-card.active', (e) => e.dataset.stream), 'prasekolah', 'selector dipulihkan');
  assert.deepStrictEqual(st.items.slice(0, 3), before.items.slice(0, 3), 'kuiz tak berubah');
});

T('8. tukar stream → Mula kuiz baru (snapshot baharu, kosong)', async () => {
  await setup('prasekolah', 'abc', null, 10);
  await H.answer(page, 0, true);
  await H.pickStream(page, 'agama');
  assert.strictEqual((await H.state(page)).scopeBar, true);
  await page.click('#scopeNew');
  await page.waitForFunction(() => S.active && S.active.meta.streamId === 'agama');
  const st = await H.state(page);
  assert.strictEqual(st.scopeBar, false);
  assert.strictEqual(st.meta.streamId, 'agama');
  assert.strictEqual(st.items.length, 10);
  assert.strictEqual(st.items.filter((i) => i.done).length, 0, 'kuiz baharu kosong');
});

T('9. cetak selepas pilihan berubah → guna skop kuiz aktif + tajuk snapshot', async () => {
  await setup('agama', null, null, 10);
  const st0 = await H.state(page);
  await H.pickStream(page, 'sk');
  await page.click('#printSheet');
  const p = await page.evaluate(() => ({
    prints: window.__prints,
    title: document.querySelector('#print-root .subtitle').textContent,
    items: document.querySelectorAll('#print-root .item').length,
    pages: document.querySelectorAll('#print-root .sheet').length,
  }));
  assert.strictEqual(p.prints, 1);
  assert.strictEqual(p.pages, 2, 'lembaran + skema jawapan');
  assert.strictEqual(p.items, st0.items.length * 2);
  assert.ok(p.title.includes('Sekolah Agama'), `mesti skop kuiz aktif (dapat: ${p.title.slice(0, 60)})`);
  assert.ok(!p.title.includes('Sekolah Kebangsaan'), 'tidak ikut pilihan baru');
});

T('10. cetak sebelum kuiz → guna pilihan semasa', async () => {
  await fresh();
  await H.pickStream(page, 'sk');
  await H.pickSubject(page, 'bm');
  await page.select('#count', '10');
  const sebelum = await page.evaluate(() => window.__prints);
  await page.click('#printSheet');
  const p = await page.evaluate(() => ({
    prints: window.__prints,
    title: document.querySelector('#print-root .subtitle').textContent,
    items: document.querySelectorAll('#print-root .item').length,
  }));
  assert.strictEqual(p.prints, sebelum + 1);
  assert.ok(p.title.includes('Sekolah Kebangsaan'));
  assert.ok(p.title.includes('Bahasa Melayu'));
  assert.strictEqual(p.items, 20, '10 × 2 halaman');
});

T('11. nama anak berubah semasa kuiz → amaran + progress pada snapshot asal', async () => {
  await fresh();
  await page.evaluate(() => localStorage.removeItem('kelasnadi.progress.v3'));
  await page.click('#profileName', { clickCount: 3 });
  await page.type('#profileName', 'Anak Satu');
  await H.pickStream(page, 'prasekolah');
  await H.pickSubject(page, 'nombor');
  await H.startQuiz(page, 10);
  const keyAsli = (await H.state(page)).meta.key;
  assert.ok(keyAsli.startsWith('Anak Satu|'));

  await page.click('#profileName', { clickCount: 3 });
  await page.type('#profileName', 'Anak Dua');
  const st = await H.state(page);
  assert.strictEqual(st.scopeBar, true, 'perubahan nama memberi amaran');
  assert.strictEqual(st.meta.profile, 'Anak Satu');

  await H.answerAll(page, 10);
  await H.waitResult(page);
  const store = (await H.state(page)).store;
  assert.ok(store[keyAsli], 'progress di bawah nama snapshot');
  assert.strictEqual(store[keyAsli].bestRight, 10);
  assert.ok(!Object.keys(store).some((k) => k.startsWith('Anak Dua|')));

  await page.click('#scopeKeep');
  assert.strictEqual(await page.$eval('#profileName', (e) => e.value), 'Anak Satu', 'Kekal kuiz lama pulihkan nama');
  assert.strictEqual((await H.state(page)).scopeBar, false);
});

T('12. refresh page → progress kekal', async () => {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-stream]');
  await page.waitForFunction(() => !!localStorage.getItem('kelasnadi.progress.v3'));
  assert.match(await page.$eval('#progressTitle', (e) => e.textContent), /Anak Satu/);
  const panel = (await page.$eval('#progressList', (e) => e.textContent)).replace(/\s+/g, ' ');
  assert.match(panel, /Terbaik 10\/10/, `panel: ${panel.slice(0, 140)}`);
  const store = JSON.parse(await page.evaluate(() => localStorage.getItem('kelasnadi.progress.v3')));
  const e = Object.values(store)[0];
  assert.strictEqual(e.bestRight, 10);
  assert.strictEqual(e.bestTotal, 10);
  assert.strictEqual(e.bestPercent, 100);
});

T('13. progress 10/10 kemudian 15/20 → best kekal 10/10', async () => {
  assert.ok(await page.evaluate(() => S.active === null || S.active === undefined));
  await H.pickStream(page, 'prasekolah');
  await H.pickSubject(page, 'nombor');
  await page.select('#count', '20');
  await H.startQuiz(page, 20);
  /* bilangan sebenar = min(20, saiz bank skop ini) */
  const total = await page.evaluate(() => S.active.items.length);
  const right = Math.min(15, total - 1);
  await H.answerAll(page, right);
  await H.waitResult(page);
  const store = JSON.parse(await page.evaluate(() => localStorage.getItem('kelasnadi.progress.v3')));
  const key = Object.keys(store).find((k) => k.startsWith('Anak Satu|'));
  const e = store[key];
  assert.strictEqual(e.plays, 2);
  assert.strictEqual(e.bestRight, 10, 'best kekal 10');
  assert.strictEqual(e.bestTotal, 10, 'bestTotal pasangan run sama');
  assert.strictEqual(e.bestPercent, 100);
  assert.strictEqual(e.lastRight, right, 'last = run terakhir');
  assert.strictEqual(e.lastTotal, total, `total mesti bilangan soalan sebenar (${total})`);
  assert.strictEqual(e.lastPercent, Math.round((100 * right) / total));
});

T('14. localStorage rosak → tak crash', async () => {
  const p2 = await H.newPage(browser, { width: 390, height: 844, seedStorage: { 'kelasnadi.progress.v3': '{rosak-bukan-json', 'kelasnadi.mode': '##rosak##' } });
  await H.openApp(p2, base + '/');
  assert.deepStrictEqual(p2.__errors, []);
  assert.strictEqual(await p2.$$eval('[data-stream]', (e) => e.length), 3);
  assert.match(await p2.$eval('#progressList', (e) => e.textContent), /Belum ada rekod/);
  assert.strictEqual(await p2.$eval('#mode', (e) => e.value), 'sheet');
  await H.startQuiz(p2, 10);
  assert.strictEqual(await p2.$$eval('.qcard', (e) => e.length), 10);
  await p2.evaluate(() => localStorage.clear());
  await p2.close();
});

T('15. Semua subjek + satu topik (subjectId=all) + cetak', async () => {
  const p3 = await H.newPage(browser, { width: 390, height: 844 });
  await H.openApp(p3, base + '/');
  await H.pickStream(p3, 'prasekolah');
  await H.pickSubject(p3, 'all');
  const topik = await p3.$$eval('#topic option', (e) => e.map((o) => o.value).filter((v) => v !== 'all'));
  assert.ok(topik.length > 2, 'topik merentas semua subjek disenaraikan');
  const target = topik.find((v) => v.includes('warna-bentuk'));
  await H.pickTopic(p3, target);
  await H.startQuiz(p3, 10);
  const st = await H.state(p3);
  assert.strictEqual(st.meta.subjectId, 'all');
  assert.strictEqual(st.meta.topicId, target);
  assert.ok(st.meta.title.includes('Kenal'), `tajuk merentas subjek: ${st.meta.title}`);
  await p3.click('#printSheet');
  assert.ok((await p3.$eval('#print-root .subtitle', (e) => e.textContent)).includes(st.meta.title.split(' · ').pop()));
  assert.deepStrictEqual(p3.__errors, [], 'tiada ralat JS (regresi bug topicObj)');
  await p3.close();
});

T('16. cetak sebenar (printToPDF) → PDF A4 dijana', async () => {
  const p4 = await H.newPage(browser, { width: 390, height: 844, stubPrint: false });
  await H.openApp(p4, base + '/');
  await H.pickStream(p4, 'agama');
  await p4.select('#count', '10');
  await p4.click('#printSheet');
  const sesi = await p4.createCDPSession();
  const pdf = await sesi.send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true });
  const buf = Buffer.from(pdf.data, 'base64');
  assert.ok(buf.length > 5000, 'PDF dijana');
  assert.ok(buf.toString('latin1').includes('/Type /Page'), 'PDF ada halaman');
  assert.deepStrictEqual(p4.__errors, []);
  await p4.close();
});

T('17. padam kemajuan: pengesahan dua langkah + batal selamat', async () => {
  const p5 = await H.newPage(browser, { width: 390, height: 844 });
  await H.openApp(p5, base + '/');
  /* semai satu rekod untuk profil ini */
  await p5.evaluate(() => {
    localStorage.setItem('kelasnadi.progress.v3', JSON.stringify({
      'tetamu|prasekolah|pra|all|all': { v: 1, label: 'Rekod Ujian', plays: 1, lastRight: 5, lastTotal: 10, lastPercent: 50, lastAt: Date.now(), bestRight: 5, bestTotal: 10, bestPercent: 50, updatedAt: Date.now() },
    }));
  });
  await p5.reload({ waitUntil: 'domcontentloaded' });
  await p5.waitForSelector('[data-stream]');
  await p5.waitForFunction(() => !document.getElementById('progressClear').hidden);
  await p5.click('#progressClear');
  assert.strictEqual(await p5.$eval('#progressConfirmBar', (e) => e.hidden), false, 'pengesahan muncul');
  await p5.click('#progressCancel');
  assert.strictEqual(await p5.$eval('#progressConfirmBar', (e) => e.hidden), true);
  assert.strictEqual(Object.keys(JSON.parse(await p5.evaluate(() => localStorage.getItem('kelasnadi.progress.v3')))).length, 1, 'data kekal selepas batal');
  await p5.click('#progressClear');
  await p5.click('#progressConfirm');
  assert.strictEqual(Object.keys(JSON.parse(await p5.evaluate(() => localStorage.getItem('kelasnadi.progress.v3')))).length, 0, 'data dipadam selepas sahkan');
  assert.match(await p5.$eval('#progressList', (e) => e.textContent), /Belum ada rekod/);
  assert.deepStrictEqual(p5.__errors, []);
  await p5.close();
});

T('18. mute / unmute bunyi', async () => {
  const sebelum = await page.$eval('#soundBtn', (e) => ({ pressed: e.getAttribute('aria-pressed'), text: e.textContent }));
  assert.strictEqual(sebelum.pressed, 'true');
  await page.evaluate(() => document.getElementById('soundBtn').click());
  const lepas = await page.$eval('#soundBtn', (e) => ({ pressed: e.getAttribute('aria-pressed'), text: e.textContent, label: e.getAttribute('aria-label') }));
  assert.strictEqual(lepas.pressed, 'false');
  assert.notStrictEqual(lepas.text, sebelum.text);
  assert.match(lepas.label, /mati/i);
  await page.evaluate(() => document.getElementById('soundBtn').click());
  assert.strictEqual(await page.$eval('#soundBtn', (e) => e.getAttribute('aria-pressed')), 'true');
});

T('19. navigasi papan kekunci asas', async () => {
  await setup('prasekolah', 'abc', null, 10);
  assert.strictEqual(await page.evaluate(() => { const b = document.querySelector('.option'); b.focus(); return document.activeElement === b; }), true);
  await page.keyboard.press('Tab');
  assert.strictEqual(await page.evaluate(() => document.activeElement.classList.contains('option')), true, 'Tab pindah fokus');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => S.active.items.filter((q) => q._done).length === 1);
  /* soalan taip: Enter menghantar */
  await page.evaluate(() => { S.active.items = S.active.items.map((q, i) => i === 1 ? Object.assign({}, q, { t: 'type', p: 'Taip: 1 + 1 = ?', a: '2', o: undefined }) : q); renderQuiz(); });
  await page.click('#in-1');
  await page.type('#in-1', '2');
  await page.keyboard.press('Enter');
  const st = await H.state(page);
  assert.strictEqual(st.items[1].done, true, 'Enter menghantar jawapan taip');
  assert.strictEqual(st.items[1].ok, true);
});

T('20. skop kosong → tiada crash, mesej mesra', async () => {
  const p6 = await H.newPage(browser, { width: 390, height: 844 });
  await H.openApp(p6, base + '/');
  await p6.evaluate(() => { S.ui.topicId = 'topik-hantu'; document.getElementById('start').click(); });
  assert.match(await p6.$eval('#quizArea', (e) => e.textContent), /belum ada soalan/i);
  assert.strictEqual(await p6.$eval('#hud', (e) => e.hidden), true);
  assert.deepStrictEqual(p6.__errors, []);
  await p6.close();
});

T('21. tiada ralat JS sepanjang suite', async () => {
  assert.deepStrictEqual(page.__errors, [], 'console/page error sepanjang suite');
});
