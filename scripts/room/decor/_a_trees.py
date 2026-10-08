"""What the two clerestory windows look out on: a late-afternoon sky over
two layers of tree canopy, painted once with numpy into .room-cache/ (no
alpha, the windows frame it). Lit sides #7fb34a toward the sun at the
upper right, shade #2f5a24."""

import os

import bpy
import numpy as np

from assets import ROOT

W, H = 1024, 512
PATH = os.path.join(ROOT, ".room-cache", "a_trees.png")


def _rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)], dtype=np.float32)


def _noise(rng, cells, octaves=4):
    """Fractal value noise in [0, 1], (H, W)."""
    out = np.zeros((H, W), dtype=np.float32)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        cy, cx = cells * 2**o // 2 + 2, cells * 2**o + 2
        g = rng.random((cy + 1, cx + 1)).astype(np.float32)
        ys = np.linspace(0, cy - 1, H)
        xs = np.linspace(0, cx - 1, W)
        y0, x0 = ys.astype(int), xs.astype(int)
        fy, fx = (ys - y0)[:, None], (xs - x0)[None, :]
        fy, fx = fy * fy * (3 - 2 * fy), fx * fx * (3 - 2 * fx)
        a = g[y0][:, x0] * (1 - fx) + g[y0][:, x0 + 1] * fx
        b = g[y0 + 1][:, x0] * (1 - fx) + g[y0 + 1][:, x0 + 1] * fx
        out += amp * (a * (1 - fy) + b * fy)
        total += amp
        amp *= 0.5
    return out / total


def _canopy(rng, img, blobs, lit, shade, haze, leaf):
    """Lay round, ragged crowns over `img`, lit from the upper right."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    edge = _noise(rng, 24, 3)
    for cx, cy, r in blobs:
        d = np.hypot((xx - cx) / r, (yy - cy) / (r * 0.92))
        rag = d + (edge - 0.5) * 0.55
        mask = np.clip((1.0 - rag) * 6.0, 0, 1)
        if not mask.any():
            continue
        lx, ly = (xx - cx) / r, (yy - cy) / r
        light = np.clip(0.55 + 0.6 * (0.7 * lx - 0.7 * ly) - 0.25 * d, 0, 1)
        col = shade[None, None] * (1 - light[..., None]) + lit[None, None] * light[..., None]
        col *= (0.78 + 0.44 * leaf)[..., None]
        col = col * (1 - haze) + _rgb("#dfe6d8") * haze
        img[:] = img * (1 - mask[..., None]) + col * mask[..., None]


def draw():
    """Write the backdrop PNG (once) and return its path."""
    if os.path.exists(PATH):
        return PATH
    rng = np.random.default_rng(7)
    t = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
    img = _rgb("#b8d2e6")[None, None] * (1 - t) + _rgb("#ecd9b8")[None, None] * t
    img = np.repeat(img, W, axis=1).astype(np.float32)
    leaf = _noise(rng, 90, 3)
    far = [(x, rng.uniform(110, 170), rng.uniform(80, 120)) for x in np.linspace(-40, W + 40, 16)]
    _canopy(rng, img, far, _rgb("#a9c27e"), _rgb("#6f8a5a"), 0.35, leaf)
    for x in np.linspace(60, W - 60, 7):
        x0 = int(x + rng.uniform(-30, 30))
        img[260:, x0 - 4 : x0 + 4] = _rgb("#4a3b2c")
    near = [(x, rng.uniform(210, 300), rng.uniform(130, 190)) for x in np.linspace(0, W, 9)]
    _canopy(rng, img, near, _rgb("#7fb34a"), _rgb("#2f5a24"), 0.0, leaf)
    img[440:] = img[440:] * 0.6 + _rgb("#2f4a22") * 0.4
    out = bpy.data.images.new("a_trees", W, H)
    rgba = np.concatenate([np.flipud(img), np.ones((H, W, 1), dtype=np.float32)], axis=2)
    out.pixels.foreach_set(np.clip(rgba, 0, 1).ravel())
    out.filepath_raw = PATH
    out.file_format = "PNG"
    out.save()
    bpy.data.images.remove(out)
    return PATH
