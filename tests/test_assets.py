#!/usr/bin/env python3
"""Ujian aset, PWA, privasi dan tetapan service worker.

Jalankan:  python3 -m unittest discover -s tests -v
"""
import json
import pathlib
import re
import struct
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent


def png_size(path):
    b = path.read_bytes()
    assert b[:8] == b"\x89PNG\r\n\x1a\n", f"{path.name} bukan PNG sah"
    w, h = struct.unpack(">II", b[16:24])
    return w, h


class TestAsetWajib(unittest.TestCase):
    def test_fail_teras_ada(self):
        for name in ["index.html", "style.css", "core.js", "app.js", "content.json", "manifest.json", "sw.js", "README.md"]:
            self.assertTrue((ROOT / name).is_file(), f"{name} hilang")

    def test_ikon_ada_dan_saiz_betul(self):
        expect = {
            "icon-192.png": (192, 192),
            "icon-512.png": (512, 512),
            "icon-maskable-512.png": (512, 512),
            "apple-touch-icon-180.png": (180, 180),
            "favicon-32.png": (32, 32),
        }
        for name, size in expect.items():
            p = ROOT / name
            self.assertTrue(p.is_file(), f"{name} hilang")
            self.assertEqual(png_size(p), size, f"{name} saiz salah")


class TestManifest(unittest.TestCase):
    def setUp(self):
        self.m = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))

    def test_medan_pwa(self):
        for key in ["name", "short_name", "start_url", "scope", "display", "theme_color", "background_color", "lang"]:
            self.assertIn(key, self.m, f"manifest tiada {key}")
        self.assertEqual(self.m["display"], "standalone")
        self.assertEqual(self.m["lang"], "ms")

    def test_ikon_192_512_maskable(self):
        icons = self.m["icons"]
        sizes = {i.get("sizes") for i in icons}
        purposes = {i.get("purpose", "any") for i in icons}
        self.assertIn("192x192", sizes, "ikon 192 wajib ada")
        self.assertIn("512x512", sizes, "ikon 512 wajib ada")
        self.assertIn("maskable", purposes, "ikon maskable wajib ada")
        for i in icons:
            self.assertTrue((ROOT / i["src"]).is_file(), f"fail ikon {i['src']} tiada")
            self.assertEqual(i["type"], "image/png")


class TestIndexHtml(unittest.TestCase):
    def setUp(self):
        self.html = (ROOT / "index.html").read_text(encoding="utf-8")

    def test_rujukan_pwa(self):
        for needle in ['rel="manifest"', 'apple-touch-icon', 'rel="icon"', 'theme-color', 'name="viewport"']:
            self.assertIn(needle, self.html, f"index.html tiada {needle}")

    def test_skrip_urutan_betul(self):
        self.assertLess(self.html.index('src="core.js"'), self.html.index('src="app.js"'),
                        "core.js mesti dimuat sebelum app.js")

    def test_aksesibiliti_minimum(self):
        for needle in ['aria-live', 'aria-pressed', 'aria-label', 'maxlength="30"']:
            self.assertIn(needle, self.html, f"index.html tiada {needle}")

    def test_tiada_aset_luar(self):
        """Privasi: tiada CDN / skrip pihak ketiga."""
        luar = re.findall(r'(?:src|href)="(https?://[^"]+)"', self.html)
        self.assertEqual(luar, [], f"ada aset luar: {luar}")

    def test_fail_skop_kuiz_ada(self):
        for needle in ['id="scopeBar"', 'id="scopeText"', 'id="scopeNew"', 'id="scopeKeep"']:
            self.assertIn(needle, self.html, f"index.html tiada {needle}")


class TestServiceImplWorker(unittest.TestCase):
    def setUp(self):
        self.sw = (ROOT / "sw.js").read_text(encoding="utf-8")

    def test_network_first(self):
        """Regresi: jangan kembali ke cache-first (punca pengguna tersekat versi lama)."""
        self.assertIn("fetch(req, { cache: 'no-cache' })", self.sw, "sw.js mesti guna network-first + semak semula")
        self.assertIn("caches.match(req, { ignoreSearch:", self.sw, "mesti ada sandaran cache")
        self.assertIn("req.mode === 'navigate'", self.sw, "navigasi offline mesti jatuh balik ke cache")
        self.assertNotIn("return cached || net", self.sw, "corak cache-first lama tak dibenarkan")

    def test_precache_tahan_304(self):
        """Regresi: respons 304 pernah ditolak → index.html & ikon tak masuk cache, app gagal offline."""
        self.assertIn("cache: 'reload'", self.sw, "precache mesti paksa respons penuh (200), bukan 304")
        self.assertIn("res.ok", self.sw, "masukkan ke cache hanya respons yang ok")

    def test_versi_baru_menunggu(self):
        """Regresi: elak amaran 'versi baru' palsu — SW baru mesti MENUNGGU, bukan skipWaiting automatik."""
        self.assertIn("SKIP_WAITING", self.sw, "sw.js mesti sokong mesej SKIP_WAITING")
        self.assertNotIn("precache().then(() => self.skipWaiting())", self.sw, "install tak boleh skipWaiting sendiri")

    def test_cache_bukan_v1(self):
        m = re.search(r"const CACHE = '([^']+)'", self.sw)
        self.assertIsNotNone(m, "sw.js tiada nama cache")
        self.assertNotEqual(m.group(1), "kelasnadi-v1", "nama cache mesti dinaikkan bila rilis")

    def test_assets_sw_semua_ada(self):
        m = re.search(r"const ASSETS = \[(.*?)\];", self.sw, re.S)
        self.assertIsNotNone(m, "sw.js tiada ASSETS")
        items = re.findall(r"'([^']+)'", m.group(1))
        self.assertIn("./core.js", items, "core.js mesti dalam senarai cache")
        self.assertIn("./icon-192.png", items, "ikon mesti dalam senarai cache")
        for it in items:
            if it == "./":
                continue
            self.assertTrue((ROOT / it.lstrip("./")).is_file(), f"ASSETS rujuk fail tiada: {it}")


class TestAppJsStruktur(unittest.TestCase):
    def setUp(self):
        self.app = (ROOT / "app.js").read_text(encoding="utf-8")

    def test_versi_app_padan_version_json(self):
        """Kalau dua versi ini tak padan, amaran 'versi baru' akan silap."""
        vj = json.loads((ROOT / "version.json").read_text(encoding="utf-8"))
        m = re.search(r"const APP_VERSION = '([^']+)'", self.app)
        self.assertIsNotNone(m, "app.js tiada APP_VERSION")
        self.assertEqual(m.group(1), vj["version"], "APP_VERSION mesti padan version.json")

    def test_version_json_dalam_cache(self):
        sw = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn("'./version.json'", sw, "version.json mesti dalam ASSETS")

    def test_semak_versi_guna_no_store(self):
        self.assertIn("cache: 'no-store'", self.app, "semakan versi mesti elak cache lama")

    def test_tiada_aset_luar_dalam_js(self):
        urls = re.findall(r'["\']https?://(?!www\.w3\.org)[^"\']+["\']', self.app)
        self.assertEqual(urls, [], f"app.js ada URL luar: {urls}")

    def test_guna_snapshot_untuk_print_dan_progress(self):
        """Regresi bug 2/5: progress + cetakan mesti guna snapshot kuiz aktif."""
        self.assertIn("key: C.progressKey(profile, scope)", self.app, "snapshot mesti simpan kunci progress")
        self.assertIn("store[meta.key] = C.mergeRun(", self.app, "progress mesti guna kunci snapshot")
        self.assertIn("function printSource()", self.app, "cetakan mesti melalui printSource()")
        self.assertIn("if (S.active) return { items: S.active.items", self.app, "cetakan guna snapshot kuiz aktif")

    def test_tiada_selector_lama_dalam_saveProgress(self):
        """Regresi bug 5: progress tak boleh guna '_topic' soalan pertama."""
        self.assertNotIn("S.quiz[0] || {}", self.app)

    def test_tiada_eval_document_write(self):
        self.assertNotIn("eval(", self.app)
        self.assertNotIn("document.write", self.app)


class TestContentNota(unittest.TestCase):
    def test_nota_kandungan_kekal(self):
        data = json.loads((ROOT / "content.json").read_text(encoding="utf-8"))
        self.assertIn("belum disahkan", data["note"].lower())
        self.assertIn("belum disemak guru", (ROOT / "index.html").read_text(encoding="utf-8").lower())


if __name__ == "__main__":
    unittest.main()
