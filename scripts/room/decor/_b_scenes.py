"""The landscapes inside Builder B's frames, painted with _b_paint.py and
written as PNGs into .room-cache/frames/ (once; bump VERSION to repaint).

    python3 _b_scenes.py            # paints every scene into the cache

Every scene is a stack of layers painted back to front in sRGB, then one
warm grade so they hang together as a set of golden-hour photos.
"""

import os

import numpy as np

try:
    from decor._b_paint import Canvas, rgb, smooth, write_png
except ImportError:  # run as a script from decor/
    from _b_paint import Canvas, rgb, smooth, write_png

VERSION = 7
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
CACHE = os.path.join(ROOT, ".room-cache", "frames")


# -- the scenes ----------------------------------------------------------


def peak_sunset(c):
    """A sharp peak against a sunset, layered blue ranges, pines below."""
    c.sky("#6f93bd", "#f7b56a", sun=(0.2, 0.6), glow="#ffb15c", glow_size=0.55, clouds=0.45, horizon_y=0.64)
    c.range(0.62, 0.14, 5, "#8f7f9c", 0.5, "#f2b98a")
    c.range(0.68, 0.46, 3, "#34436a", 0.08, "#eaa676", peaks=[(0.58, 0.54, 0.34)], snow=0.3, sun_x=0.15)
    c.mist(0.68, 0.045, "#f6c590", 0.7)
    c.range(0.78, 0.12, 4, "#283a44", 0.12, "#d99a68", sun_x=0.15)
    c.mist(0.8, 0.03, "#f0b585", 0.45)
    c.hill(0.88, 0.07, 3, "#4a5a30", "#1a2618")
    for x in np.linspace(0.0, 1.0, 11):
        c.conifer(x + c.rng.normal(0, 0.02), 0.95 + c.rng.random() * 0.06, 0.13 + c.rng.random() * 0.12, color="#121d15", lit="#4a4a2a")
    c.grade(0.1)


def meadow_tree(c):
    """A big tree on a sunny meadow, blue mountains far behind."""
    c.sky("#7fb0dc", "#f4dcb0", sun=(0.88, 0.3), glow="#ffe2a8", glow_size=0.3, clouds=0.55, horizon_y=0.6)
    c.range(0.6, 0.22, 3, "#4f6f96", 0.22, "#c9d8e8", peaks=[(0.74, 0.24, 0.2)], snow=0.42, sun_x=0.9)
    c.range(0.66, 0.08, 4, "#43647e", 0.18, "#c4d2d2", sun_x=0.9)
    c.hill(0.69, 0.06, 2, "#b3c35c", "#5c7a32")
    c.hill(0.8, 0.12, 2, "#c0cb60", "#3f5e24")
    c.tree(0.34, 0.79, 0.56, light="#b6cc58", shade="#26401e", blobs=11)
    c.path(0.8, 1.0, 0.47, 0.64, 0.01, 0.22, bend=0.04, color="#dcc58f")
    c.specks(0.82, ["#f6e27a", "#ffffff", "#f3b54a"], 300)
    c.grade(0.12)


def lake_forest(c):
    """A still lake, a forested far shore, low hills, a small island."""
    c.sky("#86b4dc", "#f6dfb6", sun=(0.72, 0.46), glow="#ffe0a6", glow_size=0.35, clouds=0.5, horizon_y=0.5)
    c.range(0.5, 0.16, 3, "#5d7c98", 0.3, "#d2dde4", peaks=[(0.3, 0.16, 0.18)], sun_x=0.75)
    c.hill(0.56, 0.05, 3, "#3f6038", "#24402a", grass=False)
    for x in np.linspace(0.0, 1.0, 30):
        b = 0.585 + c.rng.random() * 0.01
        c.conifer(x + c.rng.normal(0, 0.01), b, 0.07 + c.rng.random() * 0.07, color="#1b3524", lit="#557a3c")
    c.water(0.59, 0.84, "#6f9fba", ripple=0.4)
    c.paint(c.below(np.full(c.w, 0.665)) * smooth(0.075, 0.06, np.abs(c.x - 0.56)) * (c.y < 0.678), "#2c3a26")
    for x in (0.52, 0.55, 0.58, 0.6):
        c.conifer(x, 0.668, 0.05 + c.rng.random() * 0.05, color="#18301f", lit="#4a6a35")
    c.hill(0.86, 0.05, 3, "#9aa850", "#34501f")
    c.specks(0.88, ["#f3e08a", "#ffffff"], 140)
    c.grade(0.12)


def coast_path(c):
    """A sandy path through grass down to a blue bay and a headland."""
    c.sky("#86b6de", "#f5dcb2", sun=(0.18, 0.34), glow="#ffe4ae", glow_size=0.35, clouds=0.5, horizon_y=0.47)
    c.range(0.47, 0.24, 2, "#486a86", 0.18, "#cddde6", peaks=[(0.76, 0.28, 0.22)], sun_x=0.15)
    c.water(0.47, 0.62, "#5e95b6", ripple=0.35)
    c.hill(0.59, 0.05, 2, "#a8b85a", "#58782f")
    c.hill(0.7, 0.09, 3, "#bcc664", "#3d5c24")
    c.path(0.6, 1.0, 0.55, 0.38, 0.008, 0.4, bend=-0.05)
    c.tree(0.87, 0.73, 0.3, light="#a8c054", shade="#26401e", blobs=8)
    c.specks(0.74, ["#f6e27a", "#ffffff", "#e9a04a"], 280)
    c.grade(0.12)


def bike_trail(c):
    """Singletrack through a pine wood, low sun between the trunks."""
    c.sky("#a9c6d8", "#f6d9a2", sun=(0.6, 0.44), glow="#ffd88f", glow_size=0.5, clouds=0.0, horizon_y=0.56)
    c.range(0.56, 0.08, 3, "#71877a", 0.45, "#f0d6a6")
    c.hill(0.61, 0.04, 2, "#93a650", "#4b6a30")
    for x in (0.36, 0.44, 0.7, 0.8):
        c.conifer(x, 0.64, 0.24 + c.rng.random() * 0.08, color="#3d5537", lit="#6b8a48", width=0.24)
    c.mist(0.6, 0.07, "#ffe2a8", 0.45)
    for x in (0.02, 0.14, 0.25, 0.86, 0.97):
        c.conifer(x, 0.92 + c.rng.random() * 0.05, 0.62 + c.rng.random() * 0.1, color="#17271a", lit="#4f6a36", width=0.2)
    c.hill(0.84, 0.07, 2, "#a3ae54", "#33501f")
    c.path(0.62, 1.0, 0.57, 0.48, 0.01, 0.46, bend=0.08, color="#bd9a68")
    c.grade(0.14)


def coast_small(c):
    """A headland with a lighthouse across the bay, a footpath through the
    dune grass toward it."""
    c.sky("#8ab8de", "#f6dcb2", sun=(0.82, 0.3), glow="#ffe6b0", glow_size=0.3, clouds=0.55, horizon_y=0.48)
    c.range(0.5, 0.16, 2, "#5f7f72", 0.2, "#d6e0e4", peaks=[(0.12, 0.14, 0.3)], sun_x=0.9)
    c.paint(c.poly([(0.2, 0.39), (0.23, 0.39), (0.226, 0.32), (0.204, 0.32)]), "#f4efe6")
    c.paint(c.poly([(0.2, 0.33), (0.23, 0.33), (0.226, 0.345), (0.204, 0.345)]), "#c8402a")
    c.water(0.5, 0.7, "#5b95b5", ripple=0.45)
    c.hill(0.68, 0.06, 2, "#c8c36a", "#6f7a3a")
    c.hill(0.8, 0.12, 3, "#b9c462", "#3f5e24")
    c.path(0.66, 1.0, 0.4, 0.34, 0.008, 0.38, bend=0.06)
    c.specks(0.8, ["#f6e27a", "#ffffff"], 140)
    c.grade(0.12)


def windsurf(c):
    """A windsurfer on a breezy sea, the sail lit by the low sun."""
    c.sky("#7fb0da", "#f4d9ae", sun=(0.86, 0.5), glow="#ffd9a0", glow_size=0.35, clouds=0.45, horizon_y=0.56)
    c.range(0.56, 0.04, 3, "#62809a", 0.45, "#d9e2e6")
    c.water(0.56, 1.0, "#2f7096", ripple=0.85)
    mast_foot, mast_top, clew = (0.42, 0.78), (0.5, 0.22), (0.74, 0.62)
    luff = [(mast_foot[0] + (mast_top[0] - mast_foot[0]) * t - 0.03 * np.sin(np.pi * t), mast_foot[1] + (mast_top[1] - mast_foot[1]) * t) for t in np.linspace(0, 1, 12)]
    leech = [(mast_top[0] + (clew[0] - mast_top[0]) * t + 0.04 * np.sin(np.pi * t), mast_top[1] + (clew[1] - mast_top[1]) * t) for t in np.linspace(0, 1, 10)]
    sail = c.poly(luff + leech + [(0.6, 0.74)])
    shade = np.clip((c.x - 0.45) / 0.3, 0, 1)[..., None]
    c.paint(sail, rgb("#ff7a32") * (1 - shade) + rgb("#d8281c") * shade)
    for t in (0.25, 0.45, 0.65):
        y = mast_foot[1] + (mast_top[1] - mast_foot[1]) * t
        c.paint(sail * (np.abs(c.y - y + (c.x - 0.45) * 0.35) < 0.004), "#fff0dc")
    c.paint(c.poly([(x - 0.006, y) for x, y in luff] + [(x + 0.006, y) for x, y in luff[::-1]]), "#1d1d1d")
    c.paint(c.poly([(0.43, 0.55), (0.66, 0.6), (0.66, 0.612), (0.43, 0.562)]), "#1a1a1a")
    c.paint(c.poly([(0.3, 0.8), (0.68, 0.79), (0.7, 0.805), (0.32, 0.815)]), "#f4efe2")
    c.paint(c.poly([(0.5, 0.79), (0.53, 0.6), (0.56, 0.6), (0.55, 0.79)]), "#161616")
    spray = smooth(0.55, 0.85, c.noise((30, 30), 3)) * np.exp(-(((c.y - 0.81) / 0.018) ** 2)) * (np.abs(c.x - 0.45) < 0.28)
    c.paint(spray, "#ffffff")
    c.grade(0.1)


SCENES = {
    "peak_sunset": peak_sunset,
    "meadow_tree": meadow_tree,
    "lake_forest": lake_forest,
    "coast_path": coast_path,
    "bike_trail": bike_trail,
    "coast_small": coast_small,
    "windsurf": windsurf,
}


def picture(scene, aspect, longest=512, seed=7):
    """The PNG for `scene` at width/height `aspect`, painted if missing."""
    w, h = (longest, round(longest / aspect)) if aspect >= 1 else (round(longest * aspect), longest)
    path = os.path.join(CACHE, f"{scene}_{w}x{h}_v{VERSION}.png")
    if not os.path.exists(path):
        c = Canvas(w, h, seed + sum(map(ord, scene)))
        SCENES[scene](c)
        write_png(path, c.img)
    return path


if __name__ == "__main__":
    for name, aspect in [("peak_sunset", 0.7), ("meadow_tree", 1.5), ("lake_forest", 1.5), ("coast_path", 1.35), ("bike_trail", 0.68), ("coast_small", 0.74), ("windsurf", 0.75)]:
        print(picture(name, aspect))
