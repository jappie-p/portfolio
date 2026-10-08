"""Story 01, werk: the workstation. The oak desk on its steel frame, three
monitors on one arm (code, HypHosting, Louisa), the architect lamp, the
keyboard, the mesh chair pushed back and the olive hoodie over its arm.
Lights L3 (lamp), L5 (under-desk strip) and L7 (the screens) live here.
The parts are built in decor/_a_*.py."""

from decor._a_chair import build_chair
from decor._a_desk import build_desk
from decor._a_jacket import build_jacket
from decor._a_keyboard import build_keyboard
from decor._a_lamp import build_lamp
from decor._a_monitor import build_monitors


def build(k):
    with k.piece("werk"):
        build_desk(k)
        build_monitors(k)
        build_lamp(k)
        build_keyboard(k)
        chair = build_chair(k)
        build_jacket(k, chair)
    k.pin("werk", (1.45, 1.05, 0.45))
    k.view("werk", (2.05, 0.95, 0.45), (-1.6, 1.0, 2.6), fov=30)
