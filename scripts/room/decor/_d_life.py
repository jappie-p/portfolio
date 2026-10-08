"""Furniture for the open floor (builder D): a tripod floor lamp, a knitted
pouf, a wicker basket with throws, a low oak bench with a cushion and
fabric storage boxes. Everything stays low except the lamp, which stands at
the left edge so the bike and gear walls stay in view from the front left.
Site coordinates, as in kit.py."""

import math

import bpy

from decor import _a_tex as tx
from decor._a_util import lathe, rbox, tube
from decor._b_books import stack
from decor._b_util import asset, black_steel, oak
from space import T


# -- floor lamp ------------------------------------------------------------


def floor_lamp(k, at=(0.3, 0.0, 3.0), height=1.6):
    """Three oak legs on a brass hub, a thin brass stem and a linen drum
    shade that glows warm, with its light inside."""
    x, _, z = at
    wood = k.mat("d_lamp_wood", "#5a4330", 0.5, noise=40.0, mottle=0.1)
    brass = k.mat("d_lamp_brass", "#b58d4c", 0.3, metal=1.0)
    hub_y = 0.98
    for i in range(3):
        a = math.radians(90 + i * 120)
        foot = (x + 0.27 * math.cos(a), 0.012, z + 0.27 * math.sin(a))
        top = (x + 0.02 * math.cos(a), hub_y, z + 0.02 * math.sin(a))
        tube(k, f"lamp_leg{i}", [foot, top], 0.0125, wood, res=2, ring=2, poly=True)
        k.cylinder(f"lamp_foot{i}", 0.014, 0.012, (foot[0], 0.0, foot[2]), brass, 0.002, verts=12)
    k.cylinder("lamp_hub", 0.032, 0.05, (x, hub_y - 0.02, z), brass, 0.006, verts=20)
    k.cylinder("lamp_stem", 0.0055, height - 0.35 - hub_y, (x, hub_y + 0.03, z), brass, 0.001, verts=12)
    y0, h, rb, rt = height - 0.28, 0.27, 0.16, 0.14
    shade = k.mat("d_lamp_shade", "#e9d9bb", 0.9, emission="#ffc880", strength=0.55)
    prof = [(rb, 0.0), (rt, h), (rt - 0.004, h), (rb - 0.004, 0.004)]
    lathe(k, "lamp_shade", prof, (x, y0, z), shade, segments=40)
    ring = k.mat("d_lamp_ring", "#9d7a45", 0.35, metal=1.0)
    for j, (r, yy) in enumerate(((rb, 0.0), (rt, h))):
        tube(k, f"lamp_shade_rim{j}", _circle((x, y0 + yy, z), r, 24), 0.0016, ring, res=1, ring=1, poly=True, closed=True)
    k.sphere("lamp_bulb", 0.03, (x, y0 + h * 0.5, z), tx.glow(k, "d_lamp_bulb", "#ffe2b0", 25.0), segments=14, rings=8)
    data = bpy.data.lights.new("lamp_floor_light", "POINT")
    data.energy = 30.0
    data.color = (1.0, 0.72, 0.4)
    data.shadow_soft_size = 0.1
    light = bpy.data.objects.new("lamp_floor_light", data)
    light.location = T(x, y0 + h * 0.5, z)
    k.link(light)


def _circle(c, r, n):
    cx, cy, cz = c
    return [(cx + r * math.cos(2 * math.pi * i / n), cy, cz + r * math.sin(2 * math.pi * i / n)) for i in range(n)]


# -- pouf, basket, boxes ----------------------------------------------------


def pouf(k, at, r=0.23, h=0.37, color="#a39785"):
    """A chunky knitted pouf: a pillowy drum with a seam at the top edge
    and a button in the middle."""
    x, _, z = at
    knit = tx.fabric(k, "d_pouf", color, scale=420.0, bump=0.7, sheen=0.4, mottle=0.12)
    prof = [(0, 0), (r * 0.86, 0), (r * 0.98, 0.02), (r * 1.03, h * 0.45), (r * 0.99, h - 0.035), (r * 0.88, h - 0.008), (r * 0.5, h), (r * 0.06, h - 0.015), (0, h - 0.02)]
    lathe(k, "pouf", prof, at, knit, segments=40)
    seam = k.mat("d_pouf_seam", "#7e7262", 0.9)
    tube(k, "pouf_seam", _circle((x, h - 0.03, z), r * 0.97, 36), 0.004, seam, res=1, ring=1, poly=True, closed=True)
    k.sphere("pouf_button", 0.011, (x, h - 0.012, z), seam, segments=12, rings=6, scale=(1, 1, 0.6))


def basket(k, at, h=0.36, throws=True):
    """A woven wicker basket (Poly Haven) with two rolled throws leaning
    out of it."""
    x, _, z = at
    asset(k, "wicker_basket_02", (x, 0.0, z), rot=20, height=h, ratio=0.5)
    if not throws:
        return
    for i, (dx, dz, col, tilt, yaw) in enumerate(((-0.05, 0.02, "#59634a", 16, 20), (0.06, -0.03, "#d9cfbd", -14, -30))):
        throw = tx.fabric(k, f"d_throw{i}", col, scale=380.0, bump=0.6, sheen=0.3, mottle=0.1)
        k.cylinder(f"basket_throw{i}", 0.05, 0.34, (x + dx, h - 0.2, z + dz), throw, 0.02, rot=(tilt, yaw, -tilt), verts=20)


def boxes(k, at, yaw=8):
    """Two lidded fabric storage boxes, one stacked on the other, and a
    kraft shoebox beside them."""
    x, _, z = at
    felt = k.mat("d_felt_box", "#8a847b", 1.0, bump=0.3, bump_scale=900)
    felt2 = k.mat("d_felt_box2", "#566052", 1.0, bump=0.3, bump_scale=900)
    kraft = k.mat("d_kraft", "#c3a274", 0.85, noise=60.0, mottle=0.1)
    tag = k.mat("d_box_tag", "#f1ede2", 0.7)
    rbox(k, "box_low", (0.46, 0.27, 0.34), (x, 0.135, z), felt, radius=0.03, segments=3, rot=(0, yaw, 0))
    rbox(k, "box_low_lid", (0.48, 0.03, 0.36), (x, 0.285, z), felt, radius=0.012, segments=2, rot=(0, yaw, 0))
    rbox(k, "box_top", (0.38, 0.22, 0.28), (x - 0.02, 0.3 + 0.11, z + 0.01), felt2, radius=0.03, segments=3, rot=(0, yaw - 12, 0))
    rbox(k, "box_top_lid", (0.4, 0.028, 0.3), (x - 0.02, 0.536, z + 0.01), felt2, radius=0.012, segments=2, rot=(0, yaw - 12, 0))
    a = math.radians(yaw)
    fx, fz = x + 0.17 * math.sin(a), z + 0.17 * math.cos(a)
    k.box("box_tag", (0.06, 0.04, 0.003), (fx + 0.11 * math.cos(a), 0.2, fz - 0.11 * math.sin(a)), tag, bevel=0.0, rot=(0, yaw, 0))
    rbox(k, "shoebox", (0.32, 0.12, 0.2), (x + 0.45, 0.06, z + 0.07), kraft, radius=0.004, segments=1, rot=(0, yaw + 20, 0))
    rbox(k, "shoebox_lid", (0.33, 0.035, 0.21), (x + 0.45, 0.1375, z + 0.07), kraft, radius=0.004, segments=1, rot=(0, yaw + 20, 0))


# -- bench -----------------------------------------------------------------


def bench(k, at, w=1.1, d=0.36, h=0.42):
    """A low oak bench on black steel hairpin-style legs, with a rolled
    olive cushion and a folded throw on it."""
    x, _, z = at
    steel = black_steel(k)
    k.box("bench_top", (w, 0.04, d), (x, h - 0.02, z), oak(k), bevel=0.006)
    for i, (sx, sz) in enumerate(((-1, -1), (1, -1), (-1, 1), (1, 1))):
        k.box(f"bench_leg{i}", (0.03, h - 0.04, 0.03), (x + sx * (w / 2 - 0.06), (h - 0.04) / 2, z + sz * (d / 2 - 0.05)), steel, bevel=0.003)
    for i, sz in enumerate((-1, 1)):
        k.box(f"bench_rail{i}", (w - 0.12, 0.025, 0.02), (x, 0.16, z + sz * (d / 2 - 0.05)), steel, bevel=0.002)
    k.box("bench_shelf", (w - 0.14, 0.015, d - 0.12), (x, 0.13, z), oak(k), bevel=0.003)
    olive = tx.fabric(k, "d_cushion_olive", "#5f6a4c", scale=380.0, bump=0.5, sheen=0.3, mottle=0.1)
    cream = tx.fabric(k, "d_throw_cream", "#ddd3c0", scale=380.0, bump=0.5, sheen=0.3, mottle=0.08)
    rbox(k, "bench_cushion", (0.4, 0.09, 0.3), (x - 0.3, h + 0.045, z), olive, radius=0.035, segments=4, rot=(0, 6, 0))
    rbox(k, "bench_throw", (0.34, 0.06, 0.26), (x + 0.24, h + 0.03, z), cream, radius=0.022, segments=3, rot=(0, -10, 0))
    rbox(k, "bench_throw2", (0.3, 0.05, 0.24), (x + 0.24, h + 0.085, z + 0.01), olive, radius=0.02, segments=3, rot=(0, 5, 0))


# -- side table ------------------------------------------------------------


def side_table(k, at, r=0.27, h=0.46):
    """A round oak side table on three black legs, a book, a mug and a
    small succulent on it."""
    x, _, z = at
    steel = black_steel(k)
    prof = [(0, h - 0.035), (r - 0.01, h - 0.035), (r, h - 0.028), (r, h - 0.008), (r - 0.006, h), (0, h)]
    lathe(k, "side_table_top", prof, (x, 0, z), oak(k), segments=40)
    for i in range(3):
        a = math.radians(i * 120 + 30)
        foot = (x + (r - 0.06) * math.cos(a), 0.0, z + (r - 0.06) * math.sin(a))
        top = (x + 0.05 * math.cos(a), h - 0.035, z + 0.05 * math.sin(a))
        tube(k, f"side_table_leg{i}", [foot, top], 0.009, steel, res=2, ring=1, poly=True)
    stack(k, "side_book", x - 0.06, h, z + 0.03, [(0.2, 0.03, 0.14, "#2f3f55"), (0.17, 0.022, 0.12, "#e9e4d8")], seed=17)
    ceramic = k.mat("d_side_mug", "#e8e1d4", 0.35)
    mug = [(0, 0), (0.033, 0), (0.036, 0.004), (0.036, 0.08), (0.034, 0.083), (0.032, 0.081), (0.031, 0.01), (0, 0.01)]
    lathe(k, "side_mug", mug, (x + 0.12, h, z - 0.07), ceramic, segments=28)
    asset(k, "potted_plant_04", (x + 0.1, h, z + 0.09), rot=60, height=0.14, ratio=0.3)
