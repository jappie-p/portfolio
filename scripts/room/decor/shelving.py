"""The open oak shelving unit between the desk and the rack, everything on
it, and the small black drawer cabinet at its foot (bible 3.23 to 3.25).

The cabinet stands in front of the unit's lower right bay (z 0.31 to
0.71) rather than inside it, and the candle sits at x 3.75, clear of the
middle upright (both agreed with the lead)."""

import math

import bpy

from decor._b_books import binder, row, stack
from decor._b_frames import standing_frame
from decor._b_util import LED, asset, cable, disc, glass, led_mat, matte, oak, oak_up, strip_light
from space import T

X0, X1 = 3.46, 4.14  # outer uprights (centres)
Z0, Z1 = 0.02, 0.30  # depth of the unit
SHELVES = [0.35, 0.8, 1.25, 1.7]
TOP = 2.0
T_SHELF, T_UP = 0.025, 0.03


def unit(k):
    """Two full uprights, a middle one in pieces between the shelves,
    four shelves, a top and a bottom board, LED strips under two shelves."""
    d, zc = Z1 - Z0, (Z0 + Z1) / 2
    inner = (X0 + T_UP / 2, X1 - T_UP / 2)
    w = inner[1] - inner[0]
    cx = (X0 + X1) / 2
    for i, x in enumerate((X0, X1)):
        k.box(f"unit_side{i}", (T_UP, TOP - 0.01, d), (x, (TOP - 0.01) / 2, zc), oak_up(k), bevel=0.004)
    k.box("unit_top", (X1 - X0 + T_UP + 0.01, T_SHELF, d + 0.01), (cx, TOP - 0.01 + T_SHELF / 2, zc + 0.005), oak(k), bevel=0.004)
    k.box("unit_bottom", (w, T_SHELF, d), (cx, 0.055, zc), oak(k), bevel=0.003)
    k.box("unit_kick", (w, 0.045, 0.015), (cx, 0.0225, Z1 - 0.02), oak(k), bevel=0.003)
    levels = [0.055] + SHELVES + [TOP - 0.01 - T_SHELF / 2]
    for i, y in enumerate(SHELVES):
        k.box(f"unit_shelf{i}", (w, T_SHELF, d), (cx, y, zc), oak(k), bevel=0.004)
    for i, (a, b) in enumerate(zip(levels, levels[1:])):
        lo, hi = a + T_SHELF / 2, b - T_SHELF / 2
        k.box(f"unit_mid{i}", (T_UP * 0.8, hi - lo, d), (cx, (lo + hi) / 2, zc), oak_up(k), bevel=0.003)
    alu = k.mat("b_alu", "#b9b6b0", 0.35, metal=1.0)
    for y in (1.7, 1.25):
        under = y - T_SHELF / 2
        k.box(f"unit_channel_{y}", (w - 0.03, 0.005, 0.012), (cx, under - 0.0025, Z1 - 0.02), alu, bevel=0.001)
        k.box(f"led_unit_strip_{y}", (w - 0.04, 0.002, 0.006), (cx, under - 0.006, Z1 - 0.02), led_mat(k, LED, 12.0), bevel=0.0)
        strip_light(k, f"unit_wash_{y}", cx, under - 0.01, Z1 - 0.03, w - 0.06, power=1.2)


def radio(k, at):
    """A small black retro radio: grille, lit dial, two knobs, handle and
    a folded aerial."""
    x, y, z = at
    w, h, d = 0.2, 0.115, 0.075
    body = matte(k, "#1d1c1b", 0.45)
    k.box("radio", (w, h, d), (x, y + h / 2, z), body, bevel=0.01)
    front = z + d / 2
    k.box("radio_grille", (0.1, 0.075, 0.002), (x - 0.04, y + h / 2, front), k.mat("b_grille", "#2c2b29", 0.95, bump=0.4, bump_scale=2200), bevel=0.001)
    k.box("radio_dial", (0.065, 0.034, 0.002), (x + 0.055, y + 0.075, front), k.mat("b_dial", "#e9dcc0", 0.5), bevel=0.0008)
    for i in range(9):
        k.box(f"radio_tick{i}", (0.0008, 0.008, 0.0006), (x + 0.028 + i * 0.0068, y + 0.08, front + 0.0012), matte(k, "#3a342c", 0.6), bevel=0.0)
    k.box("radio_needle", (0.0012, 0.026, 0.0008), (x + 0.06, y + 0.075, front + 0.0016), matte(k, "#b8321f", 0.5), bevel=0.0)
    for i, kx in enumerate((x + 0.04, x + 0.072)):
        disc(k, f"radio_knob{i}", 0.009, 0.012, (kx, y + 0.03, front), k.mat("b_knob", "#a9a59c", 0.3, metal=0.9), bevel=0.002, verts=16)
    cable(k, "radio_handle", [(x - 0.07, y + h - 0.004, z), (x - 0.06, y + h + 0.025, z), (x + 0.06, y + h + 0.025, z), (x + 0.07, y + h - 0.004, z)], 0.0045, body, res=6, sides=2)
    cable(k, "radio_aerial", [(x + 0.085, y + h + 0.002, z - 0.025), (x - 0.08, y + h + 0.012, z - 0.03)], 0.0018, k.mat("b_chrome", "#d0d0d0", 0.2, metal=1.0))


def candle(k, at):
    """A candle in a glass with a tiny lit flame and its light (L8)."""
    x, y, z = at
    k.cylinder("candle_glass", 0.035, 0.08, (x, y, z), glass(k, "b_candle_glass", "#fff3dc", 0.03, alpha=0.22), 0.002, verts=28)
    k.cylinder("candle_wax", 0.03, 0.05, (x, y + 0.004, z), k.mat("b_wax", "#efe3c8", 0.6, subsurface=0.3), 0.003, verts=24)
    k.cylinder("candle_wick", 0.0012, 0.01, (x, y + 0.054, z), matte(k, "#141210", 0.8), 0.0, verts=6)
    k.sphere("flame_candle", 0.006, (x, y + 0.07, z), k.mat("b_flame", "#ff9a3c", 0.5, emission="#ffb35c", strength=30), segments=10, rings=6, scale=(0.75, 0.75, 1.9))
    data = bpy.data.lights.new("candle_light", "POINT")
    data.energy = 1.2
    data.color = (1.0, 0.6, 0.24)
    data.shadow_soft_size = 0.01
    light = bpy.data.objects.new("candle_light", data)
    light.location = T(x, y + 0.075, z)
    k.link(light)


def puck(k, at, turn=-30):
    """A white round robot speaker: a ball on a disc with two dark eyes."""
    x, y, z = at
    white = k.mat("b_white_plastic", "#f2f0ec", 0.35)
    k.cylinder("puck_base", 0.045, 0.014, (x, y, z), white, 0.004, verts=28)
    k.sphere("puck_head", 0.05, (x, y + 0.062, z), white, segments=24, rings=12)
    a = math.radians(turn)
    for i, side in enumerate((-1, 1)):
        ex = x + 0.042 * math.sin(a) + side * 0.016 * math.cos(a)
        ez = z + 0.042 * math.cos(a) - side * 0.016 * math.sin(a)
        k.sphere(f"puck_eye{i}", 0.0065, (ex, y + 0.07, ez), matte(k, "#161616", 0.25), segments=10, rings=6)


def camera_bag(k, at):
    """A black camera bag with a front pocket, a zip and a carry strap."""
    x, y, z = at
    w, h, d = 0.2, 0.12, 0.14
    fabric = k.mat("b_bag_fabric", "#1c1c1c", 0.95, bump=0.25, bump_scale=1600)
    k.box("camera_bag", (w, h, d), (x, y + h / 2, z), fabric, bevel=0.018)
    k.box("camera_bag_pocket", (w * 0.8, h * 0.6, 0.03), (x, y + h * 0.4, z + d / 2 + 0.01), fabric, bevel=0.01)
    cable(k, "camera_bag_zip", [(x - w / 2 + 0.015, y + h + 0.0005, z - d / 2 + 0.03), (x + w / 2 - 0.015, y + h + 0.0005, z - d / 2 + 0.03)], 0.0015, matte(k, "#4a4a48", 0.5))
    cable(k, "camera_bag_strap", [(x - 0.06, y + h - 0.004, z), (x - 0.03, y + h + 0.035, z), (x + 0.03, y + h + 0.035, z), (x + 0.06, y + h - 0.004, z)], 0.006, fabric, res=6, sides=1)
    k.box("camera_bag_patch", (0.035, 0.014, 0.001), (x, y + h * 0.45, z + d / 2 + 0.0255), matte(k, "#1f4a32", 0.7), bevel=0.0)


def basket(k, at):
    """A grey fabric storage basket with a handle slot."""
    x, y, z = at
    k.box("basket", (0.26, 0.2, 0.24), (x, y + 0.1, z), k.mat("b_felt", "#8a847b", 1.0, bump=0.3, bump_scale=900), bevel=0.02)
    k.box("basket_slot", (0.08, 0.022, 0.004), (x, y + 0.165, z + 0.119), matte(k, "#3c3934", 0.95), bevel=0.008)


def contents(k):
    """Everything on the unit, top to bottom, left to right."""
    zc = (Z0 + Z1) / 2
    top = TOP - 0.01 + T_SHELF
    asset(k, "potted_plant_04", (3.56, top, zc), rot=20, height=0.25, ratio=0.3)
    camera_bag(k, (3.92, top, zc + 0.01))

    s = 1.7 + T_SHELF / 2
    books = [(0.03, 0.21, 0.16, "#e9e4d8"), (0.024, 0.23, 0.17, "#1f4a32"), (0.035, 0.2, 0.16, "#2b2b2b"), (0.022, 0.22, 0.15, "#b8894f"), (0.03, 0.19, 0.16, "#f0ede6"), (0.026, 0.215, 0.17, "#6b7a6b"), (0.028, 0.23, 0.16, "#2f3f55")]
    row(k, "book_a", X0 + T_UP / 2 + 0.008, s, Z1 - 0.012, books, lean_last=6.0, seed=4)
    asset(k, "potted_plant_02", (4.03, s, zc + 0.02), rot=-40, height=0.25, ratio=0.08)

    s = 1.25 + T_SHELF / 2
    radio(k, (3.59, s, zc + 0.03))
    candle(k, (3.75, s, zc + 0.05))
    on_books = stack(k, "book_flat", 3.98, s, zc + 0.02, [(0.22, 0.032, 0.16, "#2b2b2b"), (0.2, 0.026, 0.15, "#c9b48c"), (0.18, 0.022, 0.14, "#1f4a32")], seed=5)
    asset(k, "potted_plant_04", (4.03, on_books, zc + 0.03), rot=-50, height=0.13, ratio=0.22)

    s = 0.8 + T_SHELF / 2
    enc = [(0.04, 0.26, 0.19, c) for c in ("#2b2622", "#3a2a22", "#2b2622", "#262a2a", "#3a2a22")]
    row(k, "book_enc", X0 + T_UP / 2 + 0.01, s, Z1 - 0.01, enc, lean_last=0.0, bookend=False, seed=6)
    puck(k, (3.92, s, zc + 0.04))
    standing_frame(k, "unit_photo", (4.05, s, zc - 0.03), 0.1, 0.13, "peak_sunset", turn=-12, kind="black")

    s = 0.35 + T_SHELF / 2
    binder(k, "binder0", 3.63, s, zc, 0.29, 0.05, 0.25, "#222222", turn=3)
    binder(k, "binder1", 3.63, s + 0.05, zc, 0.29, 0.045, 0.25, "#6e6a62", turn=-4)
    basket(k, (3.97, s, zc))


def cabinet(k):
    """The small black two-drawer cabinet at the unit's foot, with an oak
    top (the console stands on it, see pieces/gamen.py)."""
    x, z = 4.1, 0.51
    w, h, d = 0.4, 0.75, 0.4
    body = matte(k, "#232323", 0.55)
    k.box("cabinet", (w, h - 0.03, d), (x, 0.03 + (h - 0.03) / 2, z), body, bevel=0.004)
    for i, fx in enumerate((-1, 1)):
        for j, fz in enumerate((-1, 1)):
            k.box(f"cabinet_foot{i}{j}", (0.03, 0.03, 0.03), (x + fx * 0.17, 0.015, z + fz * 0.17), matte(k, "#141414", 0.6), bevel=0.004)
    front = z + d / 2
    dh = (h - 0.03 - 0.012) / 2
    for i in range(2):
        cy = 0.03 + 0.004 + dh / 2 + i * (dh + 0.004)
        k.box(f"cabinet_drawer{i}", (w - 0.012, dh, 0.018), (x, cy, front + 0.008), body, bevel=0.003)
        k.box(f"cabinet_pull{i}", (0.12, 0.018, 0.006), (x, cy + dh / 2 - 0.04, front + 0.015), matte(k, "#0c0c0c", 0.8), bevel=0.003)
        k.box(f"cabinet_label{i}", (0.03, 0.02, 0.0008), (x + 0.12, cy + dh / 2 - 0.04, front + 0.0175), k.mat("b_label", "#f4f1ea", 0.7), bevel=0.0)
    k.box("cabinet_top", (w + 0.01, 0.02, d + 0.01), (x, h + 0.01, z), oak(k), bevel=0.003)


def build(k):
    with k.group("shelving"):
        unit(k)
        contents(k)
        cabinet(k)
