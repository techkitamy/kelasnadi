#!/usr/bin/env python3
"""Bina bank soalan Kelas Nadi -> content.json

Bank ini ialah BANK PERINTIS (starter). Setiap item ditulis ikut standard
KSPK / KSSR / KSRA secara umum, tetapi BELUM disemak item demi item oleh guru.
Jalankan:  python3 tools/build_content.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "content.json"

NOTE = (
    "Bank perintis Kelas Nadi. Soalan disusun ikut standard umum KSPK (Prasekolah), "
    "KSSR (Sekolah Kebangsaan) dan bidang KSRA/KAFA (Sekolah Agama) — tetapi BELUM "
    "disahkan item demi item oleh guru. Gunakan sebagai latihan sokongan keluarga, "
    "bukan sebagai bahan rasmi KPM. Ejaan Jawi bagi perkataan asas; guru boleh guna "
    "variasi buku teks."
)


def M(p, a, opts, direction=None):
    """Soalan aneka pilihan."""
    q = {"t": "mcq", "p": p, "o": list(opts), "a": a}
    if direction:
        q["dir"] = direction
    return q


def T(p, a, accept=None):
    """Soalan taip jawapan."""
    q = {"t": "type", "p": p, "a": a}
    if accept:
        q["accept"] = list(accept)
    return q


def G(gen, **kw):
    """Soalan yang dijana (matematik tanpa had)."""
    q = {"t": "gen", "gen": gen}
    q.update(kw)
    return q


# ---------------------------------------------------------------- PRASEKOLAH
PRA = [
    ("abc", "Huruf ABC", [
        ("huruf-besar", "Kenal huruf besar", [
            M("Huruf besar bagi 'a' ialah?", "A", ["A", "B", "D", "E"]),
            M("Huruf besar bagi 'b' ialah?", "B", ["B", "D", "P", "Q"]),
            M("Huruf kecil bagi 'B' ialah?", "b", ["b", "d", "p", "q"]),
            M("Susunan: A, B, ?, D. Apa huruf kosong?", "C", ["C", "E", "F", "G"]),
            M("Yang mana huruf vokal?", "a", ["a", "m", "k", "t"]),
            M("Huruf pertama dalam perkataan 'bola'?", "b", ["b", "l", "a", "o"]),
            M("Huruf pertama dalam perkataan 'epal'?", "e", ["e", "p", "l", "a"]),
            M("'M' ialah huruf pertama bagi perkataan?", "Mata", ["Mata", "Buku", "Kaki", "Susu"]),
            T("Taip huruf besar yang datang selepas 'C'.", "d", ["d", "D"]),
            T("Taip huruf pertama dalam perkataan 'nasi'.", "n", ["n", "N"]),
        ]),
        ("huruf-kecil", "Huruf kecil & bunyi", [
            M("Huruf kecil bagi 'F' ialah?", "f", ["f", "t", "l", "e"]),
            M("Bunyi huruf 'S' ialah?", "sss", ["sss", "mmm", "bbb", "kkk"]),
            M("Huruf pertama 'rumah' ialah?", "r", ["r", "u", "m", "h"]),
            M("Antara ini yang mana huruf kecil?", "g", ["g", "G", "Q", "R"]),
            M("Jumlah huruf dalam abjad ABC ialah?", "26", ["26", "24", "28", "30"]),
        ]),
    ]),
    ("nombor", "Nombor 1–10", [
        ("kira-objek", "Kira objek", [
            M("Kira epal: 🍎🍎🍎 — berapa?", "3", ["3", "2", "4", "5"]),
            M("Kira bintang: ⭐⭐ — berapa?", "2", ["2", "3", "1", "4"]),
            M("Kira bunga: 🌸🌸🌸🌸 — berapa?", "4", ["4", "3", "5", "6"]),
            M("Kira jari: ✋✋ — berapa?", "10", ["10", "8", "12", "5"]),
            M("Kira ikan: 🐟🐟🐟🐟🐟 — berapa?", "5", ["5", "4", "6", "7"]),
        ]),
        ("urutan-nombor", "Urutan & nilai nombor", [
            M("Nombor selepas 5 ialah?", "6", ["6", "4", "7", "8"]),
            M("Nombor sebelum 3 ialah?", "2", ["2", "4", "5", "1"]),
            M("Nombor terbesar ialah?", "8", ["8", "3", "6", "5"]),
            M("Nombor terkecil ialah?", "1", ["1", "9", "7", "4"]),
            M("Selepas 9 ialah?", "10", ["10", "8", "11", "9"]),
            T("Taip nombor bagi perkataan 'tujuh'.", "7", ["7", "tujuh"]),
            T("Taip nombor bagi perkataan 'empat'.", "4", ["4", "empat"]),
        ]),
        ("tambah-tolak-asas", "Tambah & tolak asas", [
            M("3 + 2 = ?", "5", ["5", "4", "6", "7"]),
            M("5 - 1 = ?", "4", ["4", "6", "5", "3"]),
            M("2 + 2 + 1 = ?", "5", ["5", "4", "6", "3"]),
            M("10 - 3 = ?", "7", ["7", "6", "8", "9"]),
            G("math_add", max=10),
        ]),
    ]),
    ("warna-bentuk", "Warna & Bentuk", [
        ("warna", "Kenal warna", [
            M("Warna pisang yang masak ialah?", "Kuning", ["Kuning", "Biru", "Hitam", "Ungu"]),
            M("Warna daun ialah?", "Hijau", ["Hijau", "Merah", "Putih", "Perang"]),
            M("Warna susu segar ialah?", "Putih", ["Putih", "Hitam", "Merah", "Biru"]),
            M("Warna langit pada siang hari yang cerah?", "Biru", ["Biru", "Coklat", "Ungu", "Hijau"]),
            M("Merah + kuning menjadi warna apa?", "Oren", ["Oren", "Ungu", "Hijau", "Hitam"]),
        ]),
        ("bentuk", "Kenal bentuk", [
            M("Bentuk bola ialah?", "Bulat", ["Bulat", "Segi empat", "Segi tiga", "Bujur"]),
            M("Bentuk bumbung rumah biasanya?", "Segi tiga", ["Segi tiga", "Bulat", "Segi empat", "Bujur"]),
            M("Berapa sisi segi tiga?", "3", ["3", "4", "5", "2"]),
            M("Berapa sisi segi empat?", "4", ["4", "3", "5", "6"]),
            M("Bentuk buku atau pintu ialah?", "Segi empat", ["Segi empat", "Bulat", "Segi tiga", "Bujur"]),
        ]),
    ]),
    ("haiwan", "Haiwan & Bunyi", [
        ("haiwan-asas", "Kenal haiwan", [
            M("Bunyi 'meow' — haiwan apa?", "Kucing", ["Kucing", "Anjing", "Lembu", "Ayam"]),
            M("Haiwan yang bertelur?", "Ayam", ["Ayam", "Kucing", "Kambing", "Lembu"]),
            M("Haiwan yang tinggal di dalam air?", "Ikan", ["Ikan", "Kucing", "Arnab", "Ayam"]),
            M("Haiwan paling besar?", "Gajah", ["Gajah", "Kucing", "Tikus", "Arnab"]),
            M("Haiwan yang boleh terbang?", "Burung", ["Burung", "Ikan", "Kucing", "Lembu"]),
            M("Haiwan yang beri susu dan berbunyi 'moo'?", "Lembu", ["Lembu", "Ayam", "Ikan", "Burung"]),
            M("Berapa kaki ayam?", "2", ["2", "4", "6", "8"]),
            M("Berapa kaki kucing?", "4", ["4", "2", "6", "8"]),
            M("Haiwan yang hidup di air dan darat?", "Katak", ["Katak", "Ikan", "Burung", "Kucing"]),
        ]),
        ("anak-haiwan", "Anak haiwan", [
            M("Anak kucing dipanggil?", "Anak kucing", ["Anak kucing", "Anak ayam", "Anak lembu", "Anak itik"]),
            M("Anak ayam dipanggil?", "Anak ayam", ["Anak ayam", "Anak kucing", "Anak kambing", "Anak ikan"]),
            M("Anak lembu dipanggil?", "Anak lembu", ["Anak lembu", "Anak katak", "Anak burung", "Anak itik"]),
        ]),
    ]),
    ("jawi-asas", "Jawi Asas", [
        ("huruf-jawi", "Kenal huruf Jawi", [
            M("Huruf Jawi yang pertama ialah?", "ا", ["ا", "ب", "ت", "ن"], "rtl"),
            M("Huruf 'ba' dalam Jawi ialah?", "ب", ["ب", "ت", "ن", "ي"], "rtl"),
            M("Huruf bernama 'jim' ialah?", "ج", ["ج", "ح", "خ", "د"], "rtl"),
            M("Huruf bernama 'mim' ialah?", "م", ["م", "ن", "و", "ه"], "rtl"),
            M("Huruf Jawi dibaca dari arah mana?", "Kanan ke kiri", ["Kanan ke kiri", "Kiri ke kanan"]),
            M("Berapa huruf hijaiyah asas?", "28", ["28", "26", "30", "36"]),
        ]),
        ("perkataan-jawi", "Perkataan Jawi mudah", [
            M("Perkataan 'buku' dalam Jawi ialah?", "بوکو", ["بوکو", "باتو", "سوسو", "ناسي"], "rtl"),
            M("Perkataan 'makan' dalam Jawi ialah?", "ماکن", ["ماکن", "ماتا", "ناسي", "باجو"], "rtl"),
            M("Perkataan 'nasi' dalam Jawi ialah?", "ناسي", ["ناسي", "ايکن", "باجو", "روتي"], "rtl"),
            M("Perkataan 'susu' dalam Jawi ialah?", "سوسو", ["سوسو", "باتو", "کاکي", "ماتا"], "rtl"),
            M("Perkataan Jawi 'باتو' ialah?", "Batu", ["Batu", "Buku", "Baju", "Bunga"]),
            M("Perkataan Jawi 'ایکن' ialah?", "Ikan", ["Ikan", "Awan", "Emas", "Itik"]),
            M("Perkataan Jawi 'روما' — ejaan Rumi-nya?", "Ruma", ["Ruma", "Rami", "Remi", "Rama"]),
            M("Perkataan 'bunga' dalam Jawi ialah?", "بوڠا", ["بوڠا", "بوکو", "باڤ", "باجو"], "rtl"),
        ]),
    ]),
    ("doa-harian", "Doa & Adab Harian", [
        ("doa", "Doa harian", [
            M("Sebelum makan kita membaca?", "Bismillah", ["Bismillah", "Alhamdulillah", "Subhanallah", "Astaghfirullah"]),
            M("Selepas makan kita membaca?", "Alhamdulillah", ["Alhamdulillah", "Bismillah", "Allahuakbar", "InshaAllah"]),
            M("Sebelum keluar rumah kita membaca?", "Bismillah", ["Bismillah", "Alhamdulillah", "Amin", "Wallahualam"]),
            M("Ucapan salam ialah?", "Assalamualaikum", ["Assalamualaikum", "Selamat datang", "Terima kasih", "Apa khabar"]),
            M("Bila bersin kita mengucap?", "Alhamdulillah", ["Alhamdulillah", "Bismillah", "Subhanallah", "Amin"]),
        ]),
        ("adab", "Adab harian", [
            M("Makan menggunakan tangan?", "Kanan", ["Kanan", "Kiri", "Dua-dua tangan"]),
            M("Ucapan bila masuk rumah orang?", "Assalamualaikum", ["Assalamualaikum", "Hello", "Bye", "Terima kasih"]),
            M("Bila ibu bapa panggil, kita?", "Terus datang", ["Terus datang", "Buat tak dengar", "Main lagi"]),
            M("Bercakap dengan guru guna suara?", "Sopan", ["Sopan", "Kuat", "Kasar"]),
            M("Jika mahu barang kawan, kita?", "Minta izin", ["Minta izin", "Rampas", "Sorok"]),
        ]),
    ]),
]

# ------------------------------------------------------- SEKOLAH KEBANGSAAN
SK_T1 = [
    ("bm", "Bahasa Melayu", [
        ("suku-kata", "Suku kata", [
            M("Perkataan 'buku' ada berapa suku kata?", "2", ["2", "1", "3", "4"]),
            M("Perkataan 'sekolah' ada berapa suku kata?", "3", ["3", "2", "4", "1"]),
            M("Perkataan 'meja' ada berapa suku kata?", "2", ["2", "1", "3", "4"]),
            M("Suku kata pertama bagi 'kerusi' ialah?", "ke", ["ke", "ru", "si", "ker"]),
            M("Cantumkan 'bu' + 'ku' menjadi?", "buku", ["buku", "baku", "bukuu", "buko"]),
        ]),
        ("ejaan-vokal", "Ejaan & vokal", [
            M("Pilih ejaan yang betul.", "bola", ["bola", "bolaa", "bolah", "bollah"]),
            M("Huruf vokal dalam 'makan' ada berapa?", "2", ["2", "1", "3", "4"]),
            M("Berapa huruf dalam perkataan 'sekolah'?", "7", ["7", "6", "8", "5"]),
            M("Lawan kata bagi 'besar' ialah?", "kecil", ["kecil", "tinggi", "panjang", "berat"]),
            M("Lawan kata bagi 'pandai' ialah?", "bodoh", ["bodoh", "rajin", "kuat", "baik"]),
            T("Taip nama haiwan yang berbunyi 'meow'.", "kucing", ["kucing", "Kucing"]),
            T("Taip nama tempat kita belajar.", "sekolah", ["sekolah", "Sekolah"]),
        ]),
        ("kata-nama", "Kata nama & tatabahasa", [
            M("Yang mana kata nama?", "meja", ["meja", "makan", "cantik", "lari"]),
            M("Yang mana kata kerja?", "berlari", ["berlari", "meja", "merah", "baju"]),
            M("Yang mana kata sifat?", "cantik", ["cantik", "buku", "lari", "rumah"]),
            M("Kata ganda bagi 'kura' ialah?", "kura-kura", ["kura-kura", "kurakura", "kura kuraa", "kuraa"]),
            M("Kata ganda bagi 'biri' ialah?", "biri-biri", ["biri-biri", "biribiri", "biri biri", "birii"]),
            M("Perkataan 'ibu' merujuk kepada?", "ibu bapa", ["ibu bapa", "kawan", "guru", "jiran"]),
        ]),
    ]),
    ("matematik", "Matematik", [
        ("nombor", "Nombor & nilai", [
            M("Mana lebih besar: 14 atau 9?", "14", ["14", "9"]),
            M("Mana lebih besar: 7 atau 11?", "11", ["11", "7"]),
            M("Nombor selepas 19 ialah?", "20", ["20", "18", "21", "29"]),
            M("10 lebih 1 sama dengan?", "11", ["11", "9", "10", "1"]),
            T("Taip hasil 10 + 10.", "20", ["20", "dua puluh"]),
        ]),
        ("operasi", "Tambah & tolak (latihan tanpa had)", [
            G("math_add", max=20),
            G("math_sub", max=20),
            G("math_add", max=100),
        ]),
        ("masa-ukuran", "Masa & ukuran asas", [
            M("Bilangan hari dalam seminggu?", "7", ["7", "5", "6", "10"]),
            M("Pukul tiga petang ditulis?", "3:00", ["3:00", "12:03", "30:00", "0:03"]),
            M("Bilangan bulan dalam setahun?", "12", ["12", "10", "6", "24"]),
            M("Mana lebih panjang: 1 meter atau 1 sentimeter?", "1 meter", ["1 meter", "1 sentimeter"]),
            M("Bilangan jam dalam sehari?", "24", ["24", "12", "60", "30"]),
        ]),
    ]),
    ("english", "English", [
        ("vocabulary", "Vocabulary", [
            M("What is 'buku' in English?", "book", ["book", "ball", "bag", "box"]),
            M("What is 'meja' in English?", "table", ["table", "chair", "door", "window"]),
            M("What is 'air' in English?", "water", ["water", "fire", "air", "wind"]),
            M("Which word is a colour?", "red", ["red", "run", "rice", "road"]),
            M("Which word is a fruit?", "apple", ["apple", "chair", "book", "table"]),
            M("'Selamat pagi' in English is?", "Good morning", ["Good morning", "Good night", "Goodbye", "Good evening"]),
        ]),
        ("abc-spelling", "ABC & spelling", [
            M("A, B, C, D — what comes next?", "E", ["E", "F", "G", "H"]),
            M("How many legs does a cat have?", "four", ["four", "two", "six", "eight"]),
            T("Spell the number 3 in words.", "three", ["three", "Three"]),
            T("Spell the colour of the sky on a clear day.", "blue", ["blue", "Blue"]),
            M("Which letter is a vowel?", "e", ["e", "k", "m", "t"]),
            M("How many letters are in the English alphabet?", "26", ["26", "24", "28", "30"]),
        ]),
    ]),
    ("sains", "Sains", [
        ("diri-saya", "Diri saya", [
            M("Organ untuk melihat ialah?", "mata", ["mata", "telinga", "hidung", "mulut"]),
            M("Organ untuk mendengar ialah?", "telinga", ["telinga", "mata", "lidah", "kulit"]),
            M("Organ untuk menghidu ialah?", "hidung", ["hidung", "mata", "kaki", "tangan"]),
            M("Anggota untuk berjalan ialah?", "kaki", ["kaki", "tangan", "kepala", "perut"]),
            M("Anggota untuk memegang ialah?", "tangan", ["tangan", "kaki", "kepala", "pinggang"]),
        ]),
        ("benda-hidup", "Benda hidup & keperluan", [
            M("Benda hidup perlukan apa untuk hidup?", "air", ["air", "batu", "kayu", "plastik"]),
            M("Tumbuhan perlukan apa untuk membuat makanan?", "cahaya matahari", ["cahaya matahari", "bulan", "angin", "batu"]),
            M("Bahagian pokok yang menyerap air ialah?", "akar", ["akar", "daun", "bunga", "buah"]),
            M("Haiwan yang hidup di air dan darat?", "katak", ["katak", "ikan", "kucing", "burung"]),
            M("Mana yang benda hidup?", "pokok", ["pokok", "kerusi", "batu", "botol"]),
            M("Mana yang benda bukan hidup?", "batu", ["batu", "pokok", "kucing", "pokok bunga"]),
        ]),
    ]),
    ("pendidikan-islam", "Pendidikan Islam", [
        ("rukun", "Rukun Islam & Iman", [
            M("Berapa rukun Islam?", "5", ["5", "6", "4", "3"]),
            M("Rukun Islam yang pertama ialah?", "Syahadah", ["Syahadah", "Solat", "Zakat", "Haji"]),
            M("Berapa rukun iman?", "6", ["6", "5", "4", "7"]),
            M("Rukun iman yang pertama ialah percaya kepada?", "Allah", ["Allah", "malaikat", "kitab", "nabi"]),
            M("Berapa kali solat fardu dalam sehari?", "5", ["5", "3", "7", "6"]),
        ]),
        ("asas-ibadah", "Asas ibadah", [
            M("Kita bersuci menggunakan?", "air", ["air", "pasir", "angin", "minyak"]),
            M("Kitab suci orang Islam ialah?", "Al-Quran", ["Al-Quran", "buku cerita", "majalah", "kamus"]),
            M("Sebelum solat kita mengambil?", "wuduk", ["wuduk", "makan", "tidur", "buku"]),
            M("Arah kiblat orang Islam ialah?", "Kaabah", ["Kaabah", "Madinah", "Mesir", "Turki"]),
            M("Bulan puasa orang Islam ialah?", "Ramadan", ["Ramadan", "Syawal", "Muharram", "Rejab"]),
        ]),
    ]),
]

# --------------------------------------------------------- SEKOLAH AGAMA
AGAMA_D1 = [
    ("jawi", "Jawi", [
        ("huruf-jawi", "Nama huruf Jawi", [
            M("Huruf 'ج' bernama?", "Jim", ["Jim", "Ha", "Kha", "Dal"]),
            M("Huruf 'ح' bernama?", "Ha", ["Ha", "Jim", "Kha", "Ain"]),
            M("Huruf 'خ' bernama?", "Kha", ["Kha", "Ha", "Ghain", "Jim"]),
            M("Huruf 'ع' bernama?", "Ain", ["Ain", "Ghain", "Ha", "Hamzah"]),
            M("Huruf 'غ' bernama?", "Ghain", ["Ghain", "Ain", "Kha", "Qaf"]),
            M("Huruf 'چ' bernama?", "Ca", ["Ca", "Jim", "Nya", "Nga"]),
            M("Huruf 'ݢ' bernama?", "Ga", ["Ga", "Kaf", "Nga", "Pa"]),
            M("Huruf 'ڠ' bernama?", "Nga", ["Nga", "Nya", "Ga", "Nun"]),
            M("Huruf 'ڤ' bernama?", "Pa", ["Pa", "Fa", "Ba", "Va"]),
            M("Huruf 'ڽ' bernama?", "Nya", ["Nya", "Nga", "Ya", "Nun"]),
        ]),
        ("sambung-jawi", "Sambung huruf & perkataan", [
            M("Perkataan 'ibu' dalam Jawi ialah?", "ايبو", ["ايبو", "باڤ", "ابو", "ايبا"], "rtl"),
            M("Perkataan 'bapa' dalam Jawi ialah?", "باڤ", ["باڤ", "با", "ايبو", "باڤا"], "rtl"),
            M("Perkataan 'emas' dalam Jawi ialah?", "امس", ["امس", "اماس", "ايمس", "همس"], "rtl"),
            M("Perkataan Jawi 'ايبو' ialah?", "Ibu", ["Ibu", "Bapa", "Emak", "Kakak"]),
            M("Perkataan Jawi 'روتي' ialah?", "Roti", ["Roti", "Rata", "Roti kayu", "Reti"]),
            M("Perkataan 'baju' dalam Jawi ialah?", "باجو", ["باجو", "باجا", "بوجو", "باجي"], "rtl"),
            M("Huruf Jawi ditulis dari arah?", "Kanan ke kiri", ["Kanan ke kiri", "Kiri ke kanan"]),
            T("Taip huruf Jawi pertama (alif) dengan papan kekunci Arab/Jawi.", "ا", ["ا"]),
        ]),
    ]),
    ("alquran", "Al-Quran (Iqra)", [
        ("huruf-hijaiyah", "Huruf hijaiyah", [
            M("Selepas huruf 'ا' (alif) ialah?", "ب", ["ب", "ت", "ث", "ج"], "rtl"),
            M("Sebelum huruf 'ت' (ta) ialah?", "ب", ["ب", "ث", "ج", "ا"], "rtl"),
            M("Huruf hijaiyah yang terakhir ialah?", "ي", ["ي", "و", "ه", "ن"], "rtl"),
            M("Huruf 'د' bernama?", "Dal", ["Dal", "Dzal", "Ra", "Zai"]),
            M("Huruf 'ذ' bernama?", "Dzal", ["Dzal", "Dal", "Zai", "Syin"]),
            M("Berapa huruf hijaiyah?", "28", ["28", "26", "30", "36"]),
            M("Huruf 'ف' bernama?", "Fa", ["Fa", "Qaf", "Wau", "Pa"]),
            M("Huruf 'ق' bernama?", "Qaf", ["Qaf", "Fa", "Kaf", "Nun"]),
        ]),
        ("baris", "Baris & bacaan", [
            M("Baris di atas huruf dipanggil?", "Fathah", ["Fathah", "Kasrah", "Dhammah", "Sukun"]),
            M("Baris di bawah huruf dipanggil?", "Kasrah", ["Kasrah", "Fathah", "Dhammah", "Sabdu"]),
            M("Baris di hadapan huruf dipanggil?", "Dhammah", ["Dhammah", "Fathah", "Kasrah", "Mad"]),
            M("بَ dibaca?", "ba", ["ba", "bi", "bu", "b"]),
            M("بِ dibaca?", "bi", ["bi", "ba", "bu", "b"]),
            M("بُ dibaca?", "bu", ["bu", "ba", "bi", "b"]),
            M("Tanda sabdu (shadda) bermaksud?", "Huruf dibaca ditekan", ["Huruf dibaca ditekan", "Huruf dibaca panjang", "Huruf dibaca pendek"]),
            M("Bacaan panjang dipanggil?", "Mad", ["Mad", "Sukun", "Sabdu", "Tanwin"]),
            M("Huruf bertanda sukun (ْ) bermaksud?", "Huruf dimatikan", ["Huruf dimatikan", "Huruf dibaca panjang", "Huruf dibaca dua kali"]),
        ]),
    ]),
    ("akidah", "Akidah", [
        ("rukun-iman", "Rukun Iman", [
            M("Berapa rukun iman?", "6", ["6", "5", "4", "3"]),
            M("Rukun iman pertama ialah percaya kepada?", "Allah", ["Allah", "malaikat", "kitab", "hari akhirat"]),
            M("Rukun iman kedua ialah percaya kepada?", "malaikat", ["malaikat", "Allah", "qada dan qadar", "nabi"]),
            M("Siapakah Tuhan kita?", "Allah", ["Allah", "malaikat", "nabi", "manusia"]),
            M("Nabi dan rasul yang terakhir ialah?", "Nabi Muhammad", ["Nabi Muhammad", "Nabi Isa", "Nabi Musa", "Nabi Adam"]),
            M("Berapa nabi dan rasul yang wajib kita ketahui?", "25", ["25", "10", "40", "124"]),
            M("Allah Maha Mendengar bermaksud nama Allah?", "As-Sami'", ["As-Sami'", "Al-Basir", "Al-Alim", "Al-Khabir"]),
            M("Allah Maha Melihat bermaksud nama Allah?", "Al-Basir", ["Al-Basir", "As-Sami'", "Ar-Rahman", "Al-Malik"]),
        ]),
    ]),
    ("ibadah", "Ibadah", [
        ("rukun-islam", "Rukun Islam", [
            M("Berapa rukun Islam?", "5", ["5", "6", "4", "3"]),
            M("Rukun Islam yang pertama ialah?", "Syahadah", ["Syahadah", "Solat", "Puasa", "Zakat"]),
            M("Rukun Islam yang kedua ialah?", "Solat", ["Solat", "Zakat", "Haji", "Puasa"]),
            M("Rukun Islam yang keempat ialah?", "Puasa", ["Puasa", "Zakat", "Haji", "Solat"]),
        ]),
        ("solat-wuduk", "Solat & wuduk", [
            M("Sebelum solat kita mengambil?", "Wuduk", ["Wuduk", "Makan", "Rehat", "Buku"]),
            M("Anggota pertama dibasuh ketika wuduk ialah?", "muka", ["muka", "kaki", "perut", "belakang"]),
            M("Berapa rakaat solat Subuh?", "2", ["2", "3", "4", "5"]),
            M("Berapa rakaat solat Maghrib?", "3", ["3", "2", "4", "5"]),
            M("Berapa rakaat solat Zuhur?", "4", ["4", "2", "3", "5"]),
            M("Berapa rakaat solat Isyak?", "4", ["4", "2", "3", "5"]),
            M("Solat dijalankan menghadap arah?", "kiblat", ["kiblat", "pintu", "tingkap", "guru"]),
            M("Bilangan solat fardu dalam sehari?", "5", ["5", "3", "4", "6"]),
        ]),
    ]),
    ("sirah", "Sirah", [
        ("kelahiran-nabi", "Kelahiran Nabi", [
            M("Nabi Muhammad SAW dilahirkan di?", "Makkah", ["Makkah", "Madinah", "Mesir", "Syam"]),
            M("Tahun kelahiran Nabi dikenali sebagai?", "Tahun Gajah", ["Tahun Gajah", "Tahun Kuda", "Tahun Unta", "Tahun Biri-biri"]),
            M("Nama ibu Nabi Muhammad ialah?", "Aminah", ["Aminah", "Khadijah", "Aisyah", "Halimah"]),
            M("Nama ayah Nabi Muhammad ialah?", "Abdullah", ["Abdullah", "Abdul Muttalib", "Abu Talib", "Abdul Rahman"]),
            M("Nabi disusukan oleh?", "Halimah Sa'diah", ["Halimah Sa'diah", "Aminah", "Khadijah", "Fatimah"]),
            M("Datuk yang menjaga Nabi selepas ibunya meninggal?", "Abdul Muttalib", ["Abdul Muttalib", "Abu Talib", "Abdullah", "Abu Bakar"]),
        ]),
        ("wahyu-hijrah", "Wahyu & Hijrah", [
            M("Nabi menerima wahyu pertama di gua?", "Hira", ["Hira", "Thur", "Uhud", "Safa"]),
            M("Nabi berhijrah dari Makkah ke?", "Madinah", ["Madinah", "Mesir", "Syam", "Yaman"]),
            M("Surah pertama diturunkan ialah?", "Al-Alaq", ["Al-Alaq", "Al-Fatihah", "Al-Ikhlas", "An-Nas"]),
            M("Sahabat yang menemani Nabi berhijrah?", "Abu Bakar", ["Abu Bakar", "Umar", "Uthman", "Ali"]),
        ]),
    ]),
    ("adab", "Adab", [
        ("adab-harian", "Adab harian", [
            M("Adab makan menggunakan tangan?", "Kanan", ["Kanan", "Kiri", "Dua-dua tangan"]),
            M("Sebelum makan kita membaca?", "Bismillah", ["Bismillah", "Alhamdulillah", "Subhanallah", "Amin"]),
            M("Selepas makan kita membaca?", "Alhamdulillah", ["Alhamdulillah", "Bismillah", "Astaghfirullah", "Amin"]),
            M("Bila bersin kita mengucap?", "Alhamdulillah", ["Alhamdulillah", "Bismillah", "Subhanallah", "InsyaAllah"]),
            M("Adab terhadap guru ialah?", "Hormat", ["Hormat", "Cuek", "Buat bising", "Kacau"]),
            M("Adab masuk rumah orang ialah?", "Beri salam", ["Beri salam", "Masuk terus", "Ketuk kuat", "Jerit"]),
        ]),
    ]),
    ("bahasa-arab", "Bahasa Arab Asas", [
        ("kata-harian", "Kata harian", [
            M("Perkataan Arab 'ماء' bermaksud?", "Air", ["Air", "Api", "Angin", "Tanah"]),
            M("Perkataan Arab 'كتاب' bermaksud?", "Buku", ["Buku", "Meja", "Pintu", "Kasut"]),
            M("Perkataan Arab 'شكرا' bermaksud?", "Terima kasih", ["Terima kasih", "Selamat datang", "Apa khabar", "Selamat malam"]),
            M("Perkataan Arab 'مرحبا' bermaksud?", "Selamat datang", ["Selamat datang", "Terima kasih", "Maaf", "Tolong"]),
            M("Perkataan Arab 'قلم' bermaksud?", "Pena", ["Pena", "Buku", "Meja", "Beg"]),
            M("Perkataan Arab 'باب' bermaksud?", "Pintu", ["Pintu", "Tingkap", "Bilik", "Bumbung"]),
        ]),
        ("nombor-warna-arab", "Nombor & warna", [
            M("Nombor satu dalam Arab ialah?", "Wahid", ["Wahid", "Ithnan", "Thalatha", "Arba'a"]),
            M("Nombor dua dalam Arab ialah?", "Ithnan", ["Ithnan", "Wahid", "Khamsa", "Sitta"]),
            M("Nombor tiga dalam Arab ialah?", "Thalatha", ["Thalatha", "Arba'a", "Khamsa", "Sab'a"]),
            M("Warna merah dalam Arab ialah?", "Ahmar", ["Ahmar", "Akhdar", "Azraq", "Aswad"]),
            M("Warna hijau dalam Arab ialah?", "Akhdar", ["Akhdar", "Ahmar", "Asfar", "Abyad"]),
            M("Warna biru dalam Arab ialah?", "Azraq", ["Azraq", "Akhdar", "Aswad", "Abyad"]),
        ]),
    ]),
]


def stream(sid, name, tagline, levels):
    return {"id": sid, "name": name, "tagline": tagline, "levels": levels}


def subjects_of(subject_list):
    """Tukar senarai mentah kepada struktur, dengan id topik berprefiks subjek (unik)."""
    out = []
    for sid, sname, topics in subject_list:
        out.append({
            "id": sid,
            "name": sname,
            "topics": [
                {"id": f"{sid}-{tid}", "name": tname, "questions": qs} for tid, tname, qs in topics
            ],
        })
    return out


def build():
    data = {
        "version": "1.0",
        "note": NOTE,
        "streams": [
            stream("prasekolah", "Prasekolah", "Umur 5–6 tahun · KSPK", [
                {"id": "pra", "name": "Prasekolah (5–6 tahun)", "subjects": subjects_of(PRA)},
            ]),
            stream("sk", "Sekolah Kebangsaan", "KSSR · Tahun 1–6", [
                {"id": "tahun1", "name": "Tahun 1", "subjects": subjects_of(SK_T1)},
                {"id": "tahun2", "name": "Tahun 2", "soon": True, "subjects": []},
            ]),
            stream("agama", "Sekolah Agama", "KSRA / KAFA · Darjah 1–6", [
                {"id": "darjah1", "name": "Darjah 1", "subjects": subjects_of(AGAMA_D1)},
                {"id": "darjah2", "name": "Darjah 2", "soon": True, "subjects": []},
            ]),
        ],
    }
    return data


def stats(data):
    rows, total = [], 0
    for st in data["streams"]:
        for lv in st["levels"]:
            n = 0
            for su in lv.get("subjects", []):
                for tp in su["topics"]:
                    n += len(tp["questions"])
            total += n
            rows.append(f"  {st['name']:<22} {lv['name']:<26} {n:>4} soalan")
    return rows, total


if __name__ == "__main__":
    data = build()
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    rows, total = stats(data)
    print("content.json ditulis:", OUT)
    print("\n".join(rows))
    print(f"  JUMLAH BANK: {total} soalan (+ soalan matematik dijana tanpa had)")
