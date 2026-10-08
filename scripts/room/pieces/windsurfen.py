"""Story 03, windsurfen: the camouflage freeride board standing nose-up
against the right wall (bible 3.35), the rigged sail leaning beside it
(3.36) and the spare mast, boom and extension with the mast bag (3.34).

The board leans 9 degrees so its hull rests on the wall while the fin
under the tail just clears it; its nose tips 3.5 degrees toward the back
corner. The sail's mast leans 8 degrees the same way."""

import math

from mathutils import Matrix

from decor._c_board import L, build_board, deck_y, fin_tip, section
from decor._c_geo import Mesh, V, cyl, emit, frame, rbox, sweep
from decor._c_paint import deck_texture
from decor._c_sail import BOOM, H, build_sail

WALL = 5.595


def build(k):
    with k.piece("windsurfen"):
        board = _board_place()
        build_board(k, "board", board, deck_texture())
        build_sail(k, "sail", _sail_place(), -1)
        _bundle(k)
        k.pin("windsurfen", tuple(board @ V((1.5, deck_y(1.5, 0) + 0.02, 0))))
        k.view("windsurfen", (5.45, 1.35, 2.0), (-2.4, 0.55, 1.4), fov=34)


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
    return Matrix.Translation(V((WALL - dx, -dy, 1.45))) @ m


def _sail_place():
    up = _tilted(3.8, 8)
    clew = V((0, math.sin(math.radians(8)), math.cos(math.radians(8))))
    m = frame((0, 0, 0), up, clew)
    # the mast head, or the boom's wall-side arm, touches the wall
    reach = max((m @ V((H, 0, 0.034))).x, (m @ V((BOOM, 0, 0.13))).x)
    return Matrix.Translation(V((WALL - reach, 0.0, 2.26))) @ m


def _bundle(k):
    """Spare mast, a boom standing on its tail, the extension, the bag."""
    black, grey, orange, bag = Mesh(), Mesh(), Mesh(), Mesh()
    top = V((WALL - 0.026, 2.72, 0.8))
    base = top - V((2.72 * math.tan(math.radians(8)), 2.72, 0))
    u = (top - base).normalized()
    sweep(black, [base, top], 0.024, sides=14, smooth_path=False)
    cyl(grey, base - u * 0.004, base + u * 0.03, 0.026, sides=14)
    cyl(black, top - u * 0.01, top + u * 0.02, 0.019, sides=12)
    cyl(grey, base + u * 1.0, base + u * 1.12, 0.0255, sides=14)
    for f in (2.18, 2.27):
        cyl(orange, base + u * f, base + u * (f + 0.03), 0.0255, sides=14)
    # the boom, its plane square to the wall: tail on the floor, the
    # front end up against the wall
    centre_x, z = WALL - 0.215, 0.93
    outline = [(0.02, 0.0), (0.12, 0.13), (0.45, 0.19), (1.1, 0.2), (1.62, 0.15), (1.9, 0.07)]
    for s in (1, -1):
        pts = [V((centre_x + s * w, h, z)) for h, w in outline]
        sweep(black, pts, 0.016, sides=12, step=0.04)
        sweep(grey, pts[2:5], 0.0185, sides=12, step=0.04)
    sweep(black, [V((centre_x + 0.07, 1.9, z)), V((centre_x, 1.98, z)), V((centre_x - 0.07, 1.9, z))], 0.016, sides=12, step=0.02)
    sweep(black, [V((centre_x + 0.13, 0.12, z)), V((centre_x, 0.02, z)), V((centre_x - 0.13, 0.12, z))], 0.016, sides=12, step=0.02)
    rbox(black, frame(V((centre_x + 0.13, 1.98, z)), (1, 0, 0), (0, 1, 0)), (0.12, 0.07, 0.08), 0.015, seg=2)
    # extension with its pulley head, and the soft mast bag
    eb, et = V((5.49, 0.0, 0.68)), V((WALL - 0.032, 0.5, 0.68))
    cyl(black, eb, et, 0.03, sides=14)
    cyl(grey, et - (et - eb).normalized() * 0.07, et, 0.032, sides=14)
    rbox(black, frame(et + V((-0.01, 0.03, 0)), (0, 1, 0), (1, 0, 0)), (0.06, 0.04, 0.05), 0.01, seg=1)
    bb, bt = V((5.41, 0.0, 1.035)), V((WALL - 0.06, 1.18, 1.035))
    bu = (bt - bb).normalized()
    rad = [0.045, 0.06, 0.062, 0.058, 0.06, 0.05]
    pts = [bb + bu * (1.2 * f) + V((0.006 * math.sin(f * 9), 0, 0.004 * math.sin(f * 13))) for f in (0.0, 0.08, 0.4, 0.7, 0.92, 1.0)]
    sweep(bag, pts, rad, sides=16, step=0.04)
    sweep(grey, [bt - bu * 0.05 + V((-0.055, 0, 0)), bt + bu * 0.04, bt + bu * 0.02 + V((-0.03, -0.12, 0.02))], 0.004, sides=5, step=0.02)
    emit(k, "rig_bundle_black", black, k.mat("rig_black", "#1a1a1a", 0.35))
    emit(k, "rig_bundle_grey", grey, k.mat("rig_grey", "#55595c", 0.5))
    emit(k, "rig_bundle_tape", orange, k.mat("rig_tape", "#ff6a2a", 0.5))
    emit(k, "rig_mast_bag", bag, k.mat("rig_bag", "#1c1c1c", 0.9, bump=0.2, bump_scale=200))
