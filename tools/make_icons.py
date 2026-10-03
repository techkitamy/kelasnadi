#!/usr/bin/env python3
"""Jana ikon PWA Kelas Nadi (mascot Nadi) — jalankan: python3 tools/make_icons.py

Hasil: icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon-180.png,
       favicon-32.png, favicon.ico
Guna Pillow sahaja (tiada rangkaian, tiada aset luar).
"""
import pathlib

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
SS = 4  # supersample untuk tepi licin


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def icon(size, maskable=False):
    """Ikon mascot Nadi. maskable=True → latar penuh, kandungan dalam zon selamat 80%."""
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    top, bottom = (255, 217, 100), (255, 176, 32)
    radius = 0 if maskable else int(s * 0.22)
    for y in range(s):
        d.line([(0, y), (s, y)], fill=lerp(top, bottom, y / max(1, s - 1)) + (255,))
    if not maskable:
        # potong sudut bulat
        mask = Image.new("L", (s, s), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1], radius=radius, fill=255)
        img.putalpha(mask)
        d = ImageDraw.Draw(img)

    # zon selamat: maskable = 62% tengah, biasa = 72%
    box = s * (0.62 if maskable else 0.72)
    ox, oy = (s - box) / 2, (s - box) / 2
    u = box / 120.0  # unit 120x130 (sama dengan viewBox mascot)

    def px(x):
        return ox + x * u

    def py(y):
        return oy + y * u

    def bar(x0, y0, x1, y1, **kw):
        d.rectangle([px(x0), py(y0), px(x1), py(y1)], **kw)

    def poly(points, **kw):
        d.polygon([(px(x), py(y)) for x, y in points], **kw)

    def oval(cx, cy, r, **kw):
        d.ellipse([px(cx - r), py(cy - r), px(cx + r), py(cy + r)], **kw)

    ink = (33, 52, 58, 255)
    outline = max(2, int(u * 3))

    # badan pensel
    bar(42, 26, 78, 98, fill=(255, 207, 77, 255), outline=(224, 171, 22, 255), width=outline)
    bar(42, 84, 78, 96, fill=(255, 230, 160, 255))
    poly([(42, 96), (78, 96), (60, 122)], fill=(242, 216, 184, 255), outline=(220, 185, 143, 255))
    poly([(53, 110), (67, 110), (60, 122)], fill=(58, 58, 58, 255))
    bar(42, 16, 78, 28, fill=(255, 157, 157, 255), outline=(224, 122, 122, 255))

    # muka
    oval(53, 55, 4.6, fill=ink)
    oval(67, 55, 4.6, fill=ink)
    oval(47.5, 64, 5, fill=(255, 179, 179, 190))
    oval(72.5, 64, 5, fill=(255, 179, 179, 190))
    # senyum
    d.arc([px(48), py(60), px(72), py(78)], start=20, end=160, fill=ink, width=outline)

    return img.resize((size, size), Image.LANCZOS)


def main():
    out = {
        "icon-192.png": icon(192),
        "icon-512.png": icon(512),
        "icon-maskable-512.png": icon(512, maskable=True),
        "apple-touch-icon-180.png": icon(180, maskable=True),
        "favicon-32.png": icon(32),
    }
    for name, im in out.items():
        im.save(ROOT / name, "PNG", optimize=True)
        print(f"{name:<28} {im.size[0]}x{im.size[1]}  {(ROOT / name).stat().st_size} bytes")
    # favicon.ico (16/32/48)
    ico = icon(256)
    ico.save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print(f"{'favicon.ico':<28} {(ROOT / 'favicon.ico').stat().st_size} bytes")


if __name__ == "__main__":
    main()
