/* Kelas Nadi — pembantu E2E (dev/CI sahaja)
   - pelayan statik sendiri (Last-Modified + 304, hampir sama dengan python http.server / GitHub Pages)
   - lancar Chromium (guna Chromium sedia ada; PUPPETEER_EXECUTABLE_PATH / CHROME_PATH boleh override)
   - stub window.print untuk mengira panggilan cetakan
   - kumpul console error, pageerror dan dialog
*/
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..', '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

/* ------------------------------------------------------------- Chromium */
function findChrome() {
  const fromEnv = [process.env.PUPPETEER_EXECUTABLE_PATH, process.env.CHROME_PATH, process.env.CHROME_BIN];
  for (const p of fromEnv) if (p && fs.existsSync(p)) return p;

  const found = [];
  const cache = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (fs.existsSync(cache)) {
    for (const dir of fs.readdirSync(cache)) {
      if (!dir.startsWith('chromium')) continue;
      for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome', 'chrome-headless-shell-linux64/chrome-headless-shell']) {
        const p = path.join(cache, dir, sub);
        if (fs.existsSync(p)) found.push(p);
      }
    }
  }
  found.push('/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable');
  const hit = found.find((p) => fs.existsSync(p));
  if (!hit) throw new Error('Chromium tak dijumpai. Set PUPPETEER_EXECUTABLE_PATH.');
  return hit;
}

async function launch(opts = {}) {
  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--mute-audio', '--no-first-run'],
    ...opts,
    executablePath: findChrome(),
  });
}

/* --------------------------------------------------------------- pelayan */
function startServer(rootDir = ROOT) {
  const handler = (req, res) => {
    let p;
    try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); res.end(); return; }
    let file = path.join(rootDir, p);
    if (!file.startsWith(rootDir)) { res.writeHead(403); res.end('haram'); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404</h1>');
      return;
    }
    const stat = fs.statSync(file);
    res.setHeader('Last-Modified', stat.mtime.toUTCString());
    const ims = req.headers['if-modified-since'];
    if (ims && new Date(ims).getTime() >= Math.floor(stat.mtimeMs / 1000) * 1000) {
      res.writeHead(304);
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': stat.size });
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(file).pipe(res);
  };

  let current = http.createServer(handler);
  let port = 0;
  const listen = (p) => new Promise((resolve) => {
    current.listen(p, '127.0.0.1', () => { port = current.address().port; resolve(); });
  });
  return listen(0).then(() => ({
    url: `http://127.0.0.1:${port}`,
    get port() { return port; },
    /* stop = OFFLINE SEBENAR (port sama bila start semula) */
    stop: () => new Promise((r) => { const s = current; current = null; s.close(() => r()); }),
    start: async () => { if (!current) current = http.createServer(handler); await listen(port); },
    close: () => new Promise((r) => { const s = current; current = null; if (s) s.close(() => r()); else r(); }),
  }));
}

/* ------------------------------------------------------------------ page */
async function newPage(browser, { width = 390, height = 844, stubPrint = true, seedStorage = null } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 700, hasTouch: width < 700 });
  const errors = [];
  const reqFailed = [];
  const dialogs = [];
  page.__errors = errors;
  page.__reqFailed = reqFailed;
  page.__dialogs = dialogs;
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('dialog', async (d) => { dialogs.push(d.message()); await d.accept().catch(() => {}); });
  page.on('requestfailed', (r) => {
    /* dipisahkan: offline memang patut gagal, jadi ujian offline boleh tapis */
    reqFailed.push(`${r.url()} ${r.failure() && r.failure().errorText}`);
  });
  await page.evaluateOnNewDocument((seed, stub) => {
    try {
      const n = Number(sessionStorage.getItem('__loads') || 0) + 1;
      sessionStorage.setItem('__loads', String(n));
      window.__loads = n;
    } catch (e) { window.__loads = 0; }
    window.__prints = 0;
    if (stub) window.print = function () { window.__prints++; };
    if (seed) for (const k of Object.keys(seed)) { try { localStorage.setItem(k, seed[k]); } catch (e) {} }
  }, seedStorage, stubPrint);
  return page;
}

const sel = (id) => `#${id}`;

async function openApp(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-stream]', { timeout: 15000 });
  await page.waitForFunction(() => window.KelasNadiCore && typeof S !== 'undefined', { timeout: 15000 });
}

async function pickStream(page, id) {
  await page.click(`[data-stream="${id}"]`);
  await page.waitForFunction((sid) => S.ui && S.ui.streamId === sid, { timeout: 8000 }, id);
}

async function pickSubject(page, id) {
  await page.select(sel('subject'), id);
  await page.waitForFunction((sid) => S.ui.subjectId === sid, { timeout: 8000 }, id);
}

async function pickTopic(page, id) {
  await page.select(sel('topic'), id);
  await page.waitForFunction((tid) => S.ui.topicId === tid, { timeout: 8000 }, id);
}

async function startQuiz(page, count) {
  if (count) await page.select(sel('count'), String(count));
  await page.click(sel('start'));
  await page.waitForFunction(() => S.active && S.active.items.length > 0, { timeout: 8000 });
  await page.waitForSelector('.qcard');
}

/* jawab soalan ke-i (betul atau salah) melalui klik DOM sebenar */
async function answer(page, i, correct = true) {
  return page.evaluate((idx, wantCorrect) => {
    const q = S.active.items[idx];
    const card = document.getElementById('q-' + idx);
    if (!q || !card || q._done) return null;
    const opts = Array.from(card.querySelectorAll('.option'));
    if (opts.length) {
      const chosen = wantCorrect ? opts.find((o) => o.dataset.val === q.a) : opts.find((o) => o.dataset.val !== q.a);
      const btn = chosen || opts[0];
      btn.click();
      return btn.dataset.val;
    }
    const inp = card.querySelector('.answer-input');
    if (!inp) return null;
    const val = wantCorrect ? q.a : 'ZZZ-salah';
    inp.value = val;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    card.querySelector('.inline-check').click();
    return val;
  }, i, correct);
}

/* jawab semua: betulN soalan pertama betul, selebihnya salah */
async function answerAll(page, rightCount) {
  const total = await page.evaluate(() => S.active.items.length);
  for (let i = 0; i < total; i++) await answer(page, i, i < rightCount);
  return total;
}

async function waitResult(page) {
  await page.waitForFunction(() => !document.getElementById('result').hidden, { timeout: 10000 });
}

const state = (page) => page.evaluate(() => ({
  scope: currentScope(),
  meta: S.active ? Object.assign({}, S.active.meta) : null,
  items: S.active ? S.active.items.map((q) => ({ done: !!q._done, ok: !!q._ok, given: q._given })) : [],
  hud: {
    right: document.getElementById('hudRight').textContent,
    left: document.getElementById('hudLeft').textContent,
    streak: document.getElementById('hudStreak').textContent,
    stars: document.getElementById('hudStars').textContent,
    progress: document.getElementById('hudProgressText').textContent,
  },
  scopeBar: !document.getElementById('scopeBar').hidden,
  updateBar: !document.getElementById('updateBar').hidden,
  store: (() => { try { return JSON.parse(localStorage.getItem('kelasnadi.progress.v3') || '{}'); } catch (e) { return { ROSAK: true }; } })(),
  resultHidden: document.getElementById('result').hidden,
}));

module.exports = {
  ROOT, findChrome, launch, startServer, newPage, openApp,
  pickStream, pickSubject, pickTopic, startQuiz, answer, answerAll, waitResult, state, sel,
};
