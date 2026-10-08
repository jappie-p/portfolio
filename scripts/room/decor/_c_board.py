"""The freeride windsurf board (bible 3.35): a lofted hull with tucked
rails, nose rocker and a touch of V, the camouflage deck, a printed EVA
pad, six padded footstraps, the centre strip, mast track and foot, the
fin and the nose bumper. Board axes: x from the tail to the nose, y out
of the deck, z across (left to right standing on it)."""

import math

from decor._c_geo import Mesh, V, cyl, emit, frame, loft, rbox, sweep, to_blender

FONT = "/System/Library/Fonts/Supplemental/Arial Black.ttf"

L = 2.45
# (s, value) keyframes along the board: half width, thickness, bottom rise
WIDTH = [(0.0, 0.195), (0.25, 0.268), (0.6, 0.318), (1.0, 0.34), (1.4, 0.326), (1.8, 0.272), (2.12, 0.19), (2.32, 0.11), (2.42, 0.05), (2.45, 0.004)]
THICK = [(0.0, 0.07), (0.4, 0.098), (1.0, 0.12), (1.6, 0.11), (2.1, 0.078), (2.45, 0.032)]
ROCKER = [(0.0, 0.004), (0.3, 0.0), (1.5, 0.0), (1.9, 0.018), (2.2, 0.058), (2.45, 0.128)]
STRAPS = [(0.32, 0.12), (0.58, 0.17), (0.86, 0.17)]
FIN_AT = 0.14


def _interp(keys, s):
    """Catmull-Rom through (s, value) keyframes."""
    xs = [k[0] for k in keys]
    i = max(0, min(len(keys) - 2, next((j for j in range(len(xs) - 1) if s <= xs[j + 1]), len(xs) - 2)))
    p1, p2 = keys[i][1], keys[i + 1][1]
    p0 = keys[i - 1][1] if i > 0 else 2 * p1 - p2
    p3 = keys[i + 2][1] if i + 2 < len(keys) else 2 * p2 - p1
    t = (s - xs[i]) / (xs[i + 1] - xs[i])
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)


def half_width(s):
    # round the tail's corners off over its first few centimetres
    return _interp(WIDTH, s) - 0.03 * max(0.0, 1 - s / 0.05) ** 2


def _sp(x, p):
    return math.copysign(abs(x) ** p, x)


def section(s, n=32, grow=0.0):
    """The hull's cross-section at s: rail-to-rail ring of points."""
    w, t, yb = half_width(s) + grow, _interp(THICK, s) + 2 * grow, _interp(ROCKER, s) - grow
    ym = yb + t * 0.36
    ring = []
    for j in range(n):
        a = -math.tau * j / n
        c, sn = math.cos(a), math.sin(a)
        z = w * _sp(c, 0.45)
        if sn >= 0:
            y = ym + t * 0.64 * abs(sn) ** 0.7
        else:
            y = ym - t * 0.36 * abs(sn) ** 0.28 - 0.005 * (1 - abs(z) / max(w, 1e-4)) * abs(sn)
        ring.append(V((s, y, z)))
    return ring


def deck_y(s, z):
    """The deck's height at (s, z)."""
    w, t, yb = half_width(s), _interp(THICK, s), _interp(ROCKER, s)
    c = _sp(max(-1.0, min(1.0, z / w)), 1 / 0.45)
    return yb + t * 0.36 + t * 0.64 * max(0.0, 1 - c * c) ** 0.35


def _stations(a, b, n):
    return [a + (b - a) * (0.5 - 0.5 * math.cos(math.pi * i / n)) for i in range(n + 1)]


def _uv(rings, ss):
    return lambda i, j: (ss[i] / L, 0.5 + rings[i][j % len(rings[i])].z / 0.72)


def build_board(k, name, place, deck_image):
    """The board, placed by the 4x4 site matrix `place` (origin at the
    tail on the bottom centreline)."""
    hull, black, grey = Mesh(), Mesh(), Mesh()
    ss = _stations(0.0, L - 0.075, 70)
    rings = [section(s) for s in ss]
    loft(hull, rings, uvs=_uv(rings, ss))
    ns = _stations(L - 0.075, L, 8)
    nose = [section(s, grow=0.0018) for s in ns]
    loft(black, nose, caps=(False, True))
    pad = _pad()
    _straps(black)
    _deck_parts(black, grey)
    _fin(black, grey)
    deck = k.image_mat("board_deck", deck_image, rough=0.32)
    deck.node_tree.nodes["Principled BSDF"].inputs["Coat Weight"].default_value = 0.5
    pad_m = _pad_material(k, deck_image)
    rubber = k.mat("board_black", "#1a1a1a", 0.8)
    trim = k.mat("board_grey", "#3a3a38", 0.5)
    green = k.mat("brand_green", "#1f4a32", 0.35, coat=0.6)
    emit(k, name, hull.moved(place), deck)
    emit(k, name + "_pad", pad.moved(place), pad_m)
    emit(k, name + "_black", black.moved(place), rubber)
    emit(k, name + "_grey", grey.moved(place), trim)
    # "JP." across the upper third, reading left to right from the room
    s = 1.6
    t = k.text(name + "_jp", "JP.", 0.25, (0, 0, 0), green, extrude=0.0009, font=FONT)
    t.data.resolution_u = 4
    t.matrix_world = to_blender(place @ frame(V((s, deck_y(s, 0) + 0.0012, 0.0)), (0, 0, 1), (0, 1, 0)))


def _pad():
    """The EVA pad: a 5 mm layer over the standing area, printed with the
    same deck, its edges bevelled down to the deck."""
    m = Mesh()
    ss = _stations(0.06, 1.0, 40)
    rings = []
    for s in ss:
        zw = half_width(s) - 0.045
        top = [V((s, deck_y(s, z) + 0.004, z)) for z in (zw * (1 - 2 * i / 16) for i in range(17))]
        top[0] = V((s, deck_y(s, zw + 0.006) + 0.0005, zw + 0.006))
        top[-1] = V((s, deck_y(s, -zw - 0.006) + 0.0005, -zw - 0.006))
        bottom = [V((p.x, deck_y(s, p.z) - 0.002, p.z)) for p in reversed(top)]
        rings.append(top + bottom)
    loft(m, rings, uvs=_uv(rings, ss))
    return m


def _pad_material(k, path):
    """The deck print, a shade darker and fully matte."""
    if "board_pad" in k.mats:
        return k.mats["board_pad"]
    m = k.image_mat("board_pad", path, rough=0.6)
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    tex = next(n for n in nt.nodes if n.type == "TEX_IMAGE")
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 1.0
    mix.inputs["B"].default_value = (0.88, 0.88, 0.86, 1)
    nt.links.new(tex.outputs["Color"], mix.inputs["A"])
    nt.links.new(mix.outputs["Result"], p.inputs["Base Color"])
    return m


def _straps(mesh):
    """Padded footstraps: each arches between two plugs fore and aft of
    the foot, fat in the middle like the design's black domes."""
    for s0, z0 in STRAPS:
        for z in (z0, -z0):
            pts, rad = [], []
            for i in range(9):
                f = i / 8
                s = s0 - 0.07 + 0.14 * f
                h = 0.028 * math.sin(math.pi * f) ** 0.5 - 0.003
                pts.append(V((s, deck_y(s, z) + h, z)))
                rad.append((0.009 + 0.011 * math.sin(math.pi * f) ** 0.6, 0.036 + 0.012 * math.sin(math.pi * f) ** 0.5))
            sweep(mesh, pts, rad, up=V((0, 0, 1)), sides=14, step=0.015)
            for s in (s0 - 0.07, s0 + 0.07):
                cyl(mesh, V((s, deck_y(s, z) - 0.002, z)), V((s, deck_y(s, z) + 0.006, z)), 0.016, sides=14)


def _deck_parts(black, grey):
    # centre strip, carry-handle recess, mast track and the mast foot
    for s0, s1, w, h in ((0.4, 1.02, 0.013, 0.004), (1.14, 1.46, 0.034, 0.012)):
        sm = (s0 + s1) / 2
        rbox(black, frame(V((sm, deck_y(sm, 0) + h / 2 - 0.003, 0)), (1, 0, 0), (0, 1, 0)), (s1 - s0, h, w), min(w, h) * 0.45, seg=1)
    rbox(grey, frame(V((1.08, deck_y(1.08, 0) - 0.001, 0)), (1, 0, 0), (0, 1, 0)), (0.12, 0.006, 0.045), 0.0025, seg=1)
    f = V((1.3, deck_y(1.3, 0) + 0.009, 0))
    rbox(grey, frame(f, (1, 0, 0), (0, 1, 0)), (0.075, 0.012, 0.06), 0.005, seg=1)
    cyl(black, f + V((0, 0.004, 0)), f + V((0, 0.06, 0)), 0.026, sides=18)
    cyl(grey, f + V((0, 0.06, 0)), f + V((0, 0.072, 0)), 0.02, sides=16)
    cyl(grey, f + V((0, 0.072, 0)), f + V((0, 0.11, 0)), 0.011, sides=12)


def _fin(black, grey):
    """A 28 cm swept fin under the tail, NACA-style section."""
    depth, sections = 0.28, 6
    rings = []
    for i in range(sections + 1):
        d = depth * i / sections
        chord = 0.125 - 0.075 * (i / sections) ** 1.2
        le = FIN_AT + 0.065 - 0.085 * (i / sections) ** 1.3
        y = _interp(ROCKER, FIN_AT) - d + 0.002
        ring = []
        for j in range(16):
            th = math.tau * j / 16
            xf = (1 - math.cos(th)) / 2
            yt = 5 * 0.1 * chord * (0.2969 * math.sqrt(xf) - 0.126 * xf - 0.3516 * xf**2 + 0.2843 * xf**3 - 0.1015 * xf**4)
            ring.append(V((le - xf * chord, y, math.copysign(yt, math.sin(th)) * (1 - 0.4 * i / sections))))
        rings.append(ring)
    loft(black, rings)
    rbox(grey, frame(V((FIN_AT, _interp(ROCKER, FIN_AT) - 0.003, 0)), (1, 0, 0), (0, 1, 0)), (0.15, 0.01, 0.032), 0.003, seg=1)


def fin_tip():
    """The fin's lowest point (board axes), for keeping it off the wall."""
    return V((FIN_AT + 0.065 - 0.085, _interp(ROCKER, FIN_AT) - 0.28, 0))
