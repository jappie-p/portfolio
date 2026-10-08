"""The room's shell (bible section 2): the charcoal slab with its S-step,
the oak plank floor, the two stepped plaster walls with their clerestory
windows and the trees beyond them, skirting and sockets. The rug lives in
decor/floor.py."""

from decor._a_floor import planks, slab
from decor._a_walls import build_walls


def build(k):
    with k.group("shell"):
        slab(k)
        planks(k)
        build_walls(k)
