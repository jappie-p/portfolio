"""The left corner (bible 3.1 to 3.4): the big monstera in a concrete pot,
a pachira in a ribbed pot behind it, the dark wooden plinth at the front,
and the black cases at the desk's foot."""

from decor._a_cases import build_cases
from decor._a_util import lathe, ph, rbox


def concrete(k):
    return k.mat("a_concrete", "#8d867c", 0.85, noise=40.0, mottle=0.18, bump=0.12, bump_scale=240.0)


def soil(k):
    return k.mat("a_soil", "#3a2c22", 1.0, noise=120.0, mottle=0.3, bump=0.3, bump_scale=300.0)


def pot(k, name, at, r_bottom, r_top, h, ribs=0):
    """A turned pot with a lip, hollow to 3 cm under its rim, soil inside."""
    x, y, z = at
    lip = 0.008
    prof = [(0, 0), (r_bottom - 0.004, 0), (r_bottom, 0.005), (r_top, h - lip), (r_top + 0.003, h - 0.003), (r_top - 0.002, h), (r_top - 0.012, h - 0.004), (r_top - 0.016, h - 0.03), (0, h - 0.03)]
    obj = lathe(k, name, prof, at, concrete(k), segments=40, ribs=ribs, rib_depth=0.025 if ribs else 0.0)
    k.cylinder(f"{name}_soil", r_top - 0.015, 0.004, (x, y + h - 0.029, z), soil(k), bevel=0.0, verts=32)
    return obj


def build(k):
    with k.group("left_corner"):
        pot(k, "monstera_pot", (0.42, 0, 0.75), 0.16, 0.19, 0.38)
        ph(k, "potted_plant_01", (0.42, 0.33, 0.75), (0, 20, 0), height=1.02, drop=("_pot", "_pebbles"), ratio=0.12, stretch=1.35)
        pot(k, "pachira_pot", (0.18, 0, 1.25), 0.115, 0.14, 0.3, ribs=24)
        ph(k, "pachira_aquatica_01", (0.18, 0.26, 1.25), (0, -30, 0), height=0.84, pick="_c", ratio=0.45)
        rbox(k, "plinth", (0.38, 0.12, 0.22), (0.2, 0.06, 1.75), k.wood("a_plinth_wood", "#5a4d44", 0.7, scale=10, streak=0.3), radius=0.006, segments=2)
        build_cases(k)
