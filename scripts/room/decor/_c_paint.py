"""Builder C's painted textures, drawn with numpy at build time into
.room-cache/c-tex/: the windsurf deck's camouflage and the small road
photo. Polygons are given in UV space (u along, v across, 0..1)."""

import os

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
OUT = os.path.join(ROOT, ".room-cache", "c-tex")


def _srgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)], dtype=np.float32)


def _mask(w, h, poly):
    """Pixels inside a polygon of (u, v) points (even-odd rule)."""
    ys, xs = np.mgrid[0:h, 0:w]
    u = (xs + 0.5) / w
    v = (ys + 0.5) / h
    inside = np.zeros((h, w), dtype=bool)
    n = len(poly)
    for i in range(n):
        (u1, v1), (u2, v2) = poly[i], poly[(i + 1) % n]
        if v1 == v2:
            continue
        cond = (v1 > v) != (v2 > v)
        x_cross = u1 + (v - v1) * (u2 - u1) / (v2 - v1)
        inside ^= cond & (u < x_cross)
    return inside


def _save(name, img):
    """Write an sRGB float image (h, w, 3) as PNG through Blender."""
    import bpy

    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + ".png")
    h, w, _ = img.shape
    rgba = np.ones((h, w, 4), dtype=np.float32)
    rgba[..., :3] = np.clip(img, 0, 1)
    im = bpy.data.images.new("__c_" + name, w, h, alpha=False)
    im.colorspace_settings.name = "sRGB"
    im.pixels.foreach_set(rgba.ravel())
    im.filepath_raw = path
    im.file_format = "PNG"
    im.save()
    bpy.data.images.remove(im)
    return path


def _grain(img, amount, seed):
    rng = np.random.default_rng(seed)
    n = rng.normal(0, amount, img.shape[:2]).astype(np.float32)[..., None]
    return img * (1 + n)


# the deck as in the design: cream base, sage fields, brand-green blades
# toward the nose; u runs tail (0) to nose (1), v rail to rail
DECK = [
    ("#9fb59a", [(0.0, 0.0), (0.0, 1.0), (0.5, 1.0), (0.47, 0.62), (0.53, 0.35), (0.48, 0.0)]),
    ("#e9e2cf", [(0.05, 0.55), (0.17, 1.0), (0.27, 1.0), (0.13, 0.5)]),
    ("#e9e2cf", [(0.22, 0.0), (0.36, 0.4), (0.44, 0.28), (0.32, 0.0)]),
    ("#e9e2cf", [(0.0, 0.15), (0.07, 0.0), (0.12, 0.0), (0.03, 0.32)]),
    ("#e9e2cf", [(0.33, 0.7), (0.43, 0.56), (0.47, 0.8), (0.39, 1.0), (0.35, 1.0)]),
    ("#c9d3be", [(0.13, 0.28), (0.21, 0.1), (0.26, 0.34), (0.18, 0.48)]),
    ("#9fb59a", [(0.82, 0.55), (1.0, 0.4), (1.0, 0.94), (0.88, 0.94)]),
    ("#1f4a32", [(0.76, 0.0), (1.0, 0.0), (1.0, 0.5), (0.9, 0.3), (0.8, 0.14)]),
    ("#1f4a32", [(0.67, 0.0), (0.73, 0.0), (0.83, 0.62), (0.79, 0.66)]),
    ("#1f4a32", [(0.5, 0.955), (1.0, 0.94), (1.0, 1.0), (0.5, 1.0)]),
    ("#2c5a3e", [(0.86, 0.36), (0.97, 0.55), (0.95, 0.62), (0.84, 0.44)]),
    ("#1f4a32", [(0.0, 0.86), (0.08, 1.0), (0.0, 1.0)]),
]


def deck_texture(w=1024, h=384):
    img = np.empty((h, w, 3), dtype=np.float32)
    img[:] = _srgb("#e9e2cf")
    for color, poly in DECK:
        img[_mask(w, h, poly)] = _srgb(color)
    return _save("deck", _grain(img, 0.012, 3))


def road_photo(w=256, h=336):
    """A road curving into hills under a warm evening sky, for the small
    frame on the right wall."""
    ys, xs = np.mgrid[0:h, 0:w]
    u, v = xs / w, ys / h  # v = 0 is the bottom row in Blender
    img = (_srgb("#cfe3f0") * v[..., None] + _srgb("#f4c890") * (1 - v[..., None])).astype(np.float32)
    horizon = 0.46 + 0.05 * np.sin(u * 6.0) + 0.03 * np.sin(u * 17.0 + 1.0)
    img[v < horizon] = _srgb("#5c6b52")
    far = 0.52 + 0.08 * np.sin(u * 3.2 + 0.6)
    img[(v < far) & (v >= horizon)] = _srgb("#7d8c86")
    grass = v < 0.36
    img[grass] = _srgb("#4f6a3f")
    # the road: a band narrowing to the horizon, bending right
    centre = 0.5 + 0.18 * (1 - v / 0.46) ** 2 - 0.1
    half = 0.03 + 0.42 * np.clip(1 - v / 0.46, 0, 1) ** 1.6
    road = (np.abs(u - centre) < half) & (v < 0.46)
    img[road] = _srgb("#3b3a38")
    line = (np.abs(u - centre) < half * 0.04) & (v < 0.44) & ((v * 40).astype(int) % 2 == 0)
    img[line] = _srgb("#efe6d2")
    return _save("road", _grain(img, 0.02, 7))
