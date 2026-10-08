"""Story 'gamen': the console and controller on the drawer cabinet by the
shelving, and the headset on its stand at the desk's right end (the kit is
in decor/_d_gaming.py)."""

from decor import _d_gaming as g


def build(k):
    with k.piece("gamen"):
        g.console(k)
        g.controller(k)
        g.headset(k)
        k.pin("gamen", (3.98, 0.98, 0.5))
        k.view("gamen", (3.5, 0.85, 0.5), (-1.1, 0.75, 2.6), fov=30)
