/* Ujian regresi logik tulen — jalankan: node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const C = require('../core.js');

/* fixture: 2 subjek, subjek kedua ada topik — untuk ujian 'Semua subjek + satu topik' */
const DATA = {
  streams: [
    {
      id: 'pra', name: 'Prasekolah', tagline: 'x',
      levels: [{
        id: 'pra1', name: 'Prasekolah (5–6 tahun)',
        subjects: [
          { id: 'abc', name: 'Huruf ABC', topics: [{ id: 'abc-kenal', name: 'Kenal huruf', questions: [{ t: 'mcq', p: 'A?', o: ['A', 'B'], a: 'A' }] }] },
          { id: 'warna', name: 'Warna', topics: [{ id: 'warna-warna', name: 'Kenal warna', questions: [{ t: 'mcq', p: 'Biru?', o: ['Biru', 'Merah'], a: 'Biru' }] }] },
        ],
      }],
    },
    { id: 'sk', name: 'SK', tagline: 'y', levels: [{ id: 't1', name: 'Tahun 1', subjects: [] }] },
  ],
};

test('evaluate: angka, teks, RTL, accept', () => {
  assert.equal(C.evaluate({ a: '20' }, '20'), true);
  assert.equal(C.evaluate({ a: '20' }, ' 21 '), false);
  assert.equal(C.evaluate({ a: 'Buku' }, 'buku'), true);
  assert.equal(C.evaluate({ a: 'بوکو' }, 'بوکو'), true);
  assert.equal(C.evaluate({ a: '7', accept: ['7', 'tujuh'] }, 'tujuh'), true);
  assert.equal(C.evaluate({ a: 'bola' }, 'bolah'), false);
});

test('bintang: peratus keseluruhan dan ketepatan semasa kuiz', () => {
  assert.equal(C.starsFor(10, 10), 3);
  assert.equal(C.starsFor(15, 20), 2);
  assert.equal(C.starsFor(5, 10), 1);
  assert.equal(C.starsFor(0, 10), 0);
  /* bug: 3 soalan dijawab, 3 betul, tapi 15 soalan belum dijawab → dulu 0 bintang */
  assert.equal(C.accuracyStars(3, 3), 3);
  assert.equal(C.accuracyStars(0, 0), 0);
  assert.equal(C.starStr(2), '★★☆');
});

test('streak: current vs best', () => {
  const items = [
    { _done: true, _ok: true }, { _done: true, _ok: true }, { _done: true, _ok: false },
    { _done: true, _ok: true }, { _done: false, _ok: false },
  ];
  assert.equal(C.currentStreak(items), 1);
  assert.equal(C.bestStreak(items), 2);
});

test('progress: best kekal 10/10 walaupun run seterusnya 15/20', () => {
  const key = C.progressKey('Aisyah', { streamId: 'pra', levelId: 'pra1', subjectId: 'abc', topicId: 'abc-kenal' });
  let store = {};
  store[key] = C.mergeRun(store[key], { right: 10, total: 10 }, 'Latihan A', 1000);
  assert.equal(store[key].bestRight, 10);
  assert.equal(store[key].bestTotal, 10);
  assert.equal(store[key].bestPercent, 100);
  assert.equal(store[key].plays, 1);

  store[key] = C.mergeRun(store[key], { right: 15, total: 20 }, 'Latihan A', 2000);
  assert.equal(store[key].bestRight, 10, 'best mesti kekal 10');
  assert.equal(store[key].bestTotal, 10, 'bestTotal mesti pasangan run yang sama');
  assert.equal(store[key].bestPercent, 100);
  assert.equal(store[key].lastRight, 15, 'last = run terakhir');
  assert.equal(store[key].lastTotal, 20);
  assert.equal(store[key].lastPercent, 75);
  assert.equal(store[key].plays, 2);
  assert.equal(store[key].updatedAt, 2000);

  store[key] = C.mergeRun(store[key], { right: 18, total: 20 }, 'Latihan A', 3000);
  assert.equal(store[key].bestPercent, 100, '90% < 100% jadi best lama (100%) kekal');
  assert.equal(store[key].bestRight, 10);
  assert.equal(store[key].bestTotal, 10);
  assert.equal(store[key].lastRight, 18, 'last mesti run 18/20');
  assert.equal(store[key].lastPercent, 90);
  assert.equal(store[key].plays, 3);
});

test('progress: kunci stabil ikut ID, bukan nama topik', () => {
  const a = C.progressKey('Aisyah', { streamId: 'pra', levelId: 'pra1', subjectId: 'abc', topicId: 'abc-kenal' });
  const b = C.progressKey('Aisyah', { streamId: 'pra', levelId: 'pra1', subjectId: 'abc', topicId: 'abc-kenal' });
  const c = C.progressKey('Aisyah', { streamId: 'pra', levelId: 'pra1', subjectId: 'abc', topicId: 'warna-warna' });
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.equal(a, 'Aisyah|pra|pra1|abc|abc-kenal');
  assert.equal(C.progressKey('   ', {}), 'tetamu|-|-|all|all', 'skop kosong mesti kekal deterministik');
});

test('progress: store rosak / padam entry', () => {
  const store = { k1: C.newEntry('Satu'), k2: C.newEntry('Dua') };
  store.k2.updatedAt = 5000; store.k1.updatedAt = 1000;
  assert.equal(C.sortedEntries(store)[0].key, 'k2');
  const after = C.deleteEntry(store, 'k2');
  assert.equal(Object.keys(after).length, 1);
  assert.equal(after.k1.label, 'Satu');
});

test('localStorage rosak: safeJsonParse tak meledak', () => {
  assert.deepEqual(C.safeJsonParse('{bukan json', {}), {});
  assert.deepEqual(C.safeJsonParse('null', { a: 1 }), { a: 1 });
  assert.deepEqual(C.safeJsonParse('[1,2]', { a: 1 }), { a: 1 });
  assert.deepEqual(C.safeJsonParse(undefined, { a: 1 }), { a: 1 });
  assert.deepEqual(C.safeJsonParse('{"a":2}', {}), { a: 2 });
});

test('nama anak: dipotong 30 aksara, aksara kawalan dibuang', () => {
  assert.equal(C.cleanProfile('   '), 'tetamu');
  assert.equal(C.cleanProfile('Aisyah\nBinti\tZaidi'), 'Aisyah Binti Zaidi');
  assert.equal(C.cleanProfile('x'.repeat(80)).length, 30);
  assert.equal(C.cleanProfile(undefined), 'tetamu');
});

test('BUG 3: Semua subjek + satu topik — findTopic jalan merentas subjek', () => {
  const scope = { streamId: 'pra', levelId: 'pra1', subjectId: 'all', topicId: 'warna-warna' };
  const hit = C.findTopic(DATA, scope.streamId, scope.levelId, scope.topicId);
  assert.ok(hit, 'topik mesti dijumpai walaupun subjectId = all');
  assert.equal(hit.subject.id, 'warna');
  assert.equal(hit.topic.name, 'Kenal warna');
  assert.equal(C.scopeLabel(DATA, scope), 'Prasekolah · Prasekolah (5–6 tahun) · Kenal warna');
  /* topik tiada → null, bukan error */
  assert.equal(C.findTopic(DATA, 'pra', 'pra1', 'topik-hantu'), null);
  assert.equal(C.findTopic(DATA, 'pra', 'pra1', 'all'), null);
});

test('poolForScope: subjectId all + topicId tertentu hanya pulangkan topik itu', () => {
  const all = C.poolForScope(DATA, { streamId: 'pra', levelId: 'pra1', subjectId: 'all', topicId: 'all' });
  assert.equal(all.length, 2);
  const one = C.poolForScope(DATA, { streamId: 'pra', levelId: 'pra1', subjectId: 'all', topicId: 'warna-warna' });
  assert.equal(one.length, 1);
  assert.equal(one[0]._topic, 'Kenal warna');
  assert.equal(one[0]._topicId, 'warna-warna');
  const subj = C.poolForScope(DATA, { streamId: 'pra', levelId: 'pra1', subjectId: 'abc', topicId: 'all' });
  assert.equal(subj.length, 1);
  const none = C.poolForScope(DATA, { streamId: 'sk', levelId: 't1', subjectId: 'all', topicId: 'all' });
  assert.equal(none.length, 0, 'skop kosong mesti pulangkan 0, bukan error');
});

test('soalan matematik dijana: hasil betul dan dalam julat', () => {
  for (let i = 0; i < 300; i++) {
    const add = C.materializeGen({ t: 'gen', gen: 'math_add', max: 20 });
    const m = add.p.match(/^(\d+) \+ (\d+) = \?$/);
    assert.ok(m, 'format tambah betul');
    const a = Number(m[1]), b = Number(m[2]);
    assert.ok(a >= 1 && b >= 1 && a + b <= 20, `jumlah ${a}+${b} mesti <= 20`);
    assert.equal(add.a, String(a + b));
    assert.ok(C.evaluate(add, add.a));

    const sub = C.materializeGen({ t: 'gen', gen: 'math_sub', max: 20 });
    const ms = sub.p.match(/^(\d+) − (\d+) = \?$/);
    assert.ok(ms);
    const x = Number(ms[1]), y = Number(ms[2]);
    assert.ok(x - y >= 0, 'tolak tak boleh negatif');
    assert.equal(sub.a, String(x - y));
  }
  assert.equal(C.materializeGen({ t: 'mcq', p: 'x', a: 'x' }).t, 'mcq', 'soalan biasa tak diubah');
});

test('relativeTime untuk panel kemajuan', () => {
  const now = 1_000_000_000;
  assert.equal(C.relativeTime(0, now), 'tiada rekod');
  assert.equal(C.relativeTime(now - 30_000, now), 'baru sahaja');
  assert.equal(C.relativeTime(now - 5 * 60_000, now), '5 minit lalu');
  assert.equal(C.relativeTime(now - 3 * 3600_000, now), '3 jam lalu');
});
