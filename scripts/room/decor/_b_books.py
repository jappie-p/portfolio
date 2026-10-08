"""Books for the shelves: a cover with the page block showing on top (or
at the front when lying flat), thin bands and title blocks on the spine,
rows that end leaning on a bookend, and flat stacks."""

import math
import random

from decor._b_util import black_steel

PAGES = "#efe8d6"
GOLD = "#c9a45c"


def _cover(k, color):
    return k.mat(f"b_book_{color.lstrip('#')}", color, 0.6, noise=70, mottle=0.06)


def book(k, name, x_left, y, z_spine, t, h, d, color, lean=0.0, rng=None):
    """A book standing on its tail at height `y`, its left side at
    `x_left`, its spine at `z_spine` facing you; leaning right by `lean`
    degrees on its bottom-right edge."""
    rng = rng or random.Random(name)
    a = math.radians(lean)
    # the book's centre and its spine details, turned about the pivot
    px, py = x_left + t, y

    def turned(dx, dy):
        return (px + (dx - t) * math.cos(a) + dy * math.sin(a), py - (dx - t) * math.sin(a) + dy * math.cos(a))

    rot = (0, 0, -lean)
    cx, cy = turned(t / 2, h / 2)
    zc = z_spine - d / 2
    k.box(name, (t, h, d), (cx, cy, zc), _cover(k, color), bevel=0.0015, rot=rot)
    tx, ty = turned(t / 2, h - 0.002)
    k.box(f"{name}_pages", (t - 0.004, 0.0046, d - 0.008), (tx, ty, zc - 0.002), k.mat("b_pages", PAGES, 0.85), bevel=0.0, rot=rot)
    band = k.mat("b_book_gold", GOLD, 0.4, metal=0.6) if rng.random() < 0.5 else k.mat("b_book_band", "#e8e0cc", 0.6)
    style = rng.random()
    if style < 0.45:
        for f in (0.14, 0.86):
            bx, by = turned(t / 2, h * f)
            k.box(f"{name}_band{f}", (t * 0.92, 0.004, 0.001), (bx, by, z_spine + 0.0003), band, bevel=0.0, rot=rot)
    elif style < 0.8:
        bx, by = turned(t / 2, h * 0.62)
        k.box(f"{name}_title", (t * 0.6, h * 0.32, 0.001), (bx, by, z_spine + 0.0003), band, bevel=0.0, rot=rot)


def row(k, prefix, x0, y, z_spine, specs, lean_last=6.0, bookend=True, seed=1):
    """Books standing left to right from `x0`; the last one leans right on
    a black bookend. `specs` = [(thickness, height, depth, colour), ...].
    Returns the x where the row ends."""
    rng = random.Random(seed)
    x = x0
    for i, (t, h, d, color) in enumerate(specs):
        last = i == len(specs) - 1
        book(k, f"{prefix}{i}", x, y, z_spine - rng.uniform(0, 0.008), t, h, d, color, lean_last if last else 0.0, rng)
        x += t + 0.0015
    if bookend:
        t, h, d, _ = specs[-1]
        lean = math.radians(lean_last)
        end_h = 0.14
        bx = x - 0.0015 + end_h * math.tan(lean) + 0.002
        m = black_steel(k)
        k.box(f"{prefix}_bookend", (0.003, end_h, 0.12), (bx + 0.0015, y + end_h / 2, z_spine - d / 2), m, bevel=0.001)
        k.box(f"{prefix}_bookend_foot", (0.09, 0.002, 0.12), (bx - 0.045, y + 0.001, z_spine - d / 2), m, bevel=0.0005)
        x = bx + 0.003
    return x


def stack(k, prefix, x, y, z, specs, seed=2):
    """Books lying flat, biggest at the bottom, each turned a little.
    `specs` = [(width, thickness, depth, colour), ...]."""
    rng = random.Random(seed)
    for i, (w, t, d, color) in enumerate(specs):
        turn = rng.uniform(-6, 6)
        k.box(f"{prefix}{i}", (w, t, d), (x, y + t / 2, z), _cover(k, color), bevel=0.0015, rot=(0, turn, 0))
        k.box(f"{prefix}{i}_pages", (w - 0.008, t - 0.003, d - 0.002), (x - 0.0035, y + t / 2, z + 0.0012), k.mat("b_pages", PAGES, 0.85), bevel=0.0, rot=(0, turn, 0))
        y += t
    return y


def binder(k, name, x, y, z, w, t, d, color, turn=0.0):
    """A ring binder lying flat: two boards, a rounded spine and a label."""
    m = _cover(k, color)
    k.box(name, (w, t, d), (x, y + t / 2, z), m, bevel=0.004, rot=(0, turn, 0))
    k.box(f"{name}_label", (0.07, 0.0006, 0.04), (x + 0.04, y + t + 0.0003, z), k.mat("b_label", "#f4f1ea", 0.7), bevel=0.0, rot=(0, turn, 0))
