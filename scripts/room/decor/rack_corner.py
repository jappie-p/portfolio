"""The floor between the rack and the right wall (bible 3.30) and the
rack's power cord: two light grey crates with gloves on top, a plant in
a cream pot, a black duffel with leather straps and two olive bottles.

The duffel and the bottles sit further forward than the bible says, so
they stay clear of the mast and the board leaning on the right wall
(agreed with the lead)."""

import math

from decor._b_util import asset, cable, matte, recolor, retint


def crates(k):
    """Two stacked light grey crates (the top one turned a little) with
    gloves on top. (plastic_crate_02: the _01 crate carries a beer brand.)"""
    lower = asset(k, "plastic_crate_02", (5.14, 0, 0.5), rot=10, depth=0.4, ratio=0.5)
    retint(lower, "#d8d2c6")
    top = k.bounds(lower)[1][1]
    upper = asset(k, "plastic_crate_02", (5.14, top, 0.5), rot=4, depth=0.4, ratio=0.5)
    retint(upper, "#d8d2c6")
    asset(k, "garden_gloves_01", (5.12, k.bounds(upper)[1][1] - 0.01, 0.52), rot=-25, width=0.2, ratio=0.3)


def plant(k):
    """A leafy plant, 0.6 tall, in a cream ceramic pot."""
    root = asset(k, "potted_plant_02", (5.12, 0, 0.98), rot=15, height=0.6, ratio=0.12)
    recolor(root, "_pot", k.mat("b_pot_cream", "#ece4d2", 0.38, noise=30, mottle=0.05))


def duffel(k, at, turn):
    """A soft black duffel lying on the floor: a squashed rounded body,
    round ends, two brown straps around it, handles and a chrome zip."""
    x, z = at
    length, h, d = 0.6, 0.28, 0.3
    fabric = k.mat("b_duffel", "#1f1f1f", 0.9, bump=0.3, bump_scale=1300)
    leather = k.mat("b_strap_leather", "#6b4a2b", 0.6, noise=80, mottle=0.12)
    a = math.radians(turn)
    along = (math.cos(a), -math.sin(a))  # the bag's length in x, z

    def at_(s, y, side=0.0):
        return (x + along[0] * s - along[1] * side, y, z + along[1] * s + along[0] * side)

    k.box("duffel", (length, h, d), (x, h / 2, z), fabric, bevel=0.1, rot=(0, turn, 0))
    for i, s in enumerate((-1, 1)):
        k.cylinder(f"duffel_end{i}", 0.11, 0.008, at_(s * (length / 2 - 0.002), h / 2, 0), k.mat("b_duffel_end", "#171717", 0.85), 0.004, rot=(90, turn + 90 * s, 0), verts=24)
    for i, s in enumerate((-0.17, 0.17)):
        ring = []
        for j in range(13):
            t = math.pi * j / 12
            ring.append(at_(s, h / 2 + (h / 2 + 0.004) * math.sin(t) * 0.98, (d / 2 + 0.006) * math.cos(t)))
        cable(k, f"duffel_strap{i}", ring, 0.012, leather, res=3, sides=1)
        k.box(f"duffel_buckle{i}", (0.03, 0.026, 0.006), at_(s, h * 0.55, d / 2 + 0.012), k.mat("b_buckle", "#b9b4aa", 0.3, metal=1.0), bevel=0.002, rot=(0, turn, 0))
    cable(k, "duffel_zip", [at_(-0.22, h + 0.003, -0.02), at_(0, h + 0.006, -0.02), at_(0.22, h + 0.003, -0.02)], 0.003, k.mat("b_chrome", "#d0d0d0", 0.2, metal=1.0), res=4, sides=1)
    for i, side in enumerate((-0.05, 0.05)):
        cable(k, f"duffel_handle{i}", [at_(-0.12, h - 0.01, side), at_(-0.07, h + 0.07, side), at_(0.07, h + 0.07, side), at_(0.12, h - 0.01, side)], 0.008, leather, res=5, sides=1)


def bottles(k):
    """Two olive drink bottles with black caps."""
    olive = k.mat("b_bottle", "#4e5a33", 0.4, metal=0.3)
    cap = matte(k, "#141414", 0.5)
    for i, (x, z) in enumerate([(5.2, 1.68), (5.29, 1.75)]):
        k.cylinder(f"bottle{i}", 0.045, 0.17, (x, 0, z), olive, 0.006, verts=24)
        k.cylinder(f"bottle{i}_shoulder", 0.045, 0.02, (x, 0.17, z), olive, 0.002, verts=24, radius2=0.03)
        k.cylinder(f"bottle{i}_cap", 0.024, 0.025, (x, 0.19, z), cap, 0.003, verts=18)


def power_cord(k):
    """From the back of the rack along the floor and the right-wall
    skirting to the socket at (5.599, 0.32, 0.9)."""
    pts = [(4.86, 0.1, 0.11), (4.9, 0.012, 0.09), (5.2, 0.006, 0.07), (5.5, 0.006, 0.05), (5.575, 0.006, 0.2), (5.578, 0.006, 0.6), (5.58, 0.02, 0.86), (5.585, 0.2, 0.9), (5.59, 0.3, 0.9)]
    cable(k, "rack_power_cord", pts, 0.004, k.mat("b_cable", "#161616", 0.45), res=6, sides=1)
    k.box("rack_power_plug", (0.02, 0.045, 0.035), (5.588, 0.32, 0.9), matte(k, "#1a1a1a", 0.45), bevel=0.004)


def build(k):
    with k.group("rack_corner"):
        crates(k)
        plant(k)
        duffel(k, (5.0, 1.3), -35)
        bottles(k)
        power_cord(k)
