# Kelas Nadi

App pembelajaran percuma untuk murid sekolah rendah Malaysia — **Prasekolah**, **Sekolah Kebangsaan** dan **Sekolah Agama** — dengan latihan dalam app dan lembaran cetak A4.

Live: https://techkitamy.github.io/kelasnadi/

## Fungsi

- Pilih aliran → tahap/tahun → subjek → topik → bilangan soalan (10 / 15 / 20 / Semua)
- **Dua cara jawab:**
  - **Lembaran** — semua soalan sekali pandang (skrol), jawab terus, tanda serta-merta
  - **Satu-satu** — fokus satu soalan besar (sesuai untuk murid kecil)
- Tiga jenis soalan:
  - **aneka pilihan** (termasuk soalan Jawi berarah kanan-ke-kiri)
  - **taip jawapan** (Rumi / angka)
  - **dijana automatik** — soalan matematik (tambah / tolak) tanpa had, supaya murid boleh berlatih berulang
- **Gamifikasi:** bintang (★☆☆), streak 🔥, HUD kemajuan, animasi + confetti, bunyi betul/salah (boleh mute)
- Butang **"Betulkan yang salah"** — ulang semula soalan yang tersilap
- Markah + kemajuan disimpan ikut profil anak (nama) dalam telefon
- **Cetak lembaran latihan + skema jawapan** (A4)
- **Lembaran surih sebenar:** garis tiga (atas / tengah putus-putus / bawah) — 1 huruf contoh + 6 huruf titik untuk disurih + 1 petak tulis sendiri; set A–Z, a–z, 0–9, dan huruf Jawi/hijaiyah
- PWA: boleh dipasang pada telefon, guna offline selepas muat turun pertama
- Tiada akaun, tiada iklan, tiada penjejakan. Semua data kekal dalam peranti pengguna.

> Service worker guna strategi **network-first** supaya kemas kini terus nampak (versi awal guna cache-first — pengguna tersekat pada versi lama).

## Struktur fail

```
index.html        UI
style.css         gaya skrin + gaya cetak A4
app.js            logik app (tiada rangka kerja, tiada build step)
content.json      bank soalan (dijana oleh tools/build_content.py)
tools/build_content.py   sumber bank soalan -> content.json
tests/test_content.py    pengesahan bank soalan
manifest.json, sw.js     PWA + offline
```

## Tambah / ubah soalan

Sunting `tools/build_content.py`, kemudian:

```sh
python3 tools/build_content.py      # jana semula content.json
python3 -m unittest discover -s tests -v
node --check app.js
```

## Jalankan di komputer

```sh
python3 -m http.server 8080
# buka http://localhost:8080
```

## Nota kandungan

Bank soalan ini **perintis**. Ia disusun ikut standard umum KSPK (Prasekolah), KSSR (Sekolah Kebangsaan)
dan bidang KSRA/KAFA (Sekolah Agama), tetapi **belum disahkan item demi item oleh guru**. Ia bahan
latihan sokongan keluarga — **bukan bahan rasmi KPM**. Ejaan Jawi ialah perkataan asas; guru boleh
gunakan variasi buku teks.

## Lesen

Percuma untuk kegunaan keluarga, sekolah dan kelas agama.
