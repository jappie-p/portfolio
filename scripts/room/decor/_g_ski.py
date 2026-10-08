"""A pair of all-mountain skis, their poles and the wall rack that holds
them. Ski axes: x from the tail to the tip, y out of the top sheet, z
across. The tip rocks up, the waist is narrow (sidecut), the top sheet
carries a printed graphic, the bindings sit at the middle."""

import math

import numpy as np

from decor._c_paint import _grain, _mask, _save, _srgb
from decor._g_common import WALL, Mesh, V, cyl, emit, frame, loft, rbox, revolve, sweep

L = 1.66
WAIST = 0.78


def half_width(s):
    """Sidecut: a tail 88 mm, a waist 72 mm, a tip 98 mm, rounded ends."""
    if s < WAIST:
        w = 0.036 + 0.008 * ((WAIST - s) / WAIST) ** 2
    else:
        w = 0.036 + 0.013 * ((s - WAIST) / (L - WAIST)) ** 2
    tip = max(0.0, (s - (L - 0.12)) / 0.12)
    tail = max(0.0, (0.05 - s) / 0.05)
    return w * math.sqrt(max(0.0, 1 - tip**2.3)) * (1 - 0.35 * tail**2)


def rise(s):
    """Camber under the foot, a tip rocker and a small tail kick."""
    r = 0.008 * math.sin(math.pi * s / L)
    if s > 1.25:
        r += 0.08 * ((s - 1.25) / (L - 1.25)) ** 2.2
    if s < 0.14:
        r += 0.02 * ((0.14 - s) / 0.14) ** 2
    return r


def thick(s):
    return 0.011 + 0.006 * math.sin(math.pi * s / L) ** 0.6


def _ring(s):
    w, t, r = max(half_width(s), 0.002), thick(s), rise(s)
    e = 0.003
    prof = [(-w + e, 0), (w - e, 0), (w, e), (w, 0.6 * t), (w - 0.006, t), (-w + 0.006, t), (-w, 0.6 * t), (-w, e)]
    return [V((s, r + y, z)) for z, y in prof]


def _stations(n=72):
    return [L * (i / n) ** 1.0 for i in range(n + 1)]


def top_sheet_texture(w=1024, h=128):
    """The ski's top sheet: graphite, a pale diagonal, orange toward the tip."""
    img = np.empty((h, w, 3), dtype=np.float32)
    img[:] = _srgb("#1d2023")
    polys = [
        ("#2a2e32", [(0.0, 0.0), (0.0, 1.0), (0.58, 1.0), (0.5, 0.0)]),
        ("#e9e2cf", [(0.34, 0.0), (0.52, 1.0), (0.58, 1.0), (0.4, 0.0)]),
        ("#e9e2cf", [(0.42, 0.0), (0.6, 1.0), (0.62, 1.0), (0.44, 0.0)]),
        ("#ff6a2a", [(0.7, 0.0), (0.86, 1.0), (1.0, 1.0), (1.0, 0.0)]),
        ("#1d2023", [(0.78, 0.0), (0.9, 0.0), (0.97, 1.0), (0.93, 1.0)]),
        ("#ff6a2a", [(0.02, 0.4), (0.3, 0.4), (0.3, 0.6), (0.02, 0.6)]),
        ("#e9e2cf", [(0.88, 0.0), (0.92, 0.0), (0.99, 1.0), (0.97, 1.0)]),
    ]
    for color, poly in polys:
        img[_mask(w, h, poly)] = _srgb(color)
    return _save("ski_top", _grain(img, 0.012, 11))


def build_ski(k, name, place, tex):
    body, top = Mesh(), Mesh()
    ss = _stations()
    loft(body, [_ring(s) for s in ss], caps=(True, True))
    cols = 7
    grid = []
    for s in ss:
        w, t, r = max(half_width(s), 0.002), thick(s), rise(s)
        grid.append([V((s, r + t + 0.0006 + 0.002 * (1 - abs(c) ** 2), (c * (w - 0.006)))) for c in [-1 + 2 * j / (cols - 1) for j in range(cols)]])
    n = len(ss)
    for i in range(n - 1):
        for j in range(cols - 1):
            a, b, c, d = grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]
            top.add([a, b, c, d], [(0, 1, 2, 3)], 0, [[(ss[i] / L, j / (cols - 1)), (ss[i] / L, (j + 1) / (cols - 1)), (ss[i + 1] / L, (j + 1) / (cols - 1)), (ss[i + 1] / L, j / (cols - 1))]])
    black, orange, steel = Mesh(), Mesh(), Mesh()
    _binding(black, orange, steel)
    base = k.mat("ski_base", "#17191b", 0.35, coat=0.3)
    emit(k, name, body.moved(place), base)
    emit(k, name + "_top", top.moved(place), k.image_mat("ski_top", tex, rough=0.3), recalc=False)
    emit(k, name + "_binding", black.moved(place), k.mat("ski_binding", "#131415", 0.45))
    emit(k, name + "_lever", orange.moved(place), k.mat("ski_lever", "#ff6a2a", 0.4))
    emit(k, name + "_steel", steel.moved(place), k.mat("ski_steel", "#a9acb0", 0.3, metal=1.0))


def _y(s):
    return rise(s) + thick(s)


def _binding(black, orange, steel):
    """Toe piece, heel piece with its release lever, a plate and brake arms."""
    for s0, w in ((0.915, 0.047), (0.615, 0.047)):
        rbox(black, frame(V((s0 - 0.0, _y(s0) + 0.01, 0)), (1, 0, 0), (0, 1, 0)), (0.09, 0.02, 0.07), 0.006, seg=1)
    # toe: a housing with two wings and a sprung bar
    rbox(black, frame(V((0.935, _y(0.935) + 0.038, 0)), (1, 0, 0), (0, 1, 0)), (0.07, 0.044, 0.062), 0.012, seg=2)
    for sz in (1, -1):
        rbox(black, frame(V((0.9, _y(0.9) + 0.03, sz * 0.032)), (1, 0, 0), (0, 1, 0)), (0.05, 0.03, 0.016), 0.006, seg=1)
    rbox(orange, frame(V((0.96, _y(0.96) + 0.054, 0)), (1, 0, 0), (0, 1, 0)), (0.02, 0.008, 0.03), 0.003, seg=1)
    # heel: tower, a toothed top lever in orange
    rbox(black, frame(V((0.585, _y(0.585) + 0.045, 0)), (1, 0, 0), (0, 1, 0)), (0.075, 0.07, 0.068), 0.014, seg=2)
    rbox(orange, frame(V((0.575, _y(0.575) + 0.086, 0)), (1, 0.18, 0), (0, 1, 0)), (0.07, 0.012, 0.05), 0.004, seg=1)
    sweep(steel, [V((0.625, _y(0.625) + 0.035, -0.027)), V((0.665, _y(0.665) + 0.06, 0)), V((0.625, _y(0.625) + 0.035, 0.027))], 0.0035, sides=6, step=0.01)
    # brake arms from the heel piece back past the edges
    for sz in (1, -1):
        pts = [V((0.55, _y(0.55) + 0.014, sz * 0.025)), V((0.5, _y(0.5) + 0.006, sz * 0.05)), V((0.44, _y(0.44) + 0.006, sz * 0.058)), V((0.4, _y(0.4) + 0.02, sz * 0.056))]
        sweep(steel, pts, 0.0035, sides=6, step=0.015)


def build_pole(k, name, base, lean_x):
    """A ski pole standing on its tip, its top leaning onto the rack."""
    top = base + V((lean_x, 1.22, 0))
    u = (top - base).normalized()
    shaft, grip, strap, basket = Mesh(), Mesh(), Mesh(), Mesh()
    sweep(shaft, [base, base + u * 1.09], [0.0035, 0.0072], sides=10, smooth_path=False)
    sweep(grip, [base + u * 1.07, base + u * 1.088, base + u * 1.2, top + u * 0.0], [0.011, 0.0155, 0.0165, 0.012], sides=12, step=0.03)
    rbox(grip, frame(base + u * 1.07, u, (1, 0, 0)), (0.012, 0.012, 0.032), 0.004, seg=1)
    sweep(strap, [base + u * 1.15 + V((0, 0, 0.0)), base + u * 1.04 + V((-0.03, 0, 0.035)), base + u * 0.98 + V((-0.045, 0, 0.0)), base + u * 1.04 + V((-0.03, 0, -0.035)), base + u * 1.15], (0.0015, 0.011), up=V((0, 0, 1)), sides=4, step=0.03)
    revolve(basket, [(0.004, -0.012), (0.008, -0.004), (0.05, 0.0), (0.052, 0.003), (0.012, 0.006), (0.006, 0.02)], _axis_frame(base + u * 0.07, u), segs=24)
    emit(k, name, shaft, k.mat("pole_shaft", "#2b2e31", 0.35, metal=0.6))
    emit(k, name + "_grip", grip, k.mat("pole_grip", "#16181a", 0.8, bump=0.25, bump_scale=260))
    emit(k, name + "_strap", strap, k.mat("pole_strap", "#ff6a2a", 0.75))
    emit(k, name + "_basket", basket, k.mat("pole_basket", "#1c1e20", 0.5))


def _axis_frame(at, axis):
    """A placement whose local z is `axis`."""
    ax = V(axis).normalized()
    helper = V((1, 0, 0)) if abs(ax.x) < 0.9 else V((0, 1, 0))
    x = (helper - ax * helper.dot(ax)).normalized()
    return frame(at, x, ax.cross(x))


def build_rack(k, z0, z1, ski_z, pole_z):
    """Two oak bars on the wall with cleats between the skis and poles."""
    wood = k.wood("rack_oak", "#b98a5a", 0.5)
    black = Mesh()
    for y in (0.34, 1.2):
        bar = k.box(f"ski_rack_{y}", (0.05, 0.045, z1 - z0), (WALL - 0.025, y, (z0 + z1) / 2), wood, bevel=0.004)
        for cz in _cleats(ski_z, pole_z):
            k.box(f"ski_cleat_{y}_{cz:.2f}", (0.032, 0.045, 0.014), (WALL - 0.05 - 0.016, y, cz), wood, bevel=0.003)
        for z in (z0 + 0.04, z1 - 0.04):
            rbox(black, frame(V((WALL - 0.052, y, z)), (0, 0, 1), (0, 1, 0)), (0.004, 0.02, 0.02), 0.0015, seg=1)
    emit(k, "ski_rack_screws", black, k.mat("rack_screw", "#1b1b1b", 0.4, metal=0.6))


def _cleats(ski_z, pole_z):
    zs = sorted(ski_z + pole_z)
    gap = 0.058
    out = [zs[0] - gap]
    for a, b in zip(zs, zs[1:]):
        out.append((a + b) / 2)
    out.append(zs[-1] + gap)
    return out
