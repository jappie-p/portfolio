"""The windsurf clutter (bible 3.38): two olive crates with a yellow strap
and the black harness dropped on top, olive rubber boots beside them,
between the rug and the road bike's trainer; a plant between board and
sail, and the small road photo on the right wall past the sail (3.39)."""

import math

from decor._c_assets import decimate, fit, tint
from decor._c_geo import Mesh, V, emit, frame, loft, rbox, sweep
from decor._c_paint import road_photo


def build(k):
    with k.group("right_wall"):
        for i, (at, rot) in enumerate((((4.1, 0, 1.86), 28), ((4.2, 0, 1.97), 12))):
            _boot(k, f"boot_{i}", at, rot)
        top = _crates(k, (4.1, 0, 1.45))
        _harness(k, (4.1, top, 1.45))
        plant = k.asset("potted_plant_02", (5.32, 0, 2.05), (0, 15, 0))
        fit(k, plant, height=0.5)
        decimate(plant, 0.35, dirt=0.04)
        _frame(k, (5.598, 1.5, 3.215))


def _boot_ring(h, n=24):
    """A boot's outline at height h: a long foot near the floor turning
    into a round shaft above the ankle (x toward the toe)."""
    f = max(0.0, min(1.0, (h - 0.06) / 0.09))
    f = f * f * (3 - 2 * f)
    cx = 0.055 * (1 - f)
    ax = 0.145 * (1 - f) + 0.066 * f + 0.006 * max(0.0, h - 0.22) / 0.1
    az = 0.05 * (1 - f) + 0.057 * f + 0.008 * max(0.0, h - 0.22) / 0.1
    ring = []
    for j in range(n):
        a = -math.tau * j / n
        c, s = math.cos(a), math.sin(a)
        toe = 1 + 0.12 * max(0.0, c) * (1 - f)
        ring.append(V((cx + ax * math.copysign(abs(c) ** 0.8, c) * toe, h, az * math.copysign(abs(s) ** 0.8, s))))
    return ring


def _boot(k, name, at, rot):
    """An olive rubber boot: dark sole, the shaft, a strap and buckle, and
    the dark opening at the top."""
    sole, rubber, inner, strap = Mesh(), Mesh(), Mesh(), Mesh()
    hs = [0.0, 0.012, 0.026]
    loft(sole, [_boot_ring(h) for h in hs], caps=(True, False))
    hb = [0.026, 0.05, 0.08, 0.11, 0.14, 0.18, 0.24, 0.3, 0.32]
    loft(rubber, [_boot_ring(h) for h in hb], caps=(False, False))
    top = _boot_ring(0.32)
    lip = [V((p.x * 0.88, 0.318, p.z * 0.88)) for p in top]
    deep = [V((p.x * 0.86, 0.26, p.z * 0.86)) for p in top]
    loft(rubber, [top, lip], caps=(False, False))
    loft(inner, [lip, deep], caps=(False, True))
    band = [V((p.x * 1.012, 0.235, p.z * 1.012)) for p in _boot_ring(0.235)]
    sweep(strap, band + band[:1], (0.0025, 0.012), up=V((0, 1, 0)), sides=6, step=0.02)
    rbox(strap, frame(band[18] + V((0.0, 0.0, -0.004)), (1, 0, 0), (0, 1, 0)), (0.03, 0.026, 0.008), 0.003, seg=1)
    place = frame(at, (math.cos(math.radians(rot)), 0, -math.sin(math.radians(rot))), (0, 1, 0))
    emit(k, name, rubber.moved(place), k.mat("boot_olive", "#4b5636", 0.6, noise=30, mottle=0.08))
    emit(k, name + "_sole", sole.moved(place), k.mat("boot_sole", "#262820", 0.8))
    emit(k, name + "_inside", inner.moved(place), k.mat("boot_inside", "#171815", 0.95))
    emit(k, name + "_strap", strap.moved(place), k.mat("boot_strap", "#2b3122", 0.7))


def _harness(k, at):
    """A seat harness dropped on the floor: a soft black lump, orange
    webbing over it, the spreader bar and its hook."""
    body, web, bar = Mesh(), Mesh(), Mesh()
    rbox(body, frame((0, 0.065, 0), (1, 0, 0), (0, 1, 0)), (0.34, 0.13, 0.29), 0.055, seg=3)
    # let it slump: lower and wider toward the edges
    body.verts = [V((p.x * (1 + 0.06 * (0.065 - p.y) / 0.065), p.y * (0.78 + 0.22 * (1 - (p.x / 0.17) ** 2)), p.z)) for p in body.verts]
    for x in (-0.09, 0.07):
        pts = [V((x + 0.01 * math.sin(i), 0.002 + 0.115 * math.sin(math.pi * (i / 8)) ** 0.35 * (0.78 + 0.22 * (1 - (x / 0.17) ** 2)), -0.165 + 0.33 * i / 8)) for i in range(9)]
        sweep(web, pts, (0.02, 0.003), up=V((1, 0, 0)), sides=6, step=0.02)
    sweep(bar, [V((0.12, 0.05, -0.12)), V((0.2, 0.06, 0.0)), V((0.12, 0.05, 0.12))], 0.009, sides=10, step=0.02)
    sweep(bar, [V((0.2, 0.06, 0.0)), V((0.26, 0.06, 0.0)), V((0.27, 0.1, 0.0))], 0.006, sides=8, step=0.015)
    place = frame(at, (math.cos(math.radians(25)), 0, -math.sin(math.radians(25))), (0, 1, 0))
    emit(k, "harness", body.moved(place), k.mat("harness_black", "#1c1c1c", 0.85, bump=0.3, bump_scale=240))
    emit(k, "harness_webbing", web.moved(place), k.mat("rig_rope", "#ff6a2a", 0.75))
    emit(k, "harness_bar", bar.moved(place), k.mat("bk_steel", "#a8a8a8", 0.3, metal=1.0))


def _crates(k, at):
    """Two olive crates, the top one turned a little, with a yellow
    ratchet strap round both. Returns the height of the top."""
    x, _, z = at
    lo = k.asset("plastic_crate_02", (x, 0, z), (0, -8, 0))
    fit(k, lo, width=0.42)
    tint(lo, "#5f6a44")
    decimate(lo, 0.5)
    bl, bh = k.bounds(lo)
    lo.location.z -= bl[1]
    h = bh[1] - bl[1]
    hi_ = k.asset("plastic_crate_02", (x, h - bl[1], z), (0, -4, 0))
    fit(k, hi_, width=0.42)
    tint(hi_, "#5f6a44")
    decimate(hi_, 0.5)
    # strap: a loop over both crates, in the plane across the wall
    top = 2 * h + 0.004
    hx = (bh[0] - bl[0]) / 2 + 0.004
    pts = [V((x - hx, 0.01, z)), V((x - hx, top - 0.02, z)), V((x - hx + 0.02, top, z)), V((x + hx - 0.02, top, z)), V((x + hx, top - 0.02, z)), V((x + hx, 0.01, z))]
    strap = Mesh()
    sweep(strap, pts, (0.0015, 0.019), up=V((0, 0, 1)), sides=6, step=0.03, smooth_path=False)
    rbox(strap, frame(V((x - hx - 0.012, top * 0.6, z)), (0, 1, 0), (-1, 0, 0)), (0.07, 0.02, 0.045), 0.006, seg=1)
    emit(k, "crate_strap", strap, k.mat("strap_yellow", "#e2b422", 0.6))
    return top


def _frame(k, at):
    """A small black frame on the wall: cream mount and the road photo."""
    w, h, p = 0.2, 0.26, 0.015
    place = frame(at, (0, 0, 1), (0, 1, 0))
    rim, mount, photo = Mesh(), Mesh(), Mesh()
    # four mitred lengths of moulding, a step down to the inner edge
    outer = [V((-w / 2, -h / 2, 0)), V((w / 2, -h / 2, 0)), V((w / 2, h / 2, 0)), V((-w / 2, h / 2, 0))]
    inner = [V((c.x - math.copysign(p, c.x), c.y - math.copysign(p, c.y), 0)) for c in outer]
    for i in range(4):
        a, b, c, d = outer[i], outer[(i + 1) % 4], inner[(i + 1) % 4], inner[i]
        lip = [d.lerp(a, 0.35), c.lerp(b, 0.35)]
        ring = [a, b, c, d]
        verts = ring + [q + V((0, 0, 0.018)) for q in (a, b, *lip)] + [q + V((0, 0, 0.013)) for q in (c, d)]
        faces = [(3, 2, 1, 0), (0, 1, 5, 4), (4, 5, 7, 6), (6, 7, 8, 9), (8, 9, 3, 2), (0, 4, 6, 9, 3), (1, 2, 8, 7, 5)]
        rim.add(verts, faces)
    rbox(mount, frame((0, 0, 0.006), (1, 0, 0), (0, 1, 0)), (w - 2 * p + 0.002, h - 2 * p + 0.002, 0.004), 0.0005, seg=1)
    pw, ph = 0.12, 0.16
    quad = [V((-pw / 2, -ph / 2 + 0.008, 0.0085)), V((pw / 2, -ph / 2 + 0.008, 0.0085)), V((pw / 2, ph / 2 + 0.008, 0.0085)), V((-pw / 2, ph / 2 + 0.008, 0.0085))]
    photo.add(quad, [(0, 1, 2, 3)], 0, [[(0, 0), (1, 0), (1, 1), (0, 1)]])
    emit(k, "road_frame_rim", rim.moved(place), k.mat("frame_black", "#1c1c1c", 0.45))
    emit(k, "road_frame_mount", mount.moved(place), k.mat("frame_mount", "#f1ebdd", 0.85))
    emit(k, "road_frame_photo", photo.moved(place), k.image_mat("road_photo", road_photo(), rough=0.4), recalc=False)
