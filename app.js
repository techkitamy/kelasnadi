/* Kelas Nadi — app.js
   App statik: tiada rangka kerja, tiada build step.
   Bank soalan: content.json  |  Soalan matematik dijana (tanpa had).
*/
'use strict';

const S = {
  data: null,
  streamId: 'prasekolah',
  levelId: null,
  subjectId: null,
  topicId: 'all',
  quiz: [],
  index: 0,
  score: 0,
  choice: null,
  checked: false,
  profile: 'tetamu',
};

const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------------------ util */
const escapeHTML = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const norm = (s) =>
  String(s).toLowerCase().trim()
    .replace(/[\s\u0640\u200f\u200e]/g, '')
    .replace(/[.,!?'"()—–-]/g, '');

const num = (s) => { const v = Number(String(s).replace(/[^\d.]/g, '')); return Number.isFinite(v) && String(s).match(/\d/) ? v : null; };

function shuffle(a) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

/* -------------------------------------------------------- data navigation */
const stream = () => S.data.streams.find((x) => x.id === S.streamId);
const level = () => stream().levels.find((x) => x.id === S.levelId);
const subject = () => (level().subjects || []).find((x) => x.id === S.subjectId);
const topic = () => (subject().topics || []).find((x) => x.id === S.topicId);

function topicsOfLevel(lv) {
  const out = [];
  (lv.subjects || []).forEach((su) => su.topics.forEach((tp) => out.push({ subject: su, topic: tp })));
  return out;
}

function poolForScope() {
  const lv = level();
  const out = [];
  (lv.subjects || []).forEach((su) => {
    if (S.subjectId !== 'all' && su.id !== S.subjectId) return;
    su.topics.forEach((tp) => {
      if (S.topicId !== 'all' && tp.id !== S.topicId) return;
      tp.questions.forEach((q) => out.push({ ...q, _subject: su.name, _topic: tp.name, _topicId: tp.id }));
    });
  });
  return out;
}

/* --------------------------------------------- generator matematik (gen) */
function materialize(q) {
  if (q.t !== 'gen') return q;
  const max = q.max || 20;
  const rnd = (n) => Math.floor(Math.random() * n);
  if (q.gen === 'math_sub') {
    const a = 2 + rnd(Math.max(1, max - 1));
    const b = 1 + rnd(Math.max(1, a - 1));
    return { t: 'type', p: `${a} − ${b} = ?`, a: String(a - b), accept: [String(a - b)], _gen: true };
  }
  if (q.gen === 'math_mul') {
    const a = 1 + rnd(9), b = 1 + rnd(9);
    return { t: 'type', p: `${a} × ${b} = ?`, a: String(a * b), accept: [String(a * b)], _gen: true };
  }
  const a = 1 + rnd(Math.max(1, max - 1));
  const b = 1 + rnd(Math.max(1, max - a));
  return { t: 'type', p: `${a} + ${b} = ?`, a: String(a + b), accept: [String(a + b)], _gen: true };
}

/* ------------------------------------------------------------------ setup */
async function init() {
  const res = await fetch('content.json', { cache: 'no-cache' });
  S.data = await res.json();

  S.profile = localStorage.getItem('kelasnadi.profile') || 'tetamu';
  $('profileName').value = S.profile === 'tetamu' ? '' : S.profile;
  $('profileName').addEventListener('input', (e) => {
    const v = e.target.value.trim() || 'tetamu';
    S.profile = v;
    localStorage.setItem('kelasnadi.profile', v);
    renderProgressList();
  });

  renderStreamPick();
  pickStream(S.data.streams[0].id);

  $('level').addEventListener('change', (e) => { S.levelId = e.target.value; S.subjectId = 'all'; S.topicId = 'all'; fillSubjects(); startQuiz(); });
  $('subject').addEventListener('change', (e) => { S.subjectId = e.target.value; S.topicId = 'all'; fillTopics(); });
  $('topic').addEventListener('change', (e) => { S.topicId = e.target.value; startQuiz(); });
  $('count').addEventListener('change', startQuiz);
  $('start').addEventListener('click', startQuiz);
  $('check').addEventListener('click', checkAnswer);
  $('next').addEventListener('click', nextQuestion);
  $('printSheet').addEventListener('click', printWorksheet);
  $('printTop').addEventListener('click', printWorksheet);
  $('printTrace').addEventListener('click', printTracing);

  renderProgressList();
}

function renderStreamPick() {
  $('streamPick').innerHTML = S.data.streams.map((st) => {
    const n = st.levels.reduce((acc, lv) => acc + (lv.subjects || []).reduce((a2, su) => a2 + su.topics.reduce((a3, tp) => a3 + tp.questions.length, 0), 0), 0);
    return `<button type="button" class="stream-card" data-stream="${st.id}">
      <b>${escapeHTML(st.name)}</b><span>${escapeHTML(st.tagline)}</span><span>${n} soalan</span></button>`;
  }).join('');
  $('streamPick').querySelectorAll('[data-stream]').forEach((b) => {
    b.onclick = () => pickStream(b.dataset.stream);
  });
}

function pickStream(id) {
  S.streamId = id;
  S.levelId = stream().levels[0].id;
  S.subjectId = 'all';
  S.topicId = 'all';
  $('streamPick').querySelectorAll('[data-stream]').forEach((b) => b.classList.toggle('active', b.dataset.stream === id));
  fillLevels();
}

function fillLevels() {
  $('level').innerHTML = stream().levels.map((lv) =>
    `<option value="${lv.id}"${lv.soon ? ' disabled' : ''}>${escapeHTML(lv.name)}${lv.soon ? ' (akan datang)' : ''}</option>`).join('');
  if (level().soon) { const first = stream().levels.find((x) => !x.soon); if (first) S.levelId = first.id; }
  $('level').value = S.levelId;
  fillSubjects();
}

function fillSubjects() {
  const subs = level().subjects || [];
  $('subject').innerHTML = `<option value="all">Semua subjek</option>` +
    subs.map((su) => `<option value="${su.id}">${escapeHTML(su.name)}</option>`).join('');
  $('subject').disabled = subs.length === 0;
  $('subject').value = S.subjectId = 'all';
  fillTopics();
}

function fillTopics() {
  const subs = (level().subjects || []).filter((su) => S.subjectId === 'all' || su.id === S.subjectId);
  const list = [];
  subs.forEach((su) => su.topics.forEach((tp) => list.push({ su, tp })));
  $('topic').innerHTML = `<option value="all">Semua topik</option>` +
    list.map(({ su, tp }) => `<option value="${tp.id}">${escapeHTML(su.name)} — ${escapeHTML(tp.name)}</option>`).join('');
  $('topic').disabled = list.length === 0;
  $('topic').value = S.topicId = 'all';
  $('gradeLabel').textContent = `${stream().name} · ${level().name}`;
  startQuiz();
}

/* ------------------------------------------------------------------- quiz */
function requestedCount(n, max) { return n === 'Semua' ? max : Math.min(Number(n), max); }

function startQuiz() {
  const base = poolForScope();
  if (!base.length) {
    S.quiz = []; S.index = 0; S.score = 0;
    $('prompt').textContent = 'Topik ini belum ada soalan lagi.';
    $('questionBody').innerHTML = ''; $('feedback').textContent = '';
    $('questionNumber').textContent = 'Soalan'; $('topicBadge').textContent = '—';
    $('check').disabled = true; $('next').hidden = true;
    $('scoreLabel').textContent = 'Belum mula';
    return;
  }
  const n = requestedCount($('count').value, base.length);
  S.quiz = shuffle(base).slice(0, n).map((q, i) => ({ ...materialize(q), _mode: i }));
  S.index = 0; S.score = 0; S.choice = null; S.checked = false;
  renderQuestion();
}

function renderQuestion() {
  const q = S.quiz[S.index];
  $('feedback').textContent = ''; $('feedback').className = '';
  $('check').disabled = true; $('next').hidden = true; S.choice = null; S.checked = false;

  if (!q) {
    $('prompt').textContent = 'Latihan selesai! 🎉';
    $('questionBody').innerHTML = '';
    $('questionNumber').textContent = 'Selesai';
    $('feedback').textContent = `Markah: ${S.score} / ${S.quiz.length}`;
    $('feedback').className = S.score === S.quiz.length ? 'ok' : '';
    saveProgress(); return;
  }

  $('questionNumber').textContent = `Soalan ${S.index + 1} daripada ${S.quiz.length}`;
  $('topicBadge').textContent = q._topic || '—';
  const body = $('questionBody');

  if (q.t === 'mcq') {
    $('prompt').textContent = q.p;
    const opts = shuffle(q.o);
    const cls = q.dir === 'rtl' ? 'option jawi' : 'option';
    const attr = q.dir === 'rtl' ? ' lang="ms-Arab" dir="rtl"' : '';
    body.innerHTML = `<div class="options">${opts.map((o) =>
      `<button class="${cls}" type="button"${attr} data-answer="${escapeHTML(o)}">${escapeHTML(o)}</button>`).join('')}</div>`;
    body.querySelectorAll('.option').forEach((b) => {
      b.onclick = () => {
        if (S.checked) return;
        body.querySelectorAll('.option').forEach((x) => x.classList.remove('selected'));
        b.classList.add('selected'); S.choice = b.dataset.answer; $('check').disabled = false;
      };
    });
  } else if (q.t === 'type') {
    $('prompt').textContent = q.p;
    body.innerHTML = `<input id="answerInput" class="answer-input" autocomplete="off" aria-label="Jawapan" placeholder="Taip jawapan di sini">`;
    const input = $('answerInput');
    input.oninput = () => { $('check').disabled = !input.value.trim(); };
    input.onkeydown = (e) => { if (e.key === 'Enter' && !$('check').disabled) checkAnswer(); };
    setTimeout(() => input.focus(), 30);
  }
  updateBar();
}

function checkAnswer() {
  if (S.checked) return;
  const q = S.quiz[S.index];
  let given = S.choice;
  if (q.t === 'type') given = ($('answerInput') ? $('answerInput').value : '').trim();
  if (!given) return;

  const want = q.a;
  const wantN = num(want), givenN = num(given);
  let ok;
  if (wantN !== null && givenN !== null && /^[\d\s]+$/.test(String(want).replace(/[.,]/g, ''))) ok = wantN === givenN;
  else ok = norm(given) === norm(want) || (q.accept || []).some((x) => norm(x) === norm(given));

  S.checked = true;
  if (ok) S.score++;
  $('feedback').textContent = ok ? 'Betul! 🎉' : `Belum tepat. Jawapan: ${q.a}`;
  $('feedback').className = ok ? 'ok' : 'wrong';

  if (q.t === 'mcq') {
    $('questionBody').querySelectorAll('.option').forEach((b) => {
      if (b.dataset.answer === q.a) b.classList.add('correct');
      else if (b.dataset.answer === given) b.classList.add('wrong');
    });
  } else {
    const input = $('answerInput');
    if (input) input.disabled = true;
  }
  $('check').disabled = true;
  $('next').hidden = false;
  $('next').textContent = S.index === S.quiz.length - 1 ? 'Lihat markah' : 'Soalan seterusnya';
  saveProgress();
}

function nextQuestion() { S.index++; renderQuestion(); }

function updateBar() {
  $('scoreLabel').textContent = S.quiz.length ? `Markah: ${S.score} / ${S.quiz.length}` : 'Belum mula';
  $('progressBar').style.width = S.quiz.length ? `${(100 * S.index) / S.quiz.length}%` : '0%';
}

/* --------------------------------------------------------------- progress */
function progressKey() { return `kelasnadi.progress.${S.profile}`; }

function saveProgress() {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(progressKey()) || '{}'); } catch (e) { all = {}; }
  const q = S.quiz[0] || {};
  const key = `${stream().name} · ${level().name} · ${q._topic || 'Semua topik'}`;
  const prev = all[key] || { best: 0, total: 0, done: 0 };
  all[key] = {
    best: Math.max(prev.best, S.score),
    total: S.quiz.length || prev.total,
    done: (prev.done || 0) + 1,
  };
  localStorage.setItem(progressKey(), JSON.stringify(all));
  updateBar();
  renderProgressList();
}

function renderProgressList() {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(progressKey()) || '{}'); } catch (e) { all = {}; }
  const keys = Object.keys(all);
  if (!keys.length) { $('progressList').textContent = 'Belum ada markah disimpan.'; return; }
  $('progressList').innerHTML = keys.map((k) => {
    const v = all[k];
    return `<div>• ${escapeHTML(k)} — terbaik <b>${v.best}/${v.total}</b> (${v.done}× cuba)</div>`;
  }).join('');
}

/* ------------------------------------------------------------------ cetak */
function printRoot() {
  let root = $('print-root');
  if (!root) { root = document.createElement('div'); root.id = 'print-root'; document.body.append(root); }
  return root;
}

function worksheetItems() {
  const base = poolForScope();
  const n = requestedCount($('count').value, base.length);
  return shuffle(base).slice(0, n).map(materialize);
}

function scopeTitle() {
  const su = subject();
  return `${stream().name} · ${level().name}${su ? ' · ' + su.name : ''}` +
    (S.topicId !== 'all' && topic() ? ` · ${topic().name}` : '') + ` · ${S.profile}`;
}

function printWorksheet() {
  const items = worksheetItems();
  if (!items.length) { alert('Tiada soalan untuk dicetak pada pilihan ini.'); return; }

  const rows = items.map((q, i) => {
    if (q.t === 'mcq') {
      const opts = q.o.map((o, j) => `${'abcd'[j]}) ${escapeHTML(o)}`).join(' &nbsp; ');
      const rtl = q.dir === 'rtl' ? ' rtl' : '';
      return `<div class="item"><span class="num">${i + 1}.</span><span class="qtext${rtl}">${escapeHTML(q.p)}<div class="opts">${opts}</div></span></div>`;
    }
    return `<div class="item"><span class="num">${i + 1}.</span><span class="qtext">${escapeHTML(q.p)} <span class="blank"></span></span></div>`;
  }).join('');

  const keys = items.map((q, i) => {
    const ans = q.t === 'mcq' ? q.a : q.a;
    const rtl = q.dir === 'rtl' ? ' rtl' : '';
    return `<div class="item"><span class="num">${i + 1}.</span><span class="qtext${rtl}">${escapeHTML(q.p)} → <b>${escapeHTML(ans)}</b></span></div>`;
  }).join('');

  printRoot().innerHTML = `
    <article class="sheet">
      <h1>Kelas Nadi — Lembaran Latihan</h1>
      <p class="subtitle">${escapeHTML(scopeTitle())} &nbsp;·&nbsp; Nama: ____________________ &nbsp; Tarikh: __________</p>
      <div class="rule"></div>
      <p class="intro">Jawab semua soalan. Tulis jawapan pada ruang yang disediakan.</p>
      ${rows}
      <p class="foot">Kelas Nadi — latihan sokongan keluarga, bukan bahan rasmi KPM. Percuma untuk kegunaan keluarga, sekolah dan kelas agama.</p>
    </article>
    <article class="sheet">
      <h1>Skema Jawapan</h1>
      <p class="subtitle">${escapeHTML(scopeTitle())} &nbsp;·&nbsp; untuk ibu bapa / guru</p>
      <div class="rule"></div>
      ${keys}
      <p class="foot">Semak bersama anak. Ulang topik yang selalu salah.</p>
    </article>`;
  window.print();
}

const JAWI_TRACE = ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'و', 'ه', 'ي', 'چ', 'ݢ', 'ڠ', 'ڤ'];

function traceRows(chars) {
  return chars.map((c) => {
    const cells = Array.from({ length: 8 }, (_, i) =>
      `<span class="trace-cell"${i === 0 ? ' style="color:#555"' : ''} lang="ms-Arab">${c}</span>`).join('');
    return `<div class="trace-row">${cells}</div>`;
  }).join('');
}

function printTracing() {
  let title, chars;
  if (S.streamId === 'agama') { title = 'Lembaran Surih Huruf Jawi'; chars = JAWI_TRACE; }
  else if (stream().name === 'Prasekolah') { title = 'Lembaran Surih A–Z, a–z, 1–10'; chars = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', ...'abcdefghijklmnopqrstuvwxyz', ...'12345678910'.split('')]; }
  else { title = 'Lembaran Surih A–Z, a–z, 1–10'; chars = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', ...'abcdefghijklmnopqrstuvwxyz', ...'12345678910'.split('')]; }

  printRoot().innerHTML = `
    <article class="sheet">
      <h1>${title}</h1>
      <p class="subtitle">${escapeHTML(level().name)} &nbsp;·&nbsp; Nama: ____________________ &nbsp; Tarikh: __________</p>
      <div class="rule"></div>
      <p class="intro">Surih huruf kelabu dahulu, kemudian tulis sendiri. Ulang setiap baris 2–3 kali.</p>
      ${traceRows(chars)}
      <p class="foot">Kelas Nadi — lembaran surih percuma. Cetak semula bila perlu.</p>
    </article>`;
  window.print();
}

/* ------------------------------------------------------------------- boot */
init()
  .then(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  })
  .catch((err) => {
    console.error(err);
    $('prompt').textContent = 'Kandungan latihan tak dapat dimuatkan. Sila muat semula halaman.';
  });
