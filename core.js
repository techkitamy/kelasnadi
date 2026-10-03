/* Kelas Nadi — core.js
   Logik TULEN (tiada DOM, tiada localStorage, tiada rangkaian).
   Guna di browser (window.KelasNadiCore) DAN di Node (module.exports) supaya boleh diuji automatik.
   Versi: 3.0
*/
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.KelasNadiCore = api;
}(typeof self !== 'undefined' ? self : this, function () {

  /* ------------------------------------------------------------ asas teks */
  function norm(s) {
    return String(s === undefined || s === null ? '' : s)
      .toLowerCase().trim()
      .replace(/[\s\u0640\u200f\u200e]/g, '')
      .replace(/[.,!?'"()\u2014\u2013-]/g, '');
  }

  function numeric(s) {
    const t = String(s === undefined || s === null ? '' : s).trim();
    if (!/^-?\d+([.,]\d+)?$/.test(t)) return null;
    const v = Number(t.replace(',', '.'));
    return Number.isFinite(v) ? v : null;
  }

  function shuffle(arr, rng) {
    const r = Array.isArray(arr) ? [...arr] : [];
    const rand = typeof rng === 'function' ? rng : Math.random;
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = r[i]; r[i] = r[j]; r[j] = t;
    }
    return r;
  }

  /* ------------------------------------------------------- localStorage IO */
  function safeJsonParse(text, fallback) {
    try {
      if (text === undefined || text === null || text === '') return fallback;
      const v = JSON.parse(text);
      if (v === null || typeof v !== 'object' || Array.isArray(v)) return fallback;
      return v;
    } catch (e) { return fallback; }
  }

  function cleanProfile(name) {
    const t = String(name === undefined || name === null ? '' : name)
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 30);
    return t || 'tetamu';
  }

  /* ------------------------------------------------------ skop & kandungan */
  function findStream(data, streamId) {
    return (data && data.streams ? data.streams : []).find((s) => s.id === streamId) || null;
  }
  function findLevel(data, streamId, levelId) {
    const st = findStream(data, streamId);
    return st ? (st.levels || []).find((l) => l.id === levelId) || null : null;
  }
  function findSubject(data, streamId, levelId, subjectId) {
    if (subjectId === 'all') return null;
    const lv = findLevel(data, streamId, levelId);
    return lv ? (lv.subjects || []).find((s) => s.id === subjectId) || null : null;
  }

  /* Cari topik merentasi SEMUA subjek dalam satu tahap (fix subjectId === 'all') */
  function findTopic(data, streamId, levelId, topicId) {
    if (!topicId || topicId === 'all') return null;
    const lv = findLevel(data, streamId, levelId);
    if (!lv) return null;
    for (const su of lv.subjects || []) {
      const tp = (su.topics || []).find((t) => t.id === topicId);
      if (tp) return { subject: su, topic: tp };
    }
    return null;
  }

  function scopeLabel(data, scope) {
    const st = findStream(data, scope.streamId);
    const lv = findLevel(data, scope.streamId, scope.levelId);
    const parts = [];
    if (st) parts.push(st.name);
    if (lv) parts.push(lv.name);
    if (scope.subjectId && scope.subjectId !== 'all') {
      const su = findSubject(data, scope.streamId, scope.levelId, scope.subjectId);
      if (su) parts.push(su.name);
    }
    const hit = findTopic(data, scope.streamId, scope.levelId, scope.topicId);
    if (hit) parts.push(hit.topic.name);
    return parts.join(' · ') || 'Latihan';
  }

  /* Kumpul soalan mengikut skop. subjectId 'all' + topicId tertentu mesti jalan. */
  function poolForScope(data, scope) {
    const lv = findLevel(data, scope.streamId, scope.levelId);
    const out = [];
    if (!lv) return out;
    (lv.subjects || []).forEach((su) => {
      if (scope.subjectId && scope.subjectId !== 'all' && su.id !== scope.subjectId) return;
      (su.topics || []).forEach((tp) => {
        if (scope.topicId && scope.topicId !== 'all' && tp.id !== scope.topicId) return;
        (tp.questions || []).forEach((q) => {
          out.push(Object.assign({}, q, { _topic: tp.name, _subject: su.name, _topicId: tp.id, _subjectId: su.id }));
        });
      });
    });
    return out;
  }

  /* Soalan matematik dijana tanpa had */
  function materializeGen(q, rng) {
    if (!q || q.t !== 'gen') return q;
    const rand = typeof rng === 'function' ? rng : Math.random;
    const rnd = (n) => Math.floor(rand() * n);
    const max = q.max || 20;
    let prompt, ans;
    if (q.gen === 'math_sub') {
      const a = 2 + rnd(Math.max(1, max - 1));
      const b = 1 + rnd(Math.max(1, a - 1));
      prompt = `${a} \u2212 ${b} = ?`; ans = String(a - b);
    } else if (q.gen === 'math_mul') {
      const a = 1 + rnd(9), b = 1 + rnd(9);
      prompt = `${a} \u00d7 ${b} = ?`; ans = String(a * b);
    } else {
      const a = 1 + rnd(Math.max(1, max - 1));
      const b = 1 + rnd(Math.max(1, max - a));
      prompt = `${a} + ${b} = ?`; ans = String(a + b);
    }
    return Object.assign({}, q, { t: 'type', p: prompt, a: ans, accept: [ans] });
  }

  function evaluate(q, given) {
    if (!q) return false;
    const wantN = numeric(q.a), gotN = numeric(given);
    if (wantN !== null && gotN !== null) return wantN === gotN;
    if (norm(given) === norm(q.a)) return true;
    return (q.accept || []).some((x) => norm(x) === norm(given));
  }

  /* --------------------------------------------------------------- markah */
  function starsForPercent(p) {
    if (!Number.isFinite(p)) return 0;
    if (p >= 90) return 3;
    if (p >= 70) return 2;
    if (p >= 50) return 1;
    return 0;
  }
  function starsFor(right, total) {
    if (!total || total <= 0) return 0;
    return starsForPercent((100 * right) / total);
  }
  /* Bintang semasa kuiz: guna soalan yang SUDAH dijawab sahaja */
  function accuracyStars(right, answered) {
    if (!answered || answered <= 0) return 0;
    return starsForPercent((100 * right) / answered);
  }
  function starStr(n) {
    const v = Math.max(0, Math.min(3, Number(n) || 0));
    return '\u2605'.repeat(v) + '\u2606'.repeat(3 - v);
  }
  function currentStreak(items) {
    let run = 0;
    (items || []).forEach((q) => { if (!q._done) return; run = q._ok ? run + 1 : 0; });
    return run;
  }
  function bestStreak(items) {
    let best = 0, run = 0;
    (items || []).forEach((q) => { if (!q._done) return; if (q._ok) { run++; best = Math.max(best, run); } else run = 0; });
    return best;
  }
  function countDone(items) { return (items || []).filter((q) => q._done).length; }
  function countRight(items) { return (items || []).filter((q) => q._done && q._ok).length; }
  function percent(right, total) { return total > 0 ? Math.round((100 * right) / total) : 0; }

  /* -------------------------------------------------------------- progress */
  /* Kunci stabil berasaskan ID — bukan nama topik soalan pertama */
  function progressKey(profile, scope) {
    const s = scope || {};
    return [cleanProfile(profile), s.streamId || '-', s.levelId || '-', s.subjectId || 'all', s.topicId || 'all'].join('|');
  }
  const PROGRESS_VERSION = 1;

  function newEntry(label) {
    return {
      v: PROGRESS_VERSION,
      label: label || '',
      plays: 0,
      lastRight: 0, lastTotal: 0, lastPercent: 0, lastAt: 0,
      bestRight: 0, bestTotal: 0, bestPercent: 0, bestAt: 0,
      updatedAt: 0,
    };
  }

  /* Kemas kini satu entry dengan satu run. Best mesti kekal pasangan run terbaik. */
  function mergeRun(prev, run, label, now) {
    const ts = Number.isFinite(now) ? now : Date.now();
    const e = Object.assign(newEntry(), prev && typeof prev === 'object' ? prev : {});
    const right = Math.max(0, Number(run && run.right) || 0);
    const total = Math.max(0, Number(run && run.total) || 0);
    const pct = percent(right, total);
    if (label) e.label = label;
    e.plays = (Number(e.plays) || 0) + (run && run.countPlay === false ? 0 : 1);
    e.lastRight = right; e.lastTotal = total; e.lastPercent = pct; e.lastAt = ts;
    if (pct > (Number(e.bestPercent) || 0) || (Number(e.bestTotal) || 0) === 0) {
      e.bestRight = right; e.bestTotal = total; e.bestPercent = pct; e.bestAt = ts;
    }
    e.updatedAt = ts;
    return e;
  }

  function sortedEntries(store) {
    return Object.keys(store || {})
      .map((k) => Object.assign({ key: k }, store[k]))
      .sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
  }

  function deleteEntry(store, key) {
    const out = Object.assign({}, store || {});
    delete out[key];
    return out;
  }

  function relativeTime(ms, now) {
    const t = Number.isFinite(now) ? now : Date.now();
    const d = Math.max(0, t - (Number(ms) || 0));
    const min = Math.floor(d / 60000);
    if (!ms) return 'tiada rekod';
    if (min < 1) return 'baru sahaja';
    if (min < 60) return `${min} minit lalu`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} jam lalu`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day} hari lalu`;
    return `${Math.floor(day / 30)} bulan lalu`;
  }

  return {
    norm, numeric, shuffle, safeJsonParse, cleanProfile,
    findStream, findLevel, findSubject, findTopic, scopeLabel, poolForScope,
    materializeGen, evaluate,
    starsForPercent, starsFor, accuracyStars, starStr, currentStreak, bestStreak,
    countDone, countRight, percent,
    progressKey, newEntry, mergeRun, sortedEntries, deleteEntry, relativeTime,
    PROGRESS_VERSION,
  };
}));
