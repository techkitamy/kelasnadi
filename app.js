/* Kelas Nadi v2 — app statik (tiada rangka kerja, tiada build step)
   Bank soalan: content.json  |  Soalan matematik dijana tanpa had  */
'use strict';

/* ------------------------------------------------------------------ state */
const S = {
  data: null,
  streamId: 'prasekolah',
  levelId: null,
  subjectId: 'all',
  topicId: 'all',
  quiz: [],
  mode: 'sheet',
  profile: 'tetamu',
  sound: true,
  answerIndex: 0,
};

const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------------------- util */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s).toLowerCase().trim().replace(/[\s\u0640\u200f\u200e]/g, '').replace(/[.,!?'"()—–-]/g, '');
function shuffle(a) { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }
function numeric(s) { const t = String(s).trim(); if (!/^-?\d+([.,]\d+)?$/.test(t)) return null; const v = Number(t.replace(',', '.')); return Number.isFinite(v) ? v : null; }

/* ------------------------------------------------------------------ bunyi */
const Sound = {
  ctx: null,
  ctxInit() { if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); } return this.ctx; },
  play(notes, type = 'sine') {
    if (!S.sound) return;
    const ctx = this.ctxInit(); if (!ctx) return;
    let t = ctx.currentTime;
    notes.forEach((n) => {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = n.type || type; osc.frequency.value = n.f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(n.v || 0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (n.d || 0.15));
      osc.connect(g); g.connect(ctx.destination); osc.start(t); osc.stop(t + (n.d || 0.15) + 0.05);
      t += (n.d || 0.15) * 0.85;
    });
  },
  right() { this.play([{ f: 740, d: 0.1 }, { f: 988, d: 0.16 }]); },
  wrong() { this.play([{ f: 196, d: 0.22, type: 'triangle', v: 0.14 }]); },
  win() { this.play([{ f: 523, d: 0.12 }, { f: 659, d: 0.12 }, { f: 784, d: 0.14 }, { f: 1047, d: 0.24 }]); },
  tap() { this.play([{ f: 520, d: 0.05, v: 0.07 }]); },
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

/* ------------------------------------------------------ kandungan & skop */
const stream = () => S.data.streams.find((x) => x.id === S.streamId);
const level = () => stream().levels.find((x) => x.id === S.levelId);
const subject = () => (level().subjects || []).find((x) => x.id === S.subjectId);
const topicObj = () => (subject().topics || []).find((x) => x.id === S.topicId);

function poolForScope() {
  const out = [];
  (level().subjects || []).forEach((su) => {
    if (S.subjectId !== 'all' && su.id !== S.subjectId) return;
    su.topics.forEach((tp) => {
      if (S.topicId !== 'all' && tp.id !== S.topicId) return;
      tp.questions.forEach((q) => out.push({ ...q, _topic: tp.name, _subject: su.name }));
    });
  });
  return out;
}

function materialize(q) {
  if (q.t !== 'gen') return q;
  const max = q.max || 20, rnd = (n) => Math.floor(Math.random() * n);
  if (q.gen === 'math_sub') { const a = 2 + rnd(Math.max(1, max - 1)); const b = 1 + rnd(Math.max(1, a - 1)); return { t: 'type', p: `${a} − ${b} = ?`, a: String(a - b), accept: [String(a - b)], _topic: q._topic, _subject: q._subject }; }
  if (q.gen === 'math_mul') { const a = 1 + rnd(9), b = 1 + rnd(9); return { t: 'type', p: `${a} × ${b} = ?`, a: String(a * b), accept: [String(a * b)], _topic: q._topic, _subject: q._subject }; }
  const a = 1 + rnd(Math.max(1, max - 1)); const b = 1 + rnd(Math.max(1, max - a));
  return { t: 'type', p: `${a} + ${b} = ?`, a: String(a + b), accept: [String(a + b)], _topic: q._topic, _subject: q._subject };
}

/* -------------------------------------------------------------- init app */
async function init() {
  renderMascots('happy');
  const res = await fetch('content.json', { cache: 'no-cache' });
  S.data = await res.json();

  S.profile = localStorage.getItem('kelasnadi.profile') || 'tetamu';
  S.mode = localStorage.getItem('kelasnadi.mode') || 'sheet';
  S.sound = localStorage.getItem('kelasnadi.sound') !== 'off';
  S.data.profile = S.profile;

  $('profileName').value = S.profile === 'tetamu' ? '' : S.profile;
  $('mode').value = S.mode;
  updateSoundBtn();

  $('profileName').oninput = (e) => {
    S.profile = e.target.value.trim() || 'tetamu';
    localStorage.setItem('kelasnadi.profile', S.profile);
  };
  $('mode').onchange = (e) => { S.mode = e.target.value; localStorage.setItem('kelasnadi.mode', S.mode); if (S.quiz.length) renderQuiz(); };
  $('soundBtn').onclick = () => { S.sound = !S.sound; localStorage.setItem('kelasnadi.sound', S.sound ? 'on' : 'off'); updateSoundBtn(); if (S.sound) Sound.tap(); };
  $('level').onchange = (e) => { S.levelId = e.target.value; fillSubjects(); };
  $('subject').onchange = (e) => { S.subjectId = e.target.value; fillTopics(); };
  $('topic').onchange = (e) => { S.topicId = e.target.value; };
  $('count').onchange = () => {};
  $('start').onclick = startQuiz;
  $('printSheet').onclick = () => printWorksheet();
  $('printTop').onclick = () => printWorksheet();
  $('printTrace').onclick = () => printTracing();
  $('printResult').onclick = () => printWorksheet();
  $('againBtn').onclick = startQuiz;
  $('fixBtn').onclick = () => {
    const wrong = S.quiz.filter((q) => q._done && !q._ok);
    if (!wrong.length) return;
    S.quiz = shuffle(wrong).map((q) => ({ ...q, _done: false, _ok: false, _given: null }));
    $('result').hidden = true;
    renderQuiz();
  };

  renderStreamPick();
  pickStream(S.data.streams[0].id);
}

function updateSoundBtn() {
  const b = $('soundBtn');
  b.textContent = S.sound ? '🔊' : '🔇';
  b.classList.toggle('off', !S.sound);
}

function renderMascots(mood) {
  ['topMascot', 'heroMascot', 'resultMascot'].forEach((id) => { const el = $(id); if (el) el.innerHTML = mascotSvg(mood); });
}

function renderStreamPick() {
  $('streamPick').innerHTML = S.data.streams.map((st) => `
    <button type="button" class="stream-card" data-stream="${st.id}">
      <b>${esc(st.name)}</b><span>${esc(st.tagline)}</span>
      <span>${st.levels.reduce((a, lv) => a + (lv.subjects || []).reduce((b, su) => b + su.topics.reduce((c, tp) => c + tp.questions.length, 0), 0), 0)} soalan</span>
    </button>`).join('');
  $('streamPick').querySelectorAll('[data-stream]').forEach((b) => {
    b.onclick = () => { Sound.tap(); pickStream(b.dataset.stream); };
  });
}

function pickStream(id) {
  S.streamId = id; S.subjectId = 'all'; S.topicId = 'all';
  const lvls = stream().levels; S.levelId = (lvls.find((l) => !l.soon) || lvls[0]).id;
  $('streamPick').querySelectorAll('[data-stream]').forEach((b) => b.classList.toggle('active', b.dataset.stream === id));
  fillLevels();
}

function fillLevels() {
  $('level').innerHTML = stream().levels.map((lv) =>
    `<option value="${lv.id}"${lv.soon ? ' disabled' : ''}>${esc(lv.name)}${lv.soon ? ' (akan datang)' : ''}</option>`).join('');
  $('level').value = S.levelId;
  fillSubjects();
}

function fillSubjects() {
  const subs = level().subjects || [];
  $('subject').innerHTML = `<option value="all">Semua subjek</option>` + subs.map((su) => `<option value="${su.id}">${esc(su.name)}</option>`).join('');
  $('subject').disabled = !subs.length;
  S.subjectId = 'all'; $('subject').value = 'all';
  fillTopics();
}

function fillTopics() {
  const subs = (level().subjects || []).filter((su) => S.subjectId === 'all' || su.id === S.subjectId);
  const list = []; subs.forEach((su) => su.topics.forEach((tp) => list.push({ su, tp })));
  $('topic').innerHTML = `<option value="all">Semua topik</option>` + list.map(({ su, tp }) => `<option value="${tp.id}">${esc(su.name)} — ${esc(tp.name)}</option>`).join('');
  $('topic').disabled = !list.length;
  S.topicId = 'all'; $('topic').value = 'all';
}

/* ------------------------------------------------------------------ kuiz */
function startQuiz() {
  const base = poolForScope();
  S.quiz = [];
  $('result').hidden = true;
  if (!base.length) { $('quizArea').innerHTML = '<p class="hint">Topik ini belum ada soalan lagi.</p>'; $('hud').hidden = true; return; }
  const want = $('count').value;
  const n = want === 'Semua' ? base.length : Math.min(Number(want), base.length);
  S.quiz = shuffle(base).slice(0, n).map((q) => { const m = materialize(q); return { ...m, _done: false, _ok: false, _given: null }; });
  Sound.tap();
  renderQuiz();
  document.getElementById('hud').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function qcardHtml(q, i) {
  const rtl = q.dir === 'rtl' ? ' jawi' : '';
  const attr = q.dir === 'rtl' ? ' lang="ms-Arab" dir="rtl"' : '';
  let body = '';
  if (q.t === 'mcq') {
    body = `<div class="options">${shuffle(q.o).map((o) =>
      `<button class="option${q.dir === 'rtl' ? ' jawi' : ''}" type="button"${q.dir === 'rtl' ? ' lang="ms-Arab" dir="rtl"' : ''} data-q="${i}" data-val="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
  } else {
    body = `<div class="options" style="grid-template-columns:1fr">
      <input id="in-${i}" class="answer-input" autocomplete="off" inputmode="text" placeholder="Taip jawapan…" aria-label="Jawapan">
    </div><div class="actions"><button class="primary inline-check" type="button" data-check="${i}">Semak</button></div>`;
  }
  return `<article class="qcard" id="q-${i}">
    <div class="qcard-head">
      <span class="qnum">${i + 1}</span>
      <span class="qprompt${rtl}"${attr}>${esc(q.p)}</span>
      <span class="badge">${esc((q._topic || '').slice(0, 22))}</span>
    </div>${body}<div class="fb" id="fb-${i}"></div></article>`;
}

function renderQuiz() {
  S.answerIndex = S.quiz.findIndex((q) => !q._done);
  if (S.mode === 'focus') renderFocus(); else renderSheet();
  updateHud();
}

function renderSheet() {
  $('quizArea').innerHTML = S.quiz.map((q, i) => qcardHtml(q, i)).join('');
  wireCards();
}

function renderFocus() {
  const i = Math.max(0, S.answerIndex);
  $('quizArea').innerHTML = `${S.quiz[i] ? qcardHtml(S.quiz[i], i) : '<p class="hint">Semua soalan dah dijawab! 🎉</p>'}`;
  wireCards();
}

function wireCards() {
  $('quizArea').querySelectorAll('.option').forEach((b) => { b.onclick = () => markMcq(Number(b.dataset.q), b); });
  $('quizArea').querySelectorAll('[data-check]').forEach((b) => { b.onclick = () => markTyped(Number(b.dataset.check)); });
  $('quizArea').querySelectorAll('.answer-input').forEach((inp) => {
    inp.onkeydown = (e) => { if (e.key === 'Enter') markTyped(Number(inp.id.replace('in-', ''))); };
  });
}

function evaluate(q, given) {
  const wantN = numeric(q.a), gotN = numeric(given);
  if (wantN !== null && gotN !== null) return wantN === gotN;
  if (norm(given) === norm(q.a)) return true;
  return (q.accept || []).some((x) => norm(x) === norm(given));
}

function markMcq(i, btn) {
  const q = S.quiz[i]; if (!q || q._done) return;
  const given = btn.dataset.val;
  const ok = evaluate(q, given);
  q._done = true; q._ok = ok; q._given = given;
  const card = $(`q-${i}`);
  card.classList.add(ok ? 'correct' : 'wrong');
  card.querySelectorAll('.option').forEach((b) => {
    b.disabled = true;
    if (b.dataset.val === q.a) b.classList.add('correct');
    else if (b === btn) b.classList.add('wrong');
  });
  showFb(i, q, ok, given);
  afterMark(i, ok);
}

function markTyped(i) {
  const q = S.quiz[i]; if (!q || q._done) return;
  const inp = $(`in-${i}`); if (!inp) return;
  const given = inp.value.trim(); if (!given) return;
  const ok = evaluate(q, given);
  q._done = true; q._ok = ok; q._given = given;
  inp.disabled = true;
  const card = $(`q-${i}`); card.classList.add(ok ? 'correct' : 'wrong');
  const btn = card.querySelector('.inline-check'); if (btn) btn.disabled = true;
  showFb(i, q, ok, given);
  afterMark(i, ok);
}

function showFb(i, q, ok, given) {
  const fb = $(`fb-${i}`); if (!fb) return;
  fb.className = 'fb ' + (ok ? 'ok' : 'no');
  fb.innerHTML = ok
    ? '✅ Betul!'
    : `❌ Belum tepat — jawapan: <b>${esc(q.a)}</b>${given ? ` <span class="hint">(awak: ${esc(given)})</span>` : ''}`;
}

function afterMark(i, ok) {
  if (ok) Sound.right(); else Sound.wrong();
  updateHud();
  if (S.mode === 'focus') {
    S.answerIndex = i;
    setTimeout(() => {
      const next = S.quiz.findIndex((q) => !q._done);
      if (next === -1) { finish(); return; }
      S.answerIndex = next; renderFocus(); updateHud();
      $('quizArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, ok ? 700 : 1500);
  } else {
    const next = S.quiz.findIndex((q) => !q._done);
    if (next === -1) setTimeout(finish, 500);
    else {
      const el = $(`q-${next}`);
      if (el && Math.abs(el.getBoundingClientRect().top) > 260) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

function correctCount() { return S.quiz.filter((q) => q._ok).length; }

function updateHud() {
  const done = S.quiz.filter((q) => q._done).length, right = correctCount(), total = S.quiz.length;
  $('hud').hidden = total === 0;
  $('hudRight').textContent = right;
  $('hudLeft').textContent = Math.max(0, total - done);
  $('hudStreak').textContent = streakCount();
  $('hudStars').textContent = starStr(starsFor(right, total));
  $('hudFill').style.width = total ? `${(100 * done) / total}%` : '0%';
  $('hud').classList.remove('pop'); void $('hud').offsetWidth; $('hud').classList.add('pop');
}

function streakCount() {
  let best = 0, run = 0;
  S.quiz.forEach((q) => { if (!q._done) return; if (q._ok) { run++; best = Math.max(best, run); } else run = 0; });
  return best;
}
function starsFor(right, total) { if (!total) return 0; const p = right / total; return p >= 0.9 ? 3 : p >= 0.7 ? 2 : p >= 0.5 ? 1 : 0; }
function starStr(n) { return '★'.repeat(n) + '☆'.repeat(3 - n); }

/* ---------------------------------------------------------------- result */
function finish() {
  const right = correctCount(), total = S.quiz.length;
  const st = starsFor(right, total);
  $('result').hidden = false;
  $('resultStars').textContent = starStr(st);
  $('resultTitle').textContent = st === 3 ? 'Cemerlang! 🏆' : st === 2 ? 'Bagus! 👏' : st === 1 ? 'Boleh lagi! 💪' : 'Jom cuba lagi 🙂';
  $('resultText').textContent = `${S.profile}: ${right} betul daripada ${total} soalan · streak terbaik ${streakCount()}`;
  const wrong = S.quiz.filter((q) => !q._ok && q._done).length;
  $('fixBtn').hidden = wrong === 0;
  renderMascots(st >= 2 ? 'happy' : st === 0 ? 'think' : 'happy');
  if (st >= 2) { Sound.win(); confetti(); } else Sound.tap();
  saveProgress(right, total);
  $('result').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function confetti() {
  const box = $('confetti'); const colors = ['#ffcf4d', '#4ec3e0', '#8b7bd8', '#35c28b', '#ff7a6b'];
  for (let i = 0; i < 46; i++) {
    const p = document.createElement('i');
    p.className = 'confetti-piece';
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 0.6}s`;
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    box.append(p);
    setTimeout(() => p.remove(), 3200);
  }
}

/* -------------------------------------------------------------- progress */
function progressKey() { return `kelasnadi.progress.${S.profile}`; }
function saveProgress(right, total) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(progressKey()) || '{}'); } catch (e) { all = {}; }
  const key = `${stream().name} · ${level().name} · ${(S.quiz[0] || {})._topic || 'Semua topik'}`;
  const prev = all[key] || { best: 0, total: 0, plays: 0 };
  all[key] = { best: Math.max(prev.best, right), total, plays: (prev.plays || 0) + 1 };
  localStorage.setItem(progressKey(), JSON.stringify(all));
}

/* ----------------------------------------------------------------- cetak */
function printRoot() {
  let r = $('print-root');
  if (!r) { r = document.createElement('div'); r.id = 'print-root'; document.body.append(r); }
  return r;
}
function scopeTitle() {
  const su = subject();
  return `${stream().name} · ${level().name}` + (su ? ` · ${su.name}` : '') + (S.topicId !== 'all' && topicObj() ? ` · ${topicObj().name}` : '');
}
function sheetItems() {
  if (S.quiz.length) return S.quiz;
  const base = poolForScope();
  const want = $('count').value;
  const n = want === 'Semua' ? base.length : Math.min(Number(want), base.length);
  return shuffle(base).slice(0, n).map(materialize);
}

function printWorksheet() {
  const items = sheetItems();
  if (!items.length) { alert('Tiada soalan untuk dicetak pada pilihan ini.'); return; }
  const rows = items.map((q, i) => {
    if (q.t === 'mcq') {
      const opts = shuffle(q.o).map((o, j) => `${'abcd'[j]}) ${esc(o)}`).join(' &nbsp;&nbsp; ');
      return `<div class="item"><span class="num">${i + 1}.</span><span class="qtext${q.dir === 'rtl' ? ' rtl' : ''}">${esc(q.p)}
        <div class="opts">${opts}</div><div style="margin-top:4px">Jawapan: <span class="blank"></span></div></span></div>`;
    }
    return `<div class="item"><span class="num">${i + 1}.</span><span class="qtext">${esc(q.p)} <span class="blank"></span></span></div>`;
  }).join('');
  const keys = items.map((q, i) =>
    `<div class="item"><span class="num">${i + 1}.</span><span class="qtext${q.dir === 'rtl' ? ' rtl' : ''}">${esc(q.p)} → <b>${esc(q.a)}</b></span></div>`).join('');
  printRoot().innerHTML = `
    <article class="sheet">
      <h1>Kelas Nadi — Lembaran Latihan</h1>
      <p class="subtitle">${esc(scopeTitle())} &nbsp;·&nbsp; Nama: ____________________ &nbsp; Tarikh: __________</p>
      <div class="rule"></div>
      ${rows}
      <p class="foot">Kelas Nadi — latihan sokongan keluarga, bukan bahan rasmi KPM · percuma untuk keluarga, sekolah dan kelas agama.</p>
    </article>
    <article class="sheet">
      <h1>Skema Jawapan</h1>
      <p class="subtitle">${esc(scopeTitle())} &nbsp;·&nbsp; untuk ibu bapa / guru</p>
      <div class="rule"></div>
      ${keys}
    </article>`;
  window.print();
}

/* -------- lembaran surih: garis tiga + huruf garis putus-putus (SVG) ----- */
const JAWI_TRACE = ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع',
  'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'و', 'ه', 'ي', 'چ', 'ݢ', 'ڠ', 'ڤ'];

function traceRow(chars, isJawi) {
  const CW = 100, H = 92, top = 24, mid = 50, base = 76;
  const fam = isJawi
    ? "'Noto Naskh Arabic','Scheherazade','Arabic Typesetting',serif"
    : "'Comic Sans MS','Trebuchet MS',Verdana,sans-serif";
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

/* satu baris = satu huruf, 8 ulangan: 1 contoh + 6 surih + 1 ruang tulis sendiri */
function traceLine(ch, isJawi) {
  return traceRow([ch, ch, ch, ch, ch, ch, ch, ch], isJawi);
}

function printTracing() {
  const sets = S.streamId === 'agama'
    ? [{ t: 'Huruf Hijaiyah & Jawi', c: JAWI_TRACE, jawi: true }]
    : [
      { t: 'Huruf besar A–Z', c: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'], jawi: false },
      { t: 'Huruf kecil a–z', c: [...'abcdefghijklmnopqrstuvwxyz'], jawi: false },
      { t: 'Nombor 0–9', c: [...'0123456789'], jawi: false },
    ];
  const pages = sets.map((set) => {
    const rows = set.c.map((ch) => traceLine(ch, set.jawi));
    return `<article class="sheet">
      <h1>Lembaran Surih — ${esc(set.t)}</h1>
      <p class="subtitle">${esc(level().name)} &nbsp;·&nbsp; Nama: ____________________ &nbsp; Tarikh: __________</p>
      <div class="rule"></div>
      <p class="intro">Huruf kelabu = contoh. Huruf titik-titik = <b>surih</b>. Petak terakhir kosong = <b>tulis sendiri</b>.
      Ikut garis tiga: garisan atas, garisan tengah (putus-putus) dan garisan bawah.</p>
      ${rows.join('')}
      <p class="foot">Kelas Nadi — cetak semula bila perlu.</p>
    </article>`;
  }).join('');
  printRoot().innerHTML = pages;
  window.print();
}

/* ------------------------------------------------------------------ boot */
init().then(() => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}).catch((e) => {
  console.error(e);
  $('quizArea').innerHTML = '<p class="hint">Kandungan tak dapat dimuatkan. Sila muat semula halaman.</p>';
});
