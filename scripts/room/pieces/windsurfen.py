"""Story 03, windsurfen: Jasper's black North Sails sail hung flat on the
gear wall, the camouflage freeride board leaning against the wall under its
wide end.

The board leans 9 degrees so its hull rests on the wall (on the sail's
cloth, where they overlap) while the fin under the tail just clears it; its
nose tips 3.5 degrees toward the back corner."""

import math

from mathutils import Matrix

from decor._c_board import L, build_board, deck_y, fin_tip, section
from decor._c_geo import V, frame
from decor._c_paint import deck_texture
from decor._g_sail import build_sail

CLOTH = 7.968
TAIL_Z = 1.0


def build(k):
    with k.piece("windsurfen"):
        board = _board_place()
        build_board(k, "board", board, deck_texture())
        build_sail(k, "sail")
        k.pin("windsurfen", (7.6, 1.35, 0.9))
        k.view("windsurfen", (7.9, 1.8, 2.0), (-4.2, 0.15, 0.5), fov=34)


def _tilted(lean, tilt):
    """Up the wall leaning `lean` degrees onto it, tipped `tilt` degrees
    toward the back corner."""
    a, b = math.radians(lean), math.radians(tilt)
    return V((math.sin(a), math.cos(a) * math.cos(b), -math.cos(a) * math.sin(b))).normalized()


def _board_place():
    along = _tilted(9, 3.5)
    out = V((-1, 0, 0))
    out = (out - along * out.dot(along)).normalized()
    m = frame((0, 0, 0), along, out)
    # rest the tail on the floor and the hull (or the fin) on the wall
    hull = [p for s in (0.0, 0.6, 1.2, 1.6, 1.9, 2.1, 2.3, L - 0.08) for p in section(s, 16)]
    dx = max((m @ p).x for p in hull + [fin_tip()])
    dy = min((m @ p).y for p in section(0.0, 16))
    return Matrix.Translation(V((CLOTH - dx, -dy, TAIL_Z))) @ m
