"""What lives on and under the desk (bible 3.9 to 3.15): the deskmat and
mouse, mug, notebooks, pen and phone, five small plants, the speaker,
clock and USB hub, and (in _a_pedestal) the pedestals and crates."""

import math

from decor import _a_tex as tx
from decor._a_pedestal import build_pedestals
from decor._a_util import lathe, ph, rbox, tube

TOP = 0.74


def _flat(k, name, r, length, center, yaw, material, y):
    """A horizontal cylinder (pen, sprig) lying at height y, turned yaw."""
    a = math.radians(yaw)
    axis = (-math.cos(a), 0.0, math.sin(a))
    cx, cz = center
    start = (cx - axis[0] * length / 2, y, cz - axis[2] * length / 2)
    return k.cylinder(name, r, length, start, material, bevel=0.0008, rot=(0, yaw, 90), verts=12)


def mat_and_mouse(k):
    border = k.mat("a_deskmat_edge", "#1e1d1b", 0.95)
    top = tx.fabric(k, "a_deskmat", "#2c2b29", scale=900.0, bump=0.12, sheen=0.1, mottle=0.06)
    rbox(k, "deskmat_edge", (0.9, 0.0026, 0.4), (2.05, TOP + 0.0013, 0.6), border, radius=0.001, segments=1)
    rbox(k, "deskmat", (0.892, 0.0006, 0.392), (2.05, TOP + 0.0029, 0.6), top, radius=0.0003, segments=1)
    shell = k.mat("a_mouse", "#141414", 0.3, coat=0.4)
    k.sphere("mouse", 1.0, (2.62, TOP + 0.004, 0.58), shell, segments=28, rings=16, scale=(0.0325, 0.06, 0.036)).rotation_euler.z = math.radians(-15)
    k.cylinder("mouse_wheel", 0.008, 0.006, (2.623 - 0.003, TOP + 0.036, 0.548), k.mat("a_mouse_wheel", "#3a3a3a", 0.6), bevel=0.001, rot=(0, -15, 90), verts=16)


def mug(k):
    ceramic = k.mat("a_mug", "#efe9df", 0.35)
    prof = [(0, 0), (0.037, 0), (0.042, 0.005), (0.042, 0.092), (0.04, 0.095), (0.038, 0.093), (0.037, 0.012), (0, 0.012)]
    lathe(k, "mug", prof, (1.78, TOP, 0.7), ceramic, segments=36)
    k.cylinder("coffee", 0.0372, 0.002, (1.78, 0.809, 0.7), k.mat("a_coffee", "#2a1a10", 0.15), bevel=0.0, verts=32)
    pts = [(1.82, TOP + 0.078, 0.7), (1.858, TOP + 0.074, 0.7), (1.864, TOP + 0.048, 0.7), (1.85, TOP + 0.024, 0.7), (1.82, TOP + 0.02, 0.7)]
    tube(k, "mug_handle", pts, 0.0055, ceramic, res=8, ring=2)


def notebooks(k):
    kraft = k.mat("a_kraft", "#c9a97a", 0.85, noise=60.0, mottle=0.1)
    cover = k.mat("a_notebook", "#2a2a2a", 0.7, bump=0.05, bump_scale=500.0)
    band = k.mat("a_band_green", "#1f4a32", 0.6)
    pages = k.mat("a_pages", "#efe9dc", 0.9)
    rbox(k, "notebook_kraft", (0.21, 0.01, 0.15), (1.32, TOP + 0.005, 0.715), kraft, radius=0.0015, segments=1, rot=(0, 18, 0))
    rbox(k, "notebook_pages", (0.205, 0.011, 0.144), (1.302, TOP + 0.0165, 0.7), pages, radius=0.001, segments=1, rot=(0, 12, 0))
    rbox(k, "notebook", (0.21, 0.004, 0.15), (1.3, TOP + 0.024, 0.7), cover, radius=0.0012, segments=1, rot=(0, 12, 0))
    rbox(k, "notebook_back", (0.21, 0.003, 0.15), (1.3, TOP + 0.0105, 0.7), cover, radius=0.001, segments=1, rot=(0, 12, 0))
    a = math.radians(12)
    bx, bz = 1.3 + 0.075 * math.cos(a), 0.7 - 0.075 * math.sin(a)
    rbox(k, "notebook_band", (0.007, 0.0185, 0.153), (bx, TOP + 0.0175, bz), band, radius=0.001, segments=1, rot=(0, 12, 0))
    _flat(k, "pen", 0.004, 0.14, (1.29, 0.69), 35, k.mat("a_pen", "#151515", 0.25), TOP + 0.03)


def phone(k):
    body = k.mat("a_phone", "#161616", 0.35)
    glass = k.mat("a_phone_screen", "#0b0d10", 0.06)
    rbox(k, "phone", (0.07, 0.008, 0.15), (1.62, TOP + 0.004, 0.78), body, radius=0.0035, segments=3, rot=(0, -8, 0))
    rbox(k, "phone_screen", (0.066, 0.0008, 0.146), (1.62, TOP + 0.0082, 0.78), glass, radius=0.003, segments=1, rot=(0, -8, 0))


def plants(k):
    terracotta = k.mat("a_terracotta", "#b86b4b", 0.85, noise=50.0, mottle=0.12)
    white = k.mat("a_pot_white", "#ece7dc", 0.5)
    soil = k.mat("a_soil", "#3a2c22", 1.0, noise=120.0, mottle=0.3, bump=0.3, bump_scale=300.0)
    ph(k, "potted_plant_04", (1.02, TOP, 0.18), (0, 30, 0), height=0.18)
    ph(k, "potted_plant_02", (1.2, TOP, 0.12), (0, -20, 0), height=0.25, drop=("_dirt",), ratio=0.6)
    k.cylinder("plant02_soil", 0.064, 0.003, (1.2, TOP + 0.093, 0.12), soil, bevel=0.0, verts=24)
    pot = [(0, 0), (0.042, 0), (0.046, 0.004), (0.056, 0.085), (0.058, 0.09), (0.05, 0.09), (0.048, 0.07), (0, 0.07)]
    lathe(k, "fern_pot", pot, (3.05, TOP, 0.14), white, segments=28)
    ph(k, "fern_02", (3.05, TOP + 0.068, 0.14), (0, 40, 0), width=0.3, pick="_b")
    small = [(0, 0), (0.03, 0), (0.033, 0.004), (0.04, 0.062), (0.043, 0.066), (0.036, 0.066), (0.035, 0.055), (0, 0.055)]
    lathe(k, "cactus_pot", small, (0.9, TOP, 0.6), terracotta, segments=24)
    cactus = k.mat("a_cactus", "#4e7d3a", 0.75, bump=0.35, bump_scale=900.0)
    body = [(0, 0.05), (0.022, 0.05), (0.026, 0.07), (0.027, 0.13), (0.024, 0.155), (0.014, 0.168), (0, 0.171)]
    lathe(k, "cactus", body, (0.9, TOP, 0.6), cactus, segments=24, ribs=10, rib_depth=0.1)
    arm = [(0, 0.0), (0.012, 0.0), (0.014, 0.03), (0.011, 0.045), (0, 0.048)]
    lathe(k, "cactus_arm", arm, (0.918, TOP + 0.1, 0.6), cactus, segments=16, ribs=8, rib_depth=0.1, rot=(0, 0, -25))
    ph(k, "ceramic_vase_02", (3.3, TOP, 0.25), (0, 0, 0), height=0.155, ratio=0.2)
    straw = k.mat("a_dry_grass", "#b89a62", 0.8)
    for i, (dx, dz, top) in enumerate(((-0.02, 0.0, 0.42), (0.015, -0.01, 0.39), (0.0, 0.02, 0.44))):
        pts = [(3.3 + dx * 0.3, TOP + 0.12, 0.25 + dz * 0.3), (3.3 + dx, TOP + 0.26, 0.25 + dz), (3.3 + dx * 2.6, TOP + top - 0.04, 0.25 + dz * 2.2)]
        tube(k, f"grass_{i}", pts, 0.0018, straw, res=6, ring=1)
        k.sphere(f"grass_head_{i}", 0.006, pts[-1], straw, segments=10, rings=6, scale=(1, 1, 3.2))


def gadgets(k):
    grille = tx.fabric(k, "a_speaker_grille", "#262626", scale=650.0, bump=0.35, sheen=0.1)
    rubber = k.mat("a_rubber", "#141414", 0.7)
    rbox(k, "speaker", (0.17, 0.07, 0.07), (3.15, TOP + 0.035, 0.55), grille, radius=0.028, segments=5, rot=(0, 10, 0))
    a = math.radians(10)
    for s in (-1, 1):
        c = 0.087 if s > 0 else -0.075
        k.cylinder(f"speaker_cap_{s}", 0.03, 0.012, (3.15 + c * math.cos(a), TOP + 0.035, 0.55 - c * math.sin(a)), rubber, bevel=0.004, rot=(0, 10, 90), verts=24)
    rbox(k, "speaker_buttons", (0.07, 0.004, 0.016), (3.15, TOP + 0.07, 0.55), rubber, radius=0.0015, segments=1, rot=(0, 10, 0))
    ph(k, "alarm_clock_01", (2.95, TOP, 0.2), (0, -15, 0), height=0.09, ratio=0.3)
    hub = k.mat("a_hub", "#1a1a1a", 0.4)
    rbox(k, "usb_hub", (0.1, 0.012, 0.04), (2.4, TOP + 0.006, 0.18), hub, radius=0.003, segments=2)
    rbox(k, "usb_hub_led", (0.004, 0.001, 0.003), (2.36, TOP + 0.0125, 0.198), tx.glow(k, "a_led_white", "#dff3ff", 6.0), radius=0.0, segments=1)
    black = k.mat("a_cable_black", "#161616", 0.45)
    white = k.mat("a_cable_white", "#e8e4dc", 0.4)
    tube(k, "hub_cable_0", [(2.35, TOP + 0.006, 0.18), (2.29, TOP + 0.004, 0.2), (2.22, TOP + 0.003, 0.205), (2.2, 0.7, 0.2)], 0.0025, black, res=6)
    tube(k, "hub_cable_1", [(2.45, TOP + 0.006, 0.19), (2.52, TOP + 0.004, 0.26), (2.6, TOP + 0.003, 0.35), (2.66, TOP + 0.004, 0.45)], 0.002, white, res=6)


def build(k):
    with k.group("desk_clutter"):
        mat_and_mouse(k)
        mug(k)
        notebooks(k)
        phone(k)
        plants(k)
        gadgets(k)
        build_pedestals(k)
