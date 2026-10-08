"""Boots for the gear wall: a ski boot (hard shell, tall cuff, buckles)
and a motorcycle boot (black leather, shin plate, ratchet straps), from one
ring-lofted body. Boot axes: x toward the toe, y up, z across; the buckles
sit on the +z side."""

import math

from decor._g_common import Mesh, V, cyl, emit, frame, loft, rbox, sweep

SKI = dict(af=0.150, ab=0.112, azf=0.058, azs=0.066, axs=0.082, cx0=0.03, cxs=-0.03, h0=0.07, h1=0.17, lean=0.30, top=0.36, flare=0.05)
MOTO = dict(af=0.150, ab=0.108, azf=0.054, azs=0.062, axs=0.074, cx0=0.035, cxs=-0.012, h0=0.06, h1=0.14, lean=0.04, top=0.33, flare=0.03)


def _smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def _sp(x, p):
    return math.copysign(abs(x) ** p, x)


def ring(h, p, grow=0.0, n=28):
    """The boot's outline at height h: a long foot near the floor turning
    into the round cuff above the ankle."""
    f = _smooth((h - p["h0"]) / (p["h1"] - p["h0"]))
    cx = p["cx0"] * (1 - f) + (p["cxs"] + p["lean"] * max(0.0, h - p["h1"])) * f
    flare = 1 + p["flare"] * _smooth((h - (p["top"] - 0.06)) / 0.06)
    pts = []
    for j in range(n):
        a = -math.tau * j / n
        c, s = math.cos(a), math.sin(a)
        axf = p["af"] if c > 0 else p["ab"]
        toe = 1 - 0.34 * _smooth((h - 0.04) / 0.07) * (1 - f) * max(0.0, c)
        ax = (axf * toe * (1 - f) + p["axs"] * f) * flare + grow
        az = (p["azf"] * (1 - f) + p["azs"] * f) * flare + grow
        pts.append(V((cx + ax * _sp(c, 0.72), h, az * _sp(s, 0.72))))
    return pts


def _hs(a, b, n):
    return [a + (b - a) * i / n for i in range(n + 1)]


def _body(p, parts):
    heights = [0.026, 0.05, 0.08, 0.11, 0.14, 0.17]
    top = p["top"]
    heights_up = _hs(0.19, top, 7)
    loft(parts["shell"], [ring(h, p) for h in heights + [0.17]], caps=(False, False))
    loft(parts["cuff"], [ring(h, p) for h in [0.17] + heights_up], caps=(False, False))
    t = ring(top, p)
    lip = [V((q.x * 0.9 + p["cxs"] * 0.1 + 0.002, top - 0.003, q.z * 0.88)) for q in t]
    deep = [V((q.x * 0.88 + p["cxs"] * 0.12, top - 0.1, q.z * 0.86)) for q in t]
    loft(parts["cuff"], [t, lip], caps=(False, False))
    loft(parts["inner"], [lip, deep], caps=(False, True))
    loft(parts["sole"], [ring(0.0, p, 0.005), ring(0.012, p, 0.007), ring(0.03, p, 0.002)], caps=(True, False))
    # a stepped heel block under the sole
    rbox(parts["sole"], frame(V((p["cxs"] - 0.06, 0.012, 0)), (1, 0, 0), (0, 1, 0)), (0.075, 0.03, 0.105), 0.008, seg=1)


def _ski_details(p, parts):
    z = p["azs"] + 0.004
    # three cuff buckles, a tongue overlap line and a wide power strap
    for h, lx in ((0.215, 0.012), (0.27, 0.004), (0.325, -0.004)):
        c = ring(h, p)[21]
        sweep(parts["metal"], [V((c.x - 0.045, h, c.z + 0.001)), V((c.x + 0.05, h + 0.004, c.z + 0.001))], 0.0035, sides=6, smooth_path=False)
        rbox(parts["accent"], frame(V((c.x - 0.045, h, c.z + 0.004)), (1, 0, 0), (0, 1, 0)), (0.03, 0.022, 0.008), 0.003, seg=1)
        rbox(parts["accent"], frame(V((c.x + 0.05, h + 0.004, c.z + 0.003)), (1, 0, 0), (0, 1, 0)), (0.02, 0.018, 0.007), 0.003, seg=1)
    band = [ring(0.345, p, 0.004)[j % 28] for j in range(29)]
    sweep(parts["strap"], band, (0.0025, 0.018), up=V((0, 1, 0)), sides=6, step=0.02)
    rbox(parts["metal"], frame(band[21] + V((0, 0, 0.004)), (1, 0, 0), (0, 1, 0)), (0.032, 0.024, 0.006), 0.002, seg=1)
    # one foot buckle across the instep
    c = ring(0.085, p)[21]
    sweep(parts["metal"], [V((c.x - 0.02, 0.09, c.z + 0.001)), V((c.x + 0.05, 0.095, c.z + 0.001))], 0.0035, sides=6, smooth_path=False)
    rbox(parts["accent"], frame(V((c.x + 0.05, 0.095, c.z + 0.003)), (1, 0, 0), (0, 1, 0)), (0.026, 0.02, 0.008), 0.003, seg=1)
    # a shell flash behind the ankle
    for s in (1, -1):
        q = ring(0.2, p)[21 if s > 0 else 7]
        rbox(parts["accent"], frame(V((q.x - 0.01, 0.2, s * (abs(q.z) + 0.001))), (0, 1, 0), (1, 0, 0)), (0.06, 0.01, 0.003), 0.001, seg=1)


def _moto_details(p, parts):
    # shin plate: a bevelled panel up the front of the shaft
    c = ring(0.2, p)[0]
    rbox(parts["metal"], frame(V((c.x + 0.003, 0.2, 0.0)), (0, 1, 0), (1, 0, 0)), (0.14, 0.012, 0.075), 0.005, seg=1)
    # two ratchet straps round the shaft with silver buckles
    for h in (0.14, 0.24):
        band = [ring(h, p, 0.004)[j % 28] for j in range(29)]
        sweep(parts["strap"], band, (0.0025, 0.016), up=V((0, 1, 0)), sides=6, step=0.02)
        q = band[21]
        rbox(parts["metal"], frame(q + V((0, 0, 0.003)), (1, 0, 0), (0, 1, 0)), (0.036, 0.03, 0.007), 0.0025, seg=1)
        rbox(parts["accent"], frame(q + V((0, 0, 0.007)), (1, 0, 0), (0, 1, 0)), (0.024, 0.018, 0.004), 0.002, seg=1)
    # toe slider and heel counter, a zip line on the inside, stitching
    t = ring(0.045, p)[0]
    rbox(parts["accent"], frame(V((t.x - 0.012, 0.045, 0)), (1, 0, 0), (0, 1, 0)), (0.045, 0.034, 0.088), 0.012, seg=2)
    h = ring(0.07, p)[14]
    rbox(parts["accent"], frame(V((h.x + 0.003, 0.075, 0)), (1, 0, 0), (0, 1, 0)), (0.018, 0.075, 0.07), 0.007, seg=1)
    zip_line = [V((ring(h2, p)[21].x - 0.003, h2, ring(h2, p)[21].z - 0.002)) for h2 in (0.07, 0.14, 0.2, 0.28, 0.325)]
    sweep(parts["metal"], zip_line, 0.003, sides=6, step=0.03)


def boot(k, name, at, toe, kind, mirror=False):
    """A boot standing on the floor at `at`, toe toward the site vector
    `toe` (flat), buckles on the side that faces the viewer."""
    p = SKI if kind == "ski" else MOTO
    parts = {key: Mesh() for key in ("shell", "cuff", "sole", "inner", "metal", "accent", "strap")}
    _body(p, parts)
    (_ski_details if kind == "ski" else _moto_details)(p, parts)
    if mirror:
        for m in parts.values():
            m.verts = [V((v.x, v.y, -v.z)) for v in m.verts]
    place = frame(at, toe, (0, 1, 0))
    if kind == "ski":
        mats = dict(
            shell=k.mat("skiboot_shell", "#1d2023", 0.45, coat=0.4),
            cuff=k.mat("skiboot_cuff", "#2a2e32", 0.4, coat=0.5),
            accent=k.mat("skiboot_accent", "#ff6a2a", 0.4),
            strap=k.mat("skiboot_strap", "#16181a", 0.8, bump=0.2, bump_scale=300),
        )
    else:
        mats = dict(
            shell=k.mat("motoboot_leather", "#131313", 0.42, coat=0.3, coat_rough=0.25, bump=0.12, bump_scale=240),
            cuff=k.mat("motoboot_leather", "#131313", 0.42),
            accent=k.mat("motoboot_slider", "#3b3d40", 0.4),
            strap=k.mat("motoboot_strap", "#1c1c1c", 0.7),
        )
    mats.update(
        sole=k.mat("boot_sole_dark", "#101112", 0.85),
        inner=k.mat("boot_inside_dark", "#0d0d0e", 0.95),
        metal=k.mat("boot_metal", "#a9acb0", 0.3, metal=1.0),
    )
    for key, m in parts.items():
        emit(k, f"{name}_{key}", m.moved(place), mats[key])
