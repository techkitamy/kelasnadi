/* Kelas Nadi — app.js (v3, stabil)
   Vanilla JS. Tiada rangka kerja, tiada backend, tiada login.
   Logik tulen ada dalam core.js (diuji oleh tests/core.test.js).

   PERATURAN UTAMA:
   - Setiap kuiz ada SNAPSHOT (S.active.meta). Semua markah, progress dan cetakan
     mesti guna snapshot itu — BUKAN selector semasa.
   - Tukar pilihan semasa kuiz berjalan → tunjuk bar pilihan, JANGAN campur skop.
*/
'use strict';

const C = window.KelasNadiCore;

const S = {
  data: null,
  profile: 'tetamu',
  sound: true,
  mode: 'sheet',
  ui: { streamId: null, levelId: null, subjectId: 'all', topicId: 'all' }, // selector semasa
  active: null,          // { meta, items }
  focusIndex: 0,
  autoTimer: null,
  installEvent: null,
};
const PROGRESS_STORE = 'kelasnadi.progress.v3';
/* Versi app. WAJIB padan dengan version.json — naikkan dua-dua setiap kali deploy. */
const APP_VERSION = '3.0.0';
const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------------------ util */
function readStore() { return C.safeJsonParse(localStorage.getItem(PROGRESS_STORE), {}); }
function writeStore(v) { try { localStorage.setItem(PROGRESS_STORE, JSON.stringify(v)); } catch (e) { /* storan penuh/private */ } }
function currentScope() { return { streamId: S.ui.streamId, levelId: S.ui.levelId, subjectId: S.ui.subjectId, topicId: S.ui.topicId }; }
function sameScope(a, b) { return !!a && !!b && a.streamId === b.streamId && a.levelId === b.levelId && a.subjectId === b.subjectId && a.topicId === b.topicId; }
function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ------------------------------------------------------------------ bunyi */
const Sound = {
  ctx: null,
  init() { if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); } return this.ctx; },
  play(notes, type = 'sine') {
    if (!S.sound) return;
    const ctx = this.init(); if (!ctx) return;
    let t = ctx.currentTime;
    notes.forEach((n) => {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = n.type || type; osc.frequency.value = n.f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(n.v || 0.16, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (n.d || 0.15));
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + (n.d || 0.15) + 0.05);
      t += (n.d || 0.15) * 0.85;
    });
  },
  right() { this.play([{ f: 740, d: 0.1 }, { f: 988, d: 0.16 }]); },
  wrong() { this.play([{ f: 196, d: 0.22, type: 'triangle', v: 0.13 }]); },
  win() { this.play([{ f: 523, d: 0.12 }, { f: 659, d: 0.12 }, { f: 784, d: 0.14 }, { f: 1047, d: 0.24 }]); },
  tap() { this.play([{ f: 520, d: 0.05, v: 0.06 }]); },
};

/* ----------------------------------------------------------------- mascot */
function mascotSvg(mood = 'happy') {
  const mouth = {
    happy: '<path d="M49,68 Q60,81 71,68" stroke="#21343a" stroke-width="3.2" fill="none" stroke-linecap="round"/>',
    think: '<path d="M52,73 L68,73" stroke="#21343a" stroke-width="3.2" fill="none" stroke-linecap="round"/>',
    sad: '<path d="M50,77 Q60,68 70,77" stroke="#21343a" stroke-width="3.2" fill="none" stroke-linecap="round"/>',
  }[mood] || '';
  const arms = mood === 'happy'
    ? '<path d="M42,60 Q26,50 20,34" stroke="#21343a" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M78,60 Q94,50 100,34" stroke="#21343a" stroke-width="3.4" fill="none" stroke-linecap="round"/>'
    : '<path d="M42,64 Q30,70 26,80" stroke="#21343a" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M78,64 Q90,70 94,80" stroke="#21343a" stroke-width="3.4" fill="none" stroke-linecap="round"/>';
  return `<svg viewBox="0 0 120 130" role="img" aria-label="Nadi">
    ${arms}
    <rect x="42" y="26" width="36" height="72" rx="11" fill="#ffcf4d" stroke="#e0ab16" stroke-width="3"/>
    <rect x="42" y="84" width="36" height="12" fill="#ffe6a0"/>
    <polygon points="42,96 78,96 60,124" fill="#f2d8b8" stroke="#dcb98f" stroke-width="3"/>
    <polygon points="53,112 67,112 60,124" fill="#3a3a3a"/>
    <rect x="42" y="15" width="36" height="13" rx="6" fill="#ff9d9d" stroke="#e07a7a" stroke-width="3"/>
    <circle cx="53" cy="55" r="4.6" fill="#21343a"/><circle cx="67" cy="55" r="4.6" fill="#21343a"/>
    <circle cx="47.5" cy="64" r="5" fill="#ffb3b3" opacity=".75"/><circle cx="72.5" cy="64" r="5" fill="#ffb3b3" opacity=".75"/>
    ${mouth}</svg>`;
}
function renderMascots(mood) {
  ['topMascot', 'heroMascot', 'resultMascot'].forEach((id) => { const el = $(id); if (el) el.innerHTML = mascotSvg(mood); });
}

/* ------------------------------------------------------------------- init */
async function init() {
  renderMascots('happy');
  const res = await fetch('content.json', { cache: 'no-cache' });
  S.data = await res.json();

  S.profile = C.cleanProfile(localStorage.getItem('kelasnadi.profile') || 'tetamu');
  S.mode = localStorage.getItem('kelasnadi.mode') === 'focus' ? 'focus' : 'sheet';
  S.sound = localStorage.getItem('kelasnadi.sound') !== 'off';

  $('profileName').value = S.profile === 'tetamu' ? '' : S.profile;
  $('mode').value = S.mode;
  updateSoundBtn();
  migrateLegacyProgress();

  $('profileName').addEventListener('input', (e) => { S.profile = C.cleanProfile(e.target.value); localStorage.setItem('kelasnadi.profile', S.profile); onSelectionChanged(); renderProgressPanel(); });
  $('mode').addEventListener('change', (e) => { S.mode = e.target.value; localStorage.setItem('kelasnadi.mode', S.mode); if (S.active) S.active.meta.mode = S.mode; renderQuiz(); });
  $('soundBtn').addEventListener('click', toggleSound);
  $('level').addEventListener('change', (e) => { S.ui.levelId = e.target.value; S.ui.subjectId = 'all'; S.ui.topicId = 'all'; fillSubjects(); onSelectionChanged(); });
  $('subject').addEventListener('change', (e) => { S.ui.subjectId = e.target.value; S.ui.topicId = 'all'; fillTopics(); onSelectionChanged(); });
  $('topic').addEventListener('change', (e) => { S.ui.topicId = e.target.value; onSelectionChanged(); });
  $('count').addEventListener('change', onSelectionChanged);
  $('start').addEventListener('click', startQuiz);
  $('printSheet').addEventListener('click', () => printWorksheet());
  $('printTop').addEventListener('click', () => printWorksheet());
  $('printTrace').addEventListener('click', printTracing);
  $('printResult').addEventListener('click', () => printWorksheet());
  $('againBtn').addEventListener('click', startQuiz);
  $('fixBtn').addEventListener('click', retryWrong);
  $('scopeKeep').addEventListener('click', keepOldQuiz);
  $('scopeNew').addEventListener('click', () => { hideScopeBar(); startQuiz(); });
  $('progressClear').addEventListener('click', askClearProgress);
  $('progressConfirm').addEventListener('click', doClearProgress);
  $('progressCancel').addEventListener('click', cancelClearProgress);
  $('installBtn').addEventListener('click', doInstall);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideScopeBar(); });

  renderStreamPick();
  pickStream(S.data.streams[0].id);
  renderProgressPanel();
  setupPwa();
}

function toggleSound() {
  S.sound = !S.sound;
  localStorage.setItem('kelasnadi.sound', S.sound ? 'on' : 'off');
  updateSoundBtn();
  if (S.sound) Sound.tap();
}
function updateSoundBtn() {
  const b = $('soundBtn');
  b.textContent = S.sound ? '🔊' : '🔇';
  b.setAttribute('aria-pressed', String(S.sound));
  b.setAttribute('aria-label', S.sound ? 'Bunyi hidup. Tekan untuk matikan.' : 'Bunyi mati. Tekan untuk hidupkan.');
  b.classList.toggle('off', !S.sound);
}

/* ------------------------------------------------------- pilih aliran/tahap */
function renderStreamPick() {
  $('streamPick').innerHTML = S.data.streams.map((st) => {
    const n = st.levels.reduce((a, lv) => a + (lv.subjects || []).reduce((b, su) => b + su.topics.reduce((c, tp) => c + tp.questions.length, 0), 0), 0);
    return `<button type="button" class="stream-card" data-stream="${st.id}">
      <b>${esc(st.name)}</b><span>${esc(st.tagline)}</span><span>${n} soalan</span></button>`;
  }).join('');
  $('streamPick').querySelectorAll('[data-stream]').forEach((b) => {
    b.addEventListener('click', () => { Sound.tap(); pickStream(b.dataset.stream); });
  });
}

function pickStream(id) {
  S.ui.streamId = id;
  const st = C.findStream(S.data, id);
  S.ui.levelId = (st.levels.find((l) => !l.soon) || st.levels[0]).id;
  S.ui.subjectId = 'all'; S.ui.topicId = 'all';
  $('streamPick').querySelectorAll('[data-stream]').forEach((b) => b.classList.toggle('active', b.dataset.stream === id));
  fillLevels();
}

function fillLevels() {
  const st = C.findStream(S.data, S.ui.streamId);
  $('level').innerHTML = st.levels.map((lv) => `<option value="${lv.id}"${lv.soon ? ' disabled' : ''}>${esc(lv.name)}${lv.soon ? ' (akan datang)' : ''}</option>`).join('');
  const lv = C.findLevel(S.data, S.ui.streamId, S.ui.levelId);
  if (!lv || lv.soon) { const first = st.levels.find((l) => !l.soon); if (first) S.ui.levelId = first.id; }
  $('level').value = S.ui.levelId;
  fillSubjects();
}

function fillSubjects() {
  const lv = C.findLevel(S.data, S.ui.streamId, S.ui.levelId) || { subjects: [] };
  const subs = lv.subjects || [];
  $('subject').innerHTML = `<option value="all">Semua subjek</option>` + subs.map((su) => `<option value="${su.id}">${esc(su.name)}</option>`).join('');
  $('subject').disabled = !subs.length;
  S.ui.subjectId = 'all'; $('subject').value = 'all';
  fillTopics();
}

function fillTopics() {
  const lv = C.findLevel(S.data, S.ui.streamId, S.ui.levelId) || { subjects: [] };
  const list = [];
  (lv.subjects || []).forEach((su) => {
    if (S.ui.subjectId !== 'all' && su.id !== S.ui.subjectId) return;
    su.topics.forEach((tp) => list.push({ su, tp }));
  });
  $('topic').innerHTML = `<option value="all">Semua topik</option>` + list.map(({ su, tp }) => `<option value="${tp.id}">${esc(su.name)} — ${esc(tp.name)}</option>`).join('');
  $('topic').disabled = !list.length;
  S.ui.topicId = 'all'; $('topic').value = 'all';
  onSelectionChanged();
}

/* ------------------------------------------------- bar pilihan berubah (item 1) */
function onSelectionChanged() {
  if (!S.active) { hideScopeBar(); return; }
  const meta = S.active.meta;
  const same = sameScope(currentScope(), meta) && C.cleanProfile(S.profile) === meta.profile && $('count').value === meta.count;
  if (same) { hideScopeBar(); return; }
  showScopeBar(meta);
}

function showScopeBar(meta) {
  const newLabel = C.scopeLabel(S.data, currentScope());
  $('scopeText').innerHTML = `Kuiz sedang berjalan: <b>${esc(meta.title)}</b> (${esc(meta.profile)}, ${meta.count} soalan).<br>
    Pilihan awak sekarang: <b>${esc(newLabel)}</b> — ${esc(C.cleanProfile(S.profile))}, ${esc($('count').value)} soalan.`;
  $('scopeBar').hidden = false;
}

function hideScopeBar() { $('scopeBar').hidden = true; }

/* Item 1 pilihan B: kekalkan kuiz lama, kembalikan selector kepada snapshot */
function keepOldQuiz() {
  const m = S.active.meta;
  S.ui.streamId = m.streamId; S.ui.levelId = m.levelId; S.ui.subjectId = m.subjectId; S.ui.topicId = m.topicId;
  $('streamPick').querySelectorAll('[data-stream]').forEach((b) => b.classList.toggle('active', b.dataset.stream === m.streamId));
  fillLevelsFieldsOnly();
  $('subject').value = m.subjectId; $('topic').value = m.topicId; $('count').value = m.count;
  S.profile = m.profile;
  $('profileName').value = m.profile === 'tetamu' ? '' : m.profile;
  localStorage.setItem('kelasnadi.profile', S.profile);
  hideScopeBar();
  renderQuiz();
  renderProgressPanel();
}

/* isi semula dropdown tanpa reset pilihan (untuk keepOldQuiz) */
function fillLevelsFieldsOnly() {
  const st = C.findStream(S.data, S.ui.streamId);
  $('level').innerHTML = st.levels.map((lv) => `<option value="${lv.id}"${lv.soon ? ' disabled' : ''}>${esc(lv.name)}${lv.soon ? ' (akan datang)' : ''}</option>`).join('');
  $('level').value = S.ui.levelId;
  const lv = C.findLevel(S.data, S.ui.streamId, S.ui.levelId) || { subjects: [] };
  $('subject').innerHTML = `<option value="all">Semua subjek</option>` + (lv.subjects || []).map((su) => `<option value="${su.id}">${esc(su.name)}</option>`).join('');
  $('subject').disabled = !(lv.subjects || []).length;
  const list = [];
  (lv.subjects || []).forEach((su) => su.topics.forEach((tp) => list.push({ su, tp })));
  $('topic').innerHTML = `<option value="all">Semua topik</option>` + list.map(({ su, tp }) => `<option value="${tp.id}">${esc(su.name)} — ${esc(tp.name)}</option>`).join('');
  $('topic').disabled = !list.length;
}

/* ------------------------------------------------------------------ kuiz */
function snapshotMeta(scope, count) {
  const profile = C.cleanProfile(S.profile);
  return {
    profile, streamId: scope.streamId, levelId: scope.levelId, subjectId: scope.subjectId, topicId: scope.topicId,
    mode: S.mode, count, title: C.scopeLabel(S.data, scope),
    key: C.progressKey(profile, scope), startedAt: Date.now(), finished: false,
  };
}

function startQuiz() {
  const scope = currentScope();
  const base = C.poolForScope(S.data, scope);
  $('result').hidden = true;
  clearTimeout(S.autoTimer);
  if (!base.length) {
    S.active = null;
    $('hud').hidden = true;
    $('quizArea').innerHTML = '<p class="hint" id="emptyMsg">Topik ini belum ada soalan lagi. Pilih topik lain ya.</p>';
    return;
  }
  const want = $('count').value;
  const n = want === 'Semua' ? base.length : Math.min(Number(want), base.length);
  const items = C.shuffle(base).slice(0, n).map((q) => Object.assign(C.materializeGen(q), { _done: false, _ok: false, _given: null }));
  S.active = { meta: snapshotMeta(scope, want), items };
  S.focusIndex = items.findIndex((q) => !q._done);
  if (S.focusIndex < 0) S.focusIndex = 0;
  hideScopeBar();
  Sound.tap();
  renderQuiz();
  $('hud').scrollIntoView({ behavior: motionOk() ? 'smooth' : 'auto', block: 'start' });
}
function motionOk() { return !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }

function renderQuiz() {
  if (!S.active) return;
  if (S.active.meta.mode === 'focus') renderFocus(); else renderSheet();
  updateHud();
}

/* ---- kad soalan: baca state _done/_ok/_given supaya re-render tak hilang jawapan */
function qcardHtml(q, i) {
  const isJawi = q.dir === 'rtl';
  const attr = isJawi ? ' lang="ms-Arab" dir="rtl"' : '';
  const done = !!q._done;
  let body = '';
  if (q.t === 'mcq') {
    const opts = (q.o || []).map((o) => {
      const isRight = done && C.norm(o) === C.norm(q.a);
      const isPicked = done && q._given !== null && C.norm(o) === C.norm(q._given);
      const cls = ['option', isJawi ? 'jawi' : '', isRight ? 'correct' : '', isPicked && !isRight ? 'wrong' : ''].filter(Boolean).join(' ');
      return `<button class="${cls}" type="button"${isJawi ? ' lang="ms-Arab" dir="rtl"' : ''} data-q="${i}" data-val="${esc(o)}"${done ? ' disabled aria-disabled="true"' : ''}>${esc(o)}</button>`;
    }).join('');
    body = `<div class="options">${opts}</div>`;
  } else {
    const val = done && q._given !== null ? esc(q._given) : '';
    body = `<div class="options" style="grid-template-columns:1fr">
      <input id="in-${i}" class="answer-input" autocomplete="off" placeholder="Taip jawapan…" aria-label="Jawapan soalan ${i + 1}"
        value="${val}" data-q="${i}"${done ? ' disabled' : ''}>
    </div>
    <div class="actions"><button class="primary inline-check" type="button" data-check="${i}"${done ? ' disabled' : ''}>Semak</button></div>`;
  }
  const fbCls = done ? (q._ok ? 'fb ok' : 'fb no') : 'fb';
  const fbText = done ? (q._ok ? '✅ Betul!' : `❌ Belum tepat — jawapan: <b>${esc(q.a)}</b>${q._given !== null && !q._ok ? ` <span class="hint">(awak: ${esc(q._given)})</span>` : ''}`) : '';
  return `<article class="qcard${done ? (q._ok ? ' correct' : ' wrong') : ''}" id="q-${i}" data-q="${i}">
    <div class="qcard-head">
      <span class="qnum">${i + 1}</span>
      <span class="qprompt${isJawi ? ' jawi' : ''}"${attr}>${esc(q.p)}</span>
      <span class="badge">${esc((q._topic || '').slice(0, 22))}</span>
    </div>${body}
    <div class="${fbCls}" id="fb-${i}" role="status" aria-live="polite">${fbText}</div></article>`;
}

function renderSheet() {
  $('quizArea').innerHTML = S.active.items.map((q, i) => qcardHtml(q, i)).join('');
  wireCards();
}

function renderFocus() {
  const i = Math.max(0, Math.min(S.active.items.length - 1, S.focusIndex));
  const q = S.active.items[i];
  $('quizArea').innerHTML = q
    ? `${qcardHtml(q, i)}
      <div class="focus-nav">
        <span class="hint">Soalan ${i + 1} / ${S.active.items.length}</span>
        <button id="focusNext" class="primary" type="button">Seterusnya →</button>
      </div>`
    : '<p class="hint">Semua soalan dah dijawab! 🎉</p>';
  wireCards();
  const nb = $('focusNext');
  if (nb) nb.addEventListener('click', () => { clearTimeout(S.autoTimer); gotoFocus(i + 1); });
}

function gotoFocus(idx) {
  if (!S.active) return;
  if (idx >= S.active.items.length) { finish(); return; }
  S.focusIndex = Math.max(0, idx);
  renderFocus();
  updateHud();
  $('quizArea').scrollIntoView({ behavior: motionOk() ? 'smooth' : 'auto', block: 'start' });
}

function wireCards() {
  $('quizArea').querySelectorAll('.option').forEach((b) => b.addEventListener('click', () => markMcq(Number(b.dataset.q), b)));
  $('quizArea').querySelectorAll('[data-check]').forEach((b) => b.addEventListener('click', () => markTyped(Number(b.dataset.check))));
  $('quizArea').querySelectorAll('.answer-input').forEach((inp) => {
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') markTyped(Number(inp.dataset.q)); });
  });
}

function markMcq(i, btn) {
  const q = S.active && S.active.items[i];
  if (!q || q._done) return;
  applyMark(i, btn.dataset.val);
}

function markTyped(i) {
  const q = S.active && S.active.items[i];
  if (!q || q._done) return;
  const inp = $(`in-${i}`);
  if (!inp) return;
  const given = inp.value.trim();
  if (!given) return;
  applyMark(i, given);
}

function applyMark(i, given) {
  const q = S.active.items[i];
  q._done = true; q._ok = C.evaluate(q, given); q._given = given;

  const card = $(`q-${i}`);
  if (card) {
    card.classList.add(q._ok ? 'correct' : 'wrong');
    card.querySelectorAll('.option').forEach((b) => {
      b.disabled = true; b.setAttribute('aria-disabled', 'true');
      if (C.norm(b.dataset.val) === C.norm(q.a)) b.classList.add('correct');
      else if (C.norm(b.dataset.val) === C.norm(given)) b.classList.add('wrong');
    });
    const inp = card.querySelector('.answer-input');
    if (inp) { inp.disabled = true; inp.value = given; }
    const chk = card.querySelector('.inline-check');
    if (chk) chk.disabled = true;
    const fb = $(`fb-${i}`);
    if (fb) {
      fb.className = q._ok ? 'fb ok' : 'fb no';
      fb.innerHTML = q._ok ? '✅ Betul!' : `❌ Belum tepat — jawapan: <b>${esc(q.a)}</b> <span class="hint">(awak: ${esc(given)})</span>`;
    }
  }
  if (q._ok) Sound.right(); else Sound.wrong();
  updateHud();

  if (S.active.meta.mode === 'focus') {
    if (q._ok) S.autoTimer = setTimeout(() => gotoFocus(i + 1), 1100);   /* betul: auto, lembut */
    /* salah: JANGAN auto — murid baca feedback dan tekan "Seterusnya" sendiri */
  } else {
    const next = S.active.items.findIndex((x) => !x._done);
    if (next === -1) setTimeout(finish, 600);
    else if (motionOk()) {
      const el = $(`q-${next}`);
      if (el && Math.abs(el.getBoundingClientRect().top) > 280) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

function retryWrong() {
  if (!S.active) return;
  const wrong = S.active.items.filter((q) => q._done && !q._ok);
  if (!wrong.length) return;
  S.active.items = C.shuffle(wrong).map((q) => Object.assign({}, q, { _done: false, _ok: false, _given: null }));
  S.active.meta.finished = false;
  S.focusIndex = 0;
  $('result').hidden = true;
  renderQuiz();
}

/* ------------------------------------------------------------------- HUD */
function updateHud() {
  if (!S.active) { $('hud').hidden = true; return; }
  const items = S.active.items;
  const total = items.length, done = C.countDone(items), right = C.countRight(items);
  $('hud').hidden = false;
  $('hudRight').textContent = right;
  $('hudLeft').textContent = Math.max(0, total - done);
  $('hudStreak').textContent = C.currentStreak(items);              /* streak semasa, bukan best */
  $('hudStars').textContent = C.starStr(C.accuracyStars(right, done)); /* ikut soalan yang dijawab */
  $('hudFill').style.width = total ? `${(100 * done) / total}%` : '0%';
  $('hudProgressText').textContent = `${done}/${total} dijawab`;
}

/* ---------------------------------------------------------------- result */
function finish() {
  if (!S.active || S.active.meta.finished) return;
  const meta = S.active.meta;
  meta.finished = true;
  const items = S.active.items;
  const right = C.countRight(items), total = items.length;
  const pct = C.percent(right, total);
  const st = C.starsFor(right, total);

  $('result').hidden = false;
  $('resultStars').textContent = C.starStr(st);
  $('resultTitle').textContent = st === 3 ? 'Cemerlang! 🏆' : st === 2 ? 'Bagus! 👏' : st === 1 ? 'Boleh lagi! 💪' : 'Jom cuba lagi 🙂';
  $('resultText').textContent = `${meta.profile}: ${right} betul daripada ${total} soalan (${pct}%) · streak terbaik ${C.bestStreak(items)} · ${meta.title}`;
  const wrong = items.filter((q) => q._done && !q._ok).length;
  $('fixBtn').hidden = wrong === 0;
  renderMascots(st >= 2 ? 'happy' : 'think');
  if (st >= 2) { Sound.win(); confetti(); } else Sound.tap();

  /* progress: snapshot key + snapshot profile (item 5 & 1) */
  const store = readStore();
  store[meta.key] = C.mergeRun(store[meta.key], { right, total }, meta.title);
  writeStore(store);
  renderProgressPanel();
  if (motionOk()) $('result').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function confetti() {
  if (!motionOk()) return;   /* hormat prefers-reduced-motion */
  const box = $('confetti');
  const colors = ['#ffcf4d', '#4ec3e0', '#8b7bd8', '#35c28b', '#ff7a6b'];
  for (let i = 0; i < 46; i++) {
    const p = document.createElement('i');
    p.className = 'confetti-piece';
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 0.6}s`;
    box.append(p);
    setTimeout(() => p.remove(), 3200);
  }
}

/* ------------------------------------------------------- panel kemajuan  */
function profileEntries() {
  const me = C.cleanProfile(S.profile) + '|';
  return C.sortedEntries(readStore()).filter((e) => e.key.startsWith(me));
}

function renderProgressPanel() {
  const name = S.profile === 'tetamu' ? 'Anak' : S.profile;
  $('progressTitle').textContent = `Kemajuan ${name}`;
  const rows = profileEntries();
  const box = $('progressList');
  if (!rows.length) {
    box.innerHTML = '<p class="hint" id="progressEmpty">Belum ada rekod. Main satu latihan dulu ya.</p>';
    $('progressClear').hidden = true;
    return;
  }
  $('progressClear').hidden = false;
  const totalPlays = rows.reduce((a, r) => a + (Number(r.plays) || 0), 0);
  const last = rows[0];
  box.innerHTML = `
    <p class="hint">${rows.length} topik dilatih · ${totalPlays} kali main kesemuanya · latihan terakhir ${esc(C.relativeTime(last.lastAt || last.updatedAt))}</p>
    <div class="plist">${rows.map((r) => `
      <div class="prow">
        <div class="prow-main">
          <b>${esc(r.label || r.key)}</b>
          <span class="hint">${r.plays || 0}× main · terakhir ${esc(C.relativeTime(r.lastAt || r.updatedAt))}</span>
        </div>
        <div class="prow-scores">
          <span class="pill">Terakhir <b>${r.lastRight || 0}/${r.lastTotal || 0}</b></span>
          <span class="pill best">Terbaik <b>${r.bestRight || 0}/${r.bestTotal || 0}</b> ${C.starStr(C.starsForPercent(r.bestPercent || 0))}</span>
        </div>
      </div>`).join('')}</div>`;
}

function askClearProgress() {
  $('progressConfirmBar').hidden = false;
  $('progressClear').hidden = true;
}
function cancelClearProgress() {
  $('progressConfirmBar').hidden = true;
  $('progressClear').hidden = false;
}
function doClearProgress() {
  const me = C.cleanProfile(S.profile) + '|';
  let store = readStore();
  Object.keys(store).forEach((k) => { if (k.startsWith(me)) store = C.deleteEntry(store, k); });
  writeStore(store);
  cancelClearProgress();
  renderProgressPanel();
}

/* migrasi ringan dari format lama (kelasnadi.progress.<nama>) supaya rekod lama tak hilang */
function migrateLegacyProgress() {
  const me = C.cleanProfile(S.profile);
  const legacyKey = `kelasnadi.progress.${me}`;
  const raw = localStorage.getItem(legacyKey);
  if (!raw) return;
  const legacy = C.safeJsonParse(raw, {});
  const store = readStore();
  Object.keys(legacy).forEach((label) => {
    const o = legacy[label] || {};
    const key = `${me}|lama|-|all|${encodeURIComponent(label).slice(0, 40)}`;
    const entry = C.mergeRun(store[key], { right: Number(o.best) || 0, total: Number(o.total) || 0 }, `(rekod lama) ${label}`, Number(o.updatedAt) || Date.now());
    entry.plays = Number(o.plays) || entry.plays;
    store[key] = entry;
  });
  writeStore(store);
  localStorage.removeItem(legacyKey);
}

/* ----------------------------------------------------------------- cetak */
function printRoot() {
  let r = $('print-root');
  if (!r) { r = document.createElement('div'); r.id = 'print-root'; document.body.append(r); }
  return r;
}

/* sumber cetakan: kuiz aktif (snapshot) atau selector semasa — JANGAN campur */
function printSource() {
  if (S.active) return { items: S.active.items, title: S.active.meta.title, profile: S.active.meta.profile, from: 'kuiz aktif' };
  const scope = currentScope();
  const base = C.poolForScope(S.data, scope);
  const want = $('count').value;
  const n = want === 'Semua' ? base.length : Math.min(Number(want), base.length);
  return { items: C.shuffle(base).slice(0, n).map(C.materializeGen), title: C.scopeLabel(S.data, scope), profile: C.cleanProfile(S.profile), from: 'pilihan semasa' };
}

function printWorksheet() {
  const src = printSource();
  if (!src.items.length) { alert('Tiada soalan untuk dicetak pada pilihan ini.'); return; }
  const rows = src.items.map((q, i) => {
    if (q.t === 'mcq') {
      const opts = (q.o || []).map((o, j) => `${'abcd'[j]}) ${esc(o)}`).join(' &nbsp;&nbsp; ');
      return `<div class="item"><span class="num">${i + 1}.</span><span class="qtext${q.dir === 'rtl' ? ' rtl' : ''}">${esc(q.p)}
        <div class="opts">${opts}</div>
        <div class="ansrow" dir="ltr" style="direction:ltr;text-align:left">Jawapan: <span class="blank"></span></div></span></div>`;
    }
    return `<div class="item"><span class="num">${i + 1}.</span><span class="qtext">${esc(q.p)} <span class="blank"></span></span></div>`;
  }).join('');
  const keys = src.items.map((q, i) =>
    `<div class="item"><span class="num">${i + 1}.</span><span class="qtext${q.dir === 'rtl' ? ' rtl' : ''}">${esc(q.p)} → <b>${esc(q.a)}</b></span></div>`).join('');
  printRoot().innerHTML = `
    <article class="sheet">
      <h1>Kelas Nadi — Lembaran Latihan</h1>
      <p class="subtitle">${esc(src.title)} &nbsp;·&nbsp; ${esc(src.profile)} &nbsp;·&nbsp; Nama: ____________________ &nbsp; Tarikh: __________</p>
      <div class="rule"></div>
      ${rows}
      <p class="foot">Kelas Nadi — latihan sokongan keluarga, bukan bahan rasmi KPM · percuma untuk keluarga, sekolah dan kelas agama.</p>
    </article>
    <article class="sheet">
      <h1>Skema Jawapan</h1>
      <p class="subtitle">${esc(src.title)} &nbsp;·&nbsp; ${esc(src.profile)} &nbsp;·&nbsp; untuk ibu bapa / guru</p>
      <div class="rule"></div>
      ${keys}
    </article>`;
  window.print();
}

/* ------------------- lembaran surih (garis tiga + huruf titik) ------------- */
const JAWI_TRACE = ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع',
  'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'و', 'ه', 'ي', 'چ', 'ݢ', 'ڠ', 'ڤ'];

function traceRow(chars, isJawi) {
  const CW = 100, H = 92, top = 24, mid = 50, base = 76;
  const fam = isJawi ? "'Noto Naskh Arabic','Scheherazade','Arabic Typesetting',serif" : "'Trebuchet MS',Verdana,sans-serif";
  const cells = chars.map((ch, i) => {
    const x = CW * i + CW / 2;
    const size = isJawi ? 46 : 54;
    if (i === 0) return `<text x="${x}" y="${base}" font-size="${size}" font-family="${fam}" text-anchor="middle" fill="#7e7e7e">${ch}</text>`;
    if (i >= chars.length - 1) return '';
    return `<text x="${x}" y="${base}" font-size="${size}" font-family="${fam}" text-anchor="middle" fill="none" stroke="#b0b0b0" stroke-width="1.7" stroke-dasharray="1.6 2.6" stroke-linecap="round">${ch}</text>`;
  }).join('');
  const guides = `
    <line x1="6" y1="${top}" x2="${CW * chars.length - 6}" y2="${top}" stroke="#cfcfcf" stroke-width="1"/>
    <line x1="6" y1="${base}" x2="${CW * chars.length - 6}" y2="${base}" stroke="#9a9a9a" stroke-width="1.2"/>
    <line x1="6" y1="${mid}" x2="${CW * chars.length - 6}" y2="${mid}" stroke="#dcdcdc" stroke-width="1" stroke-dasharray="4 5"/>`;
  const grid = chars.map((_, i) => (i ? `<line x1="${CW * i}" y1="8" x2="${CW * i}" y2="${H - 6}" stroke="#ededed" stroke-width="1"/>` : '')).join('');
  return `<div class="guide-row"><svg viewBox="0 0 ${CW * chars.length} ${H}" xmlns="http://www.w3.org/2000/svg">${grid}${guides}${cells}</svg></div>`;
}
function traceLine(ch, isJawi) { return traceRow([ch, ch, ch, ch, ch, ch, ch, ch], isJawi); }

function printTracing() {
  const scope = S.active ? S.active.meta : currentScope();
  const streamId = scope.streamId;
  const st = C.findStream(S.data, streamId);
  const lv = C.findLevel(S.data, streamId, scope.levelId) || { name: '' };
  const sets = streamId === 'agama'
    ? [{ t: 'Huruf Hijaiyah & Jawi', c: JAWI_TRACE, jawi: true }]
    : [{ t: 'Huruf besar A–Z', c: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'], jawi: false },
       { t: 'Huruf kecil a–z', c: [...'abcdefghijklmnopqrstuvwxyz'], jawi: false },
       { t: 'Nombor 0–9', c: [...'0123456789'], jawi: false }];
  printRoot().innerHTML = sets.map((set) => `<article class="sheet">
      <h1>Lembaran Surih — ${esc(set.t)}</h1>
      <p class="subtitle">${esc(st ? st.name : '')} · ${esc(lv.name)} &nbsp;·&nbsp; Nama: ____________________ &nbsp; Tarikh: __________</p>
      <div class="rule"></div>
      <p class="intro">Huruf kelabu = contoh. Huruf titik-titik = <b>surih</b>. Petak terakhir kosong = <b>tulis sendiri</b>.
      Ikut garis tiga: garisan atas, garisan tengah (putus-putus) dan garisan bawah.</p>
      ${set.c.map((ch) => traceLine(ch, set.jawi)).join('')}
      <p class="foot">Kelas Nadi — cetak semula bila perlu.</p>
    </article>`).join('');
  window.print();
}

/* ------------------------------------------------------------------- PWA */
function setupPwa() {
  if (!('serviceWorker' in navigator)) return;
  let pendingWorker = null;
  /* Kalau halaman ini dimuat TANPA SW mengawal (pemasangan pertama / selepas unregister),
     jangan tunjuk bar "versi baru" — itu bukan kemas kini, itu pemasangan. */
  const hadController = !!navigator.serviceWorker.controller;

  navigator.serviceWorker.register('./sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed') pendingWorker = nw;   /* simpan sahaja; bar ikut version.json */
      });
    });
  }).catch(() => { /* offline/PWA tak disokong — app tetap jalan */ });

  /* Sumber kebenaran tunggal: version.json di pelayan vs APP_VERSION dalam app.
     Cara ini deterministik — tiada perlumbaan masa service worker. */
  const checkVersion = async () => {
    if (!hadController || !navigator.onLine) return;
    try {
      const res = await fetch('./version.json', { cache: 'no-store' });
      const v = await res.json();
      if (v && v.version && v.version !== APP_VERSION) showUpdateBar();
    } catch (e) { /* offline atau fail tiada — jangan ganggu pengguna */ }
  };
  checkVersion();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkVersion(); });

  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return; reloaded = true; location.reload();
  });

  $('updateReload').addEventListener('click', () => {
    if (pendingWorker) { pendingWorker.postMessage({ type: 'SKIP_WAITING' }); pendingWorker = null; }
    else location.reload();
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); S.installEvent = e; $('installBtn').hidden = false;
  });
  window.addEventListener('appinstalled', () => { $('installBtn').hidden = true; });
}
function showUpdateBar() { $('updateBar').hidden = false; }
async function doInstall() {
  if (!S.installEvent) { $('installBtn').hidden = true; return; }
  S.installEvent.prompt();
  try { await S.installEvent.userChoice; } catch (e) { /* diabaikan */ }
  S.installEvent = null; $('installBtn').hidden = true;
}

/* ------------------------------------------------------------------ boot */
init().catch((e) => {
  console.error(e);
  const area = $('quizArea');
  if (area) area.innerHTML = '<p class="hint">Kandungan tak dapat dimuatkan. Sila muat semula halaman.</p>';
});
