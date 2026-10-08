"""Builder B's picture painter: noise, a canvas with landscape layers (a
sky with a low warm sun, hazy ranges, water, hills, trees, a path) and a
plain PNG writer. Pure numpy, so it also runs outside Blender. The scenes
themselves are in _b_scenes.py."""

import os
import struct
import zlib

import numpy as np



def rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)])


# -- noise ---------------------------------------------------------------


def _value(h, w, gh, gw, rng):
    """Smooth value noise, `gh` x `gw` cells over the image."""
    g = rng.random((gh + 2, gw + 2))
    ys = np.linspace(0, gh, h, endpoint=False)
    xs = np.linspace(0, gw, w, endpoint=False)
    y0, x0 = ys.astype(int), xs.astype(int)
    ty, tx = ys - y0, xs - x0
    ty, tx = ty * ty * (3 - 2 * ty), tx * tx * (3 - 2 * tx)
    top = g[y0][:, x0] + (g[y0][:, x0 + 1] - g[y0][:, x0]) * tx
    bot = g[y0 + 1][:, x0] + (g[y0 + 1][:, x0 + 1] - g[y0 + 1][:, x0]) * tx
    return top + (bot - top) * ty[:, None]


def fbm(h, w, cells, octaves, rng, gain=0.5):
    """Fractal noise in 0..1; `cells` = (rows, cols) of the coarsest octave."""
    total, amp, norm = np.zeros((h, w)), 1.0, 0.0
    for o in range(octaves):
        gh, gw = max(1, int(cells[0] * 2**o)), max(1, int(cells[1] * 2**o))
        total += amp * _value(h, w, gh, gw, rng)
        norm += amp
        amp *= gain
    return total / norm


def line(w, cells, octaves, rng):
    """A 1-D fractal profile in 0..1 (a ridge or a shore)."""
    return fbm(1, w, (1, cells), octaves, rng)[0]


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


# -- canvas --------------------------------------------------------------


class Canvas:
    def __init__(self, w, h, seed):
        self.w, self.h = w, h
        self.rng = np.random.default_rng(seed)
        self.img = np.zeros((h, w, 3))
        self.y = np.linspace(0, 1, h)[:, None]  # 0 at the top
        self.x = np.linspace(0, 1, w)[None, :]

    def paint(self, mask, color):
        """Lay `color` (a hex, an rgb or an h x w x 3 array) over `mask`."""
        c = rgb(color) if isinstance(color, str) else np.asarray(color)
        m = np.clip(mask, 0, 1)[..., None]
        self.img = self.img * (1 - m) + c * m

    def below(self, profile, soft=1.2):
        """Mask of everything under a 1-D profile (y per column, 0 = top)."""
        return np.clip((self.y - profile[None, :]) * self.h / soft + 0.5, 0, 1)

    def poly(self, pts, ss=2):
        """An antialiased mask of a polygon given in 0..1 image fractions."""
        acc = np.zeros((self.h, self.w))
        for oy in range(ss):
            for ox in range(ss):
                X = (np.arange(self.w)[None, :] + (ox + 0.5) / ss) / self.w
                Y = (np.arange(self.h)[:, None] + (oy + 0.5) / ss) / self.h
                inside = np.zeros((self.h, self.w), bool)
                for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]):
                    if y1 == y2:
                        continue
                    cross = ((y1 > Y) != (y2 > Y)) & (X < (x2 - x1) * (Y - y1) / (y2 - y1) + x1)
                    inside ^= cross
                acc += inside
        return acc / ss**2

    def noise(self, cells, octaves=5):
        return fbm(self.h, self.w, cells, octaves, self.rng)

    # -- layers ----------------------------------------------------------

    def sky(self, top, horizon, sun=(0.75, 0.62), glow="#ffd49a", glow_size=0.35, clouds=0.25, horizon_y=0.6):
        t = np.clip(self.y / horizon_y, 0, 1) ** 1.3
        base = rgb(top) * (1 - t[..., None]) + rgb(horizon) * t[..., None]
        self.img = np.broadcast_to(base, (self.h, self.w, 3)).copy()
        aspect = self.w / self.h
        d = np.sqrt(((self.x - sun[0]) * aspect) ** 2 + (self.y - sun[1]) ** 2)
        self.paint(np.exp(-((d / glow_size) ** 2)) * 0.85, glow)
        self.paint(np.exp(-((d / (glow_size * 0.12)) ** 2)), "#fff6e0")
        if clouds:
            n = fbm(self.h, self.w, (3, 2), 5, self.rng)
            band = smooth(0.0, 0.15, self.y) * (1 - smooth(horizon_y * 0.7, horizon_y, self.y))
            c = smooth(0.52, 0.72, n) * band * clouds
            lit = np.clip(1 - d / 0.9, 0, 1)[..., None]
            col = rgb("#fbf1e2") * (1 - lit) * 0.92 + rgb("#ffe0b0") * lit
            self.paint(c, col)

    def range(self, base, amp, cells, color, haze, haze_color, peaks=(), snow=None, rough=6, sun_x=0.75):
        """A mountain range: a ridge line, hazed toward `haze_color`, lit on
        the broad faces turned to the sun, with gullies and optional snow
        above `snow`."""
        r = line(self.w, cells, rough, self.rng)
        prof = base - amp * r
        xs = np.linspace(0, 1, self.w)
        for px, ph, pw in peaks:
            tri = np.clip(1 - np.abs(xs - px) / pw, 0, 1) ** 1.25
            jag = 1 + 0.06 * (line(self.w, 20, 3, self.rng) - 0.5)
            prof = np.minimum(prof, base - ph * tri * jag)
        mask = self.below(prof)
        k = max(3, self.w // 8)
        padded = np.pad(prof, k, mode="edge")
        soft = np.convolve(padded, np.ones(k) / k, mode="same")[k:-k]
        slope = np.gradient(soft) * self.w
        face = np.tanh(-slope * np.sign(sun_x - xs) * 1.5)[None, :]
        depth = np.clip((self.y - prof[None, :]) / 0.3, 0, 1)
        rock = self.noise((5, 7), 5)
        under = np.clip((self.y - prof[None, :]) / 0.08, 0, 1)
        light = np.clip(0.5 + 0.42 * face * (0.6 + 0.4 * under) + 0.25 * (rock - 0.5), 0, 1)[..., None]
        col = rgb(color) * (0.7 + 0.55 * light)
        col = col + rgb("#ffcf94") * 0.1 * np.clip(light - 0.5, 0, 1) * 2
        gully = rock
        if snow is not None:
            s = smooth(snow + 0.03, snow - 0.03, self.y + 0.08 * (gully - 0.5)) * (1 - depth) ** 0.5
            s = s[..., None]
            col = col * (1 - s) + rgb("#f7efe4") * (0.7 + 0.4 * light) * s
        hz = np.clip(haze + (1 - haze) * 0.45 * depth[..., None] ** 1.5, 0, 1)
        col = col * (1 - hz) + rgb(haze_color) * hz
        self.paint(mask, col)
        return prof

    def water(self, top, bottom, color, ripple=0.5):
        """Water from `top` to `bottom` (fractions of the height), mirroring
        what is painted above it, broken by ripples."""
        y0, y1 = int(top * self.h), int(bottom * self.h)
        rows = np.arange(y0, y1)
        src = np.clip(2 * y0 - rows, 0, self.h - 1)
        refl = self.img[src] * 0.72 + rgb(color) * 0.28
        n = fbm(y1 - y0, self.w, (18, 3), 4, self.rng)
        rip = (np.sin((rows[:, None] - y0) ** 0.8 * 2.4 + n * 9) * 0.5 + 0.5) * ripple
        refl = refl * (1 - 0.18 * rip[..., None]) + rgb("#fff1d6") * 0.12 * smooth(0.82, 0.95, rip)[..., None]
        self.img[y0:y1] = refl

    def hill(self, base, amp, cells, light, shade, rough=4, grass=True):
        """A grassy hill: lit near its crest, darker and richer toward the
        viewer, with sun-dappled patches and fine blades."""
        prof = base - amp * line(self.w, cells, rough, self.rng)
        mask = self.below(prof)
        depth = np.clip((self.y - prof[None, :]) / 0.45, 0, 1)
        patches = self.noise((3, 4), 5)
        t = np.clip(depth * 0.75 + (0.5 - patches) * 0.8, 0, 1)[..., None]
        col = rgb(light) * (1 - t) + rgb(shade) * t
        if grass:
            blades = fbm(self.h, self.w, (90, 6), 3, self.rng)
            col = col * (0.8 + 0.4 * blades[..., None] * (0.3 + depth[..., None]))
            crest = np.exp(-(((self.y - prof[None, :]) / 0.012) ** 2))[..., None]
            col = col + rgb("#fff0b0") * 0.18 * crest
        self.paint(mask, col)
        return prof

    def cliff(self, top_prof, bottom, until_x, color="#a58f6e"):
        """A sunlit rock face under a hill's edge, down to `bottom`."""
        m = self.below(top_prof + 0.008) * (1 - self.below(np.full(self.w, bottom))) * smooth(until_x + 0.01, until_x - 0.01, self.x)
        streak = fbm(self.h, self.w, (4, 40), 4, self.rng)
        lit = smooth(0.0, until_x, self.x)[..., None]
        col = rgb(color) * (0.6 + 0.5 * streak[..., None]) * (0.75 + 0.35 * lit)
        self.paint(m, col)

    def path(self, top, bottom, x_top, x_bottom, w_top, w_bottom, bend=0.06, color="#dcc79c"):
        """A path from far (narrow, at y `top`) to near (wide, at `bottom`)."""
        t = np.clip((self.y - top) / (bottom - top), 0, 1)
        cx = x_top + (x_bottom - x_top) * t ** 1.4 + bend * np.sin(t * 3.4)
        hw = (w_top + (w_bottom - w_top) * t**1.8) / 2
        edge = np.abs(self.x - cx) - hw * (1 + 0.15 * (self.noise((20, 6), 3) - 0.5))
        mask = np.clip(-edge * self.w / 1.5, 0, 1) * (self.y > top)
        tex = self.noise((40, 30), 4)
        rut = np.exp(-(((np.abs(self.x - cx) - hw * 0.45) / (hw * 0.12 + 1e-4)) ** 2))
        col = rgb(color)[None, None, :] * (0.85 + 0.3 * tex[..., None]) * (1 - 0.18 * rut[..., None])
        self.paint(np.clip(-edge * self.w / 4 + 1.5, 0, 1) * (self.y > top) * 0.35, "#5d5a32")
        self.paint(mask, col)

    def conifer(self, x, base, height, color="#24402a", lit="#4f6b3a", width=0.28):
        """A spruce: stacked jagged tiers, lit on the sun side."""
        top = base - height
        t = np.clip((self.y - top) / height, 0, 1)
        tiers = 0.65 + 0.35 * ((t * 7) % 1)
        hw = width * height * t * tiers * self.h / self.w
        jag = 1 + 0.25 * (self.noise((40, 40), 2) - 0.5)
        d = np.abs(self.x - x) - hw * jag
        mask = np.clip(-d * self.w / 1.2, 0, 1) * (self.y > top) * (self.y < base)
        side = np.clip((self.x - x) / (hw + 1e-4), -1, 1)
        col = rgb(color) * (1 - np.clip(side, 0, 1)[..., None] * 0.6) + rgb(lit) * np.clip(side, 0, 1)[..., None] * 0.6
        self.paint(mask, col)

    def tree(self, x, base, height, light="#8fae4a", shade="#35552a", trunk="#4a3a2a", blobs=9):
        """A broad-leaf tree: a trunk and a canopy of overlapping clumps lit
        from the upper right."""
        ar = self.h / self.w
        tw = height * 0.035 * ar
        trunk_m = (np.abs(self.x - x) < tw * (1 + 0.6 * np.clip((self.y - base + height * 0.45) / (height * 0.45), 0, 1))) * (self.y < base) * (self.y > base - height * 0.55)
        self.paint(trunk_m.astype(float), trunk)
        cy = base - height * 0.62
        r = height * 0.38
        mask = np.zeros((self.h, self.w))
        shade_t = np.zeros((self.h, self.w))
        for _ in range(blobs):
            ox, oy = np.clip(self.rng.normal(0, r * 0.4), -r * 0.6, r * 0.6), np.clip(self.rng.normal(0, r * 0.3), -r * 0.4, r * 0.4)
            rr = r * self.rng.uniform(0.45, 0.7)
            d = np.sqrt(((self.x - x - ox * ar) / ar) ** 2 + (self.y - cy - oy) ** 2) / rr
            mask = np.maximum(mask, np.clip((1 - d) * rr * self.h / 1.5, 0, 1))
            shade_t = np.maximum(shade_t, np.clip(1 - d, 0, 1))
        leaf = self.noise((30, 30), 4)
        mask *= smooth(0.15, 0.45, leaf + 0.35 * shade_t)
        lit = np.clip(0.5 + ((self.x - x) / ar * 0.8 - (self.y - cy)) / r, 0, 1)
        t = np.clip(lit * 0.8 + (leaf - 0.5) * 0.7, 0, 1)[..., None]
        self.paint(mask, rgb(shade) * (1 - t) + rgb(light) * t)

    def mist(self, y, thickness, color="#f2dcc0", amount=0.5):
        m = np.exp(-(((self.y - y) / thickness) ** 2)) * amount * (0.7 + 0.6 * self.noise((3, 4), 3))
        self.paint(m, color)

    def specks(self, top, colors, n=400, size=1):
        """Wild flowers: tiny dots in the near meadow."""
        for _ in range(n):
            px = int(self.rng.random() * self.w)
            py = int((top + (1 - top) * self.rng.random() ** 0.6) * (self.h - 1))
            c = rgb(colors[self.rng.integers(len(colors))])
            self.img[py : py + size, px : px + size] = self.img[py : py + size, px : px + size] * 0.3 + c * 0.7

    def grade(self, warmth=0.12, vignette=0.22):
        """The shared warm golden-hour grade: warm highlights, lifted
        blacks, a soft vignette and a little film grain."""
        img = self.img
        lum = img.mean(axis=2, keepdims=True)
        img = lum + (img - lum) * 1.25
        img = (img - 0.5) * 1.1 + 0.5
        img = img * (1 - warmth) + img * rgb("#ffd9a8") * warmth * 2 * (0.5 + lum)
        img = 0.035 + img * 0.95
        d = np.sqrt((self.x - 0.5) ** 2 * 1.2 + (self.y - 0.5) ** 2)
        img = img * (1 - vignette * smooth(0.3, 0.75, d))[..., None]
        img += (self.rng.random(img.shape[:2]) - 0.5)[..., None] * 0.025
        self.img = np.clip(img, 0, 1)


# -- output --------------------------------------------------------------


def write_png(path, img):
    """An h x w x 3 sRGB float array as an 8-bit PNG (no imaging library)."""
    h, w, _ = img.shape
    raw = (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)
    rows = b"".join(b"\x00" + raw[y].tobytes() for y in range(h))

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b"")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path + ".part", "wb") as f:
        f.write(png)
    os.replace(path + ".part", path)
