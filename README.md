# Kelas Nadi

App pembelajaran percuma untuk murid sekolah rendah Malaysia — **Prasekolah**, **Sekolah Kebangsaan** dan **Sekolah Agama** — dengan latihan dalam app dan lembaran cetak A4.

Live: https://techkitamy.github.io/kelasnadi/

Vanilla HTML + CSS + JavaScript. Tiada rangka kerja, tiada build step, tiada backend, tiada login, tiada penjejakan. Bank soalan dalam `content.json`.

## Fungsi

- Pilih aliran → tahap/tahun → subjek → topik → bilangan (10 / 15 / 20 / Semua)
- **Dua cara jawab:** Lembaran (semua soalan sekali pandang) atau Satu-satu (fokus besar, dengan butang Seterusnya)
- Tiga jenis soalan: aneka pilihan (termasuk Jawi RTL), taip jawapan, dan **soalan matematik dijana tanpa had**
- Gamifikasi: bintang ★, streak semasa 🔥, HUD kemajuan, animasi + confetti, bunyi betul/salah (boleh mute)
- Butang **"Betulkan yang salah"** — ulang semula soalan yang tersilap
- **Cetak lembaran latihan + skema jawapan** (A4) dan **lembaran surih** (garis tiga; A–Z, a–z, 0–9, 32 huruf Jawi)
- PWA: boleh dipasang pada telefon, berfungsi offline selepas muat turun pertama
- Panel **Kemajuan [nama anak]** + butang padam (dengan pengesahan)

## Struktur fail

```
index.html        UI
style.css         gaya skrin + gaya cetak A4
core.js           LOGIK TULEN (boleh diuji Node) — skop, markah, progress, janaan matematik
app.js            logik DOM/app
content.json      bank soalan (dijana oleh tools/build_content.py)
version.json      versi deploy (WAJIB padan APP_VERSION dalam app.js)
tools/build_content.py   sumber bank soalan -> content.json
tools/make_icons.py      jana ikon PWA (Pillow)
tests/test_content.py    pengesahan bank soalan
tests/test_assets.py     aset, manifest, PWA, privasi, service worker
tests/core.test.js       ujian regresi logik (node --test)
manifest.json, sw.js     PWA + offline
.github/workflows/ci.yml CI: semua ujian dijalankan setiap push/PR
```

## Ujian

```sh
python3 -m unittest discover -s tests -v     # 34 ujian (kandungan, aset, PWA, privasi)
node --check core.js && node --check app.js && node --check sw.js
node --test tests/core.test.js               # 12 ujian regresi logik

# E2E dalam Chromium sebenar (perlu sekali sahaja: npm install)
npm install
npm run test:e2e                             # 30 ujian E2E
```

E2E (`tests/e2e/`) membuka app dalam Chromium, klik DOM sebenar dan menguji:
aliran kuiz penuh, snapshot skop, cetakan (termasuk printToPDF), progress, kemas kini
service worker (`v3.0.0 → v3.0.1`), offline sebenar (pelayan dimatikan) dan 5 viewport
(360×800, 390×844, 412×915, tablet portrait, desktop).

`puppeteer-core` ialah **devDependency sahaja** — ia tidak digunakan oleh app (app kekal
HTML/CSS/JS statik tanpa dependency runtime). Chromium: `findChrome()` guna
`PUPPETEER_EXECUTABLE_PATH` / `CHROME_PATH` kalau diset, jika tidak cari dalam cache Playwright.

## Ujian peranti sebenar (manual — belum dijalankan)

- `docs/qa-android.md` — checklist Android/Chrome (PWA, ikon, standalone, bunyi, offline, cetak, Jawi, putaran)
- `docs/qa-ios-safari.md` — checklist iPhone/Safari (Tambah ke Skrin Utama, audio iOS, offline, Jawi)

## Tambah / ubah soalan

Sunting `tools/build_content.py`, kemudian:

```sh
python3 tools/build_content.py      # jana semula content.json
python3 -m unittest discover -s tests -v
```

## Jalankan di komputer

```sh
python3 -m http.server 8080
# buka http://localhost:8080
```

## Cara rilis (WAJIB)

1. Naikkan versi di **dua tempat**: `version.json` dan `const APP_VERSION` dalam `app.js` (mesti sama — ada ujian untuk ini).
2. Naikkan `const CACHE` dalam `sw.js` (contoh `kelasnadi-v5` → `kelasnadi-v6`) bila aset berubah.
3. `python3 -m unittest discover -s tests -v` + `node --test tests/core.test.js` — semua mesti lulus.
4. `git push` → GitHub Pages publish sendiri (~30–60 saat).

## Nota teknikal yang penting (jangan rosakkan)

- **Kuiz ada snapshot.** `startQuiz()` menyimpan `S.active.meta` (profile, aliran, tahap, subjek, topik, bilangan, tajuk). Semua markah, progress dan cetakan guna snapshot ini — bukan selector semasa. Tukar pilihan semasa kuiz berjalan → bar pilihan (Mula kuiz baru / Kekal kuiz lama), tiada campuran skop.
- **Kunci progress ikut ID**, bukan nama topik: `nama|aliran|tahap|subjek|topik`, simpan `plays, lastRight/Total/Percent, bestRight/Total/Percent, updatedAt`. Best mesti kekal pasangan run yang sama (10/10 tidak boleh dicemar oleh 15/20).
- **Service worker: network-first + `cache: 'no-cache'`.** Jangan kembali ke cache-first (pengguna tersekat pada versi lama). Precache mesti guna `fetch(url, { cache: 'reload' })` — respons 304 pernah ditolak dan menyebabkan app gagal offline.
- **Amaran "versi baru" guna `version.json`**, bukan kejadian service worker (elak amaran palsu). SW baru sengaja **menunggu**; butang "Muat semula" menghantar `SKIP_WAITING`.
- **Gaya cetak:** semua UI (topbar, bar kemas kini, bar skop, confetti) mesti kekal tersembunyi dalam `@media print` — pernah tercetak dan merosakkan lembaran.
- **HUD:** bintang guna ketepatan soalan yang **sudah dijawab** (bukan jumlah keseluruhan), supaya murid tidak nampak 0 bintang awal-awal.
- **Privasi:** tiada aset/URL pihak ketiga (ada ujian yang memeriksa ini), tiada analitik, tiada iklan.

## Nota kandungan

Bank soalan ini **perintis**. Ia disusun ikut standard umum KSPK (Prasekolah), KSSR (Sekolah Kebangsaan) dan
bidang KSRA/KAFA (Sekolah Agama), tetapi **belum disemak item demi item oleh guru**. Ia bahan latihan sokongan
keluarga — **bukan bahan rasmi KPM**. Ejaan Jawi ialah perkataan asas; guru boleh gunakan variasi buku teks.

## Lesen

Percuma untuk kegunaan keluarga, sekolah dan kelas agama.
