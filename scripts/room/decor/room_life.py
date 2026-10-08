"""The open floor, lived in (builder D): a reading nook at the left edge
(small rug, floor lamp, pouf, basket, books and plants), storage boxes and
a second rug in the middle, and a low bench with a basket of plants toward
the gear wall. Low everywhere except the lamp: the bike and gear walls stay
visible from the front left."""

from decor import _d_life as life
from decor.floor import rug, rug_material
from decor._b_books import stack
from decor._b_util import asset


def nook(k):
    sage = rug_material(k, "d_rug_nook", "#37483a", "#6c8068")
    rug(k, "rug_nook", c=(1.05, 3.2), w=1.5, d=1.0, yaw=6, material=sage)
    life.floor_lamp(k, (0.32, 0.0, 2.9))
    life.pouf(k, (1.0, 0.0, 3.3))
    life.basket(k, (1.62, 0.0, 3.5))
    asset(k, "potted_plant_01", (0.45, 0.0, 3.8), rot=25, height=0.55, ratio=0.1)
    top = stack(k, "nook_book", 1.52, 0.012, 2.95, [(0.24, 0.035, 0.17, "#1f4a32"), (0.21, 0.028, 0.15, "#e9e4d8"), (0.19, 0.024, 0.14, "#2b2b2b")], seed=33)
    asset(k, "potted_plant_04", (1.52, top, 2.95), rot=10, height=0.13, ratio=0.3)


def middle(k):
    slate = rug_material(k, "d_rug_mid", "#38423f", "#6a7a74")
    rug(k, "rug_mid", c=(5.25, 2.85), w=1.5, d=1.0, yaw=-6, material=slate)
    life.boxes(k, (3.95, 0.0, 3.45))
    life.bench(k, (6.1, 0.0, 4.05))
    asset(k, "potted_plant_04", (6.85, 0.0, 3.95), rot=40, height=0.34, ratio=0.3)
    life.side_table(k, (4.15, 0.0, 2.35))
    asset(k, "potted_plant_01", (3.3, 0.0, 3.6), rot=-30, height=0.7, ratio=0.1)
    life.basket(k, (6.5, 0.0, 2.4), throws=False)
    asset(k, "potted_plant_02", (6.5, 0.2, 2.4), rot=15, height=0.32, ratio=0.1, drop="_pot")


def build(k):
    with k.group("room_life"):
        nook(k)
        middle(k)
