"""The back wall around the groei board (bible 3.17 to 3.22): the frames
left and right of it, the small shelf by the step in the wall, the long
top shelf, the trailing pothos P1 and P2 and the hanging plant above the
rack. Positions follow the clash fixes agreed with the lead: everything
stays clear of window W1 (x 1.15 to 2.55, y from 2.15)."""

import math

from decor._b_frames import frame
from decor._b_pothos import pothos
from decor._b_util import asset, black_steel, cable, disc, shelf, strip_light
from decor._d_wall import desk_books, rack_shelf

SMALL = (0.87, 2.2, 0.5, 0.18)  # small shelf: centre x, height, width, depth
TOP = (3.17, 2.4, 1.1, 0.2)  # top shelf


def frames(k):
    """Two frames left of the board, four right of it, all landscapes."""
    frame(k, "frame_peak", (0.72, 1.82, 0.0), 0.3, 0.4, "peak_sunset", "black", mount=0.032)
    frame(k, "frame_coast_small", (0.55, 1.45, 0.0), 0.2, 0.26, "coast_small", "black", mount=0.022)
    frame(k, "frame_meadow", (2.6, 1.93, 0.0), 0.42, 0.3, "meadow_tree", "oak", mount=0.03)
    frame(k, "frame_lake", (3.07, 1.93, 0.0), 0.42, 0.3, "lake_forest", "black", mount=0.03)
    frame(k, "frame_coast", (2.58, 1.5, 0.0), 0.34, 0.26, "coast_path", "oak", mount=0.026)
    frame(k, "frame_trail", (3.02, 1.48, 0.0), 0.2, 0.28, "bike_trail", "black", mount=0.02)


def _edge_drops(x0, x1, y, z, n, seed, side=None):
    """Points along a shelf's front edge (and one over its end) where
    the vines go over."""
    pts = [(x0 + (x1 - x0) * (i + 0.5) / n + 0.01 * math.sin(seed + i * 2.1), y + 0.004, z + 0.006) for i in range(n)]
    if side is not None:
        pts.append((side, y + 0.004, z - 0.06))
    return pts


def small_shelf(k):
    """By the step in the wall: a leafy plant and P1, trailing down the
    board's left side."""
    x, y, w, d = SMALL
    shelf(k, "shelf_small", x, y, w, d)
    strip_light(k, "shelf_small_wash", x, y - 0.03, d - 0.03, w - 0.06, power=1.2)
    top = y + 0.015
    asset(k, "potted_plant_02", (x - 0.13, top, 0.09), rot=-25, height=0.3, ratio=0.08)
    drops = _edge_drops(0.93, 1.1, top, d, 5, 1.0, side=x + w / 2 + 0.006)
    pothos(k, "pothos_p1", (1.0, top, 0.09), drops, [0.85, 0.6, 0.72, 0.5, 0.9, 0.64], seed=11, crown=9)


def top_shelf(k):
    """The long shelf right of the window: P2, a small leafy plant, a
    camera, a bookshelf speaker and a succulent."""
    x, y, w, d = TOP
    shelf(k, "shelf_top", x, y, w, d)
    strip_light(k, "shelf_top_wash", x, y - 0.03, d - 0.03, w - 0.06, power=2.0)
    top = y + 0.015
    drops = _edge_drops(2.66, 2.86, top, d, 5, 3.0, side=x - w / 2 - 0.006)
    pothos(k, "pothos_p2", (2.74, top, 0.1), drops, [0.62, 0.8, 0.5, 0.7, 0.55, 0.4], seed=23, crown=10)
    asset(k, "potted_plant_01", (2.97, top, 0.1), rot=40, height=0.3, ratio=0.035)
    asset(k, "Camera_01", (3.23, top, 0.11), rot=-20, width=0.15, ratio=0.15)
    speaker(k, "shelf_speaker", (3.46, top, 0.1))
    asset(k, "potted_plant_04", (3.64, top, 0.1), rot=70, height=0.2, ratio=0.3)


def speaker(k, name, at):
    """A black bookshelf speaker: cabinet, woofer, tweeter and a port."""
    x, y, z = at
    w, h, d = 0.14, 0.2, 0.16
    body = k.mat("b_speaker", "#1d1c1b", 0.5, noise=60, mottle=0.05)
    k.box(name, (w, h, d), (x, y + h / 2, z), body, bevel=0.006)
    front = z + d / 2
    cone = k.mat("b_cone", "#2a2a2a", 0.65)
    disc(k, f"{name}_woofer_ring", 0.048, 0.003, (x, y + 0.075, front), k.mat("b_trim", "#3a3a3a", 0.35, metal=0.5))
    k.cylinder(f"{name}_woofer", 0.042, 0.012, (x, y + 0.075, front - 0.009), cone, 0.0, rot=(90, 0, 0), verts=24, radius2=0.012)
    disc(k, f"{name}_cap", 0.013, 0.006, (x, y + 0.075, front - 0.002), cone, bevel=0.003, verts=16)
    disc(k, f"{name}_tweeter", 0.016, 0.003, (x, y + 0.155, front), k.mat("b_trim", "#3a3a3a", 0.35, metal=0.5))
    disc(k, f"{name}_dome", 0.01, 0.004, (x, y + 0.155, front + 0.001), k.mat("b_dome", "#151515", 0.3), bevel=0.003, verts=16)
    disc(k, f"{name}_port", 0.012, 0.002, (x, y + 0.022, front), k.mat("b_port", "#080808", 0.9), bevel=0.0, verts=16)


def hanging_plant(k, x=3.9, y=2.44, tag="", seed=37):
    """Above the shelving unit, left of the bike's rear tyre: a white pot
    on three cords from a black hook, a leafy plant in it and five short
    trailing vines that stop above the things on the unit's top."""
    z = 0.11
    hook_y = y + 0.32
    hook = black_steel(k)
    k.box(f"hanger_plate{tag}", (0.03, 0.05, 0.006), (x, hook_y + 0.025, 0.003), hook, bevel=0.002)
    cable(k, f"hanger_hook{tag}", [(x, hook_y + 0.015, 0.006), (x, hook_y + 0.01, 0.06), (x, hook_y, z), (x, hook_y + 0.02, z + 0.012)], 0.004, hook, res=6, sides=2)
    r, h = 0.08, 0.12
    for i, a in enumerate((90, 210, 330)):
        rim = (x + r * math.cos(math.radians(a)), y + h, z + r * math.sin(math.radians(a)))
        cable(k, f"hanger_cord{tag}{i}", [(x, hook_y, z), rim], 0.0018, k.mat("b_cord", "#2a2622", 0.8))
    drops = [(x + r * 1.15 * math.cos(math.radians(a)), y + h - 0.01, z + r * 1.15 * math.sin(math.radians(a))) for a in (200, 160, 120, 70, 30)]
    pothos(k, f"hanging_vines{tag}", (x, y, z), drops, [0.28, 0.33, 0.24, 0.3, 0.2], seed=seed, r=r, h=h, pot_color="#ece7dc", crown=4, hanging=True)
    asset(k, "potted_plant_02", (x, y + h - 0.03, z), rot=110, height=0.34, ratio=0.09, drop="_pot")

def build(k):
    with k.group("back_wall"):
        frames(k)
        small_shelf(k)
        top_shelf(k)
        hanging_plant(k)
        hanging_plant(k, x=0.2, y=1.8, tag="_left", seed=71)
        rack_shelf(k)
        desk_books(k, 0.74)
