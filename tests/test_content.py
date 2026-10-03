#!/usr/bin/env python3
"""Pengesahan bank soalan Kelas Nadi.

Jalankan:  python3 -m unittest discover -s tests -v
"""
import json
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "content.json").read_text(encoding="utf-8"))

ARABIC = re.compile(r"[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF]")
LATIN = re.compile(r"[A-Za-z]")
GEN_OK = {"math_add", "math_sub", "math_mul"}


def walk():
    """Hasilkan (stream, level, subject, topic, question) untuk setiap soalan."""
    for st in DATA["streams"]:
        for lv in st["levels"]:
            for su in lv.get("subjects", []):
                for tp in su["topics"]:
                    for q in tp["questions"]:
                        yield st, lv, su, tp, q


class TestStructure(unittest.TestCase):
    def test_tiga_aliran(self):
        ids = [s["id"] for s in DATA["streams"]]
        self.assertEqual(ids, ["prasekolah", "sk", "agama"])

    def test_setiap_aliran_ada_soalan(self):
        for st in DATA["streams"]:
            n = sum(len(tp["questions"]) for lv in st["levels"] for su in lv.get("subjects", []) for tp in su["topics"])
            self.assertGreater(n, 30, f"aliran {st['id']} terlalu sedikit soalan ({n})")

    def test_nota_kurikulum_ada(self):
        self.assertIn("belum disahkan", DATA["note"].lower())

    def test_topic_id_unik(self):
        seen = {}
        for st in DATA["streams"]:
            for lv in st["levels"]:
                for su in lv.get("subjects", []):
                    for tp in su["topics"]:
                        if tp["id"] in seen:
                            self.fail(f"topic id berulang: {tp['id']}")
                        seen[tp["id"]] = f"{st['name']}/{lv['name']}/{su['name']}"

    def test_soalan_ada_jenis_sah(self):
        for st, lv, su, tp, q in walk():
            self.assertIn(q["t"], {"mcq", "type", "gen"}, f"{tp['id']}: jenis tak dikenali")


class TestQuestions(unittest.TestCase):
    def test_mcq_ada_pilihan_dan_jawapan(self):
        for st, lv, su, tp, q in walk():
            if q["t"] != "mcq":
                continue
            self.assertGreaterEqual(len(q["o"]), 2, f"{tp['id']}: pilihan < 2")
            self.assertIn(q["a"], q["o"], f"{tp['id']}: jawapan tiada dalam pilihan — {q['p']}")
            self.assertEqual(len(set(q["o"])), len(q["o"]), f"{tp['id']}: pilihan berulang — {q['p']}")

    def test_type_ada_jawapan(self):
        for st, lv, su, tp, q in walk():
            if q["t"] != "type":
                continue
            self.assertTrue(str(q["a"]).strip(), f"{tp['id']}: jawapan kosong — {q['p']}")

    def test_gen_sah(self):
        for st, lv, su, tp, q in walk():
            if q["t"] != "gen":
                continue
            self.assertIn(q["gen"], GEN_OK, f"{tp['id']}: generator tak dikenali")
            self.assertGreaterEqual(int(q.get("max", 10)), 5, f"{tp['id']}: max terlalu kecil")

    def test_tiada_prompt_berulang_dalam_topik(self):
        for st, lv, su, tp, q in walk():
            prompts = [x["p"] for x in tp["questions"] if x["t"] != "gen"]
            self.assertEqual(len(prompts), len(set(prompts)), f"{tp['id']}: prompt berulang")

    def test_rtl_pakai_huruf_arab(self):
        for st, lv, su, tp, q in walk():
            if q.get("dir") != "rtl":
                continue
            self.assertTrue(ARABIC.search(str(q["a"])), f"{tp['id']}: jawapan rtl bukan huruf Arab — {q['p']}")
            if q["t"] == "mcq":
                for o in q["o"]:
                    self.assertTrue(ARABIC.search(str(o)), f"{tp['id']}: pilihan rtl bukan huruf Arab — {o}")

    def test_prompt_jawi_tak_kosong(self):
        for st, lv, su, tp, q in walk():
            if q["t"] == "gen":
                continue
            self.assertTrue(str(q["p"]).strip(), f"{tp['id']}: prompt kosong")

    def test_jawapan_rumi_soalan_jawi_guna_latin(self):
        """Soalan 'Perkataan Jawi X ialah?' mesti dijawab dalam Rumi (huruf Latin)."""
        for st, lv, su, tp, q in walk():
            if q["t"] == "mcq" and ARABIC.search(str(q["p"])) and not ARABIC.search(str(q["a"])):
                self.assertTrue(LATIN.search(str(q["a"])), f"{tp['id']}: jawapan bukan Rumi — {q['p']} -> {q['a']}")


if __name__ == "__main__":
    unittest.main()
