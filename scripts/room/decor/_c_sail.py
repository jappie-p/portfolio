"""The rigged sail (bible 3.36), leaning on the right wall: monofilm
panels with an orange-to-red luff panel, six orange batten pockets, taped
edges, x-ply at the clew, the black mast sleeve, the boom with its front
clamp and grips, the uphaul and the downhaul. The room is 2.9 m high, so
it is a short rig with a sail's proportions.

Sail axes: x up the mast from its foot, y toward the clew, z out of the
sail; `side` (+1 or -1) is the face that looks into the room."""

import math

from mathutils import noise

from decor._c_geo import Mesh, V, cyl, emit, frame, rbox, sweep

H = 2.72
TACK, CLEW, BOOM = 0.24, V((0.9, 0.84, 0)), 1.0
BATTENS = (0.17, 0.31, 0.45, 0.59, 0.73, 0.86)


def mast_y(x):
    """The mast's bend toward the leech."""
    return 0.09 * max(0.0, x / H) ** 2.3


def _luff(a):
    x = TACK + (H - 0.02 - TACK) * a
    return V((x, mast_y(x) + 0.03, 0))


def _head():
    return _luff(1.0)


def _leech(a):
    c, h = CLEW, _head()
    d = h - c
    out = V((-d.y, d.x, 0)).normalized()
    if out.y < 0:
        out = -out
    return c.lerp(h, a) + out * (0.085 * math.sin(math.pi * a) ** 0.9)


def _foot(b):
    t, c = _luff(0.0), CLEW
    d = c - t
    down = V((d.y, -d.x, 0)).normalized()
    if down.x > 0:
        down = -down
    return t.lerp(c, b) + down * (0.05 * math.sin(math.pi * b))


def patch(a, b, side, lift=0.0):
    """A point on the sail cloth: a Coons patch between luff, leech and
    foot, with a soft belly and loose wrinkles toward `side`."""
    p = (1 - b) * _luff(a) + b * _leech(a) + (1 - a) * _foot(b) + a * _head()
    p -= (1 - a) * (1 - b) * _luff(0.0) + (1 - a) * b * CLEW + a * _head()
    belly = 0.03 * math.sin(math.pi * b) * (1 - a) ** 0.6
    wrinkle = 0.007 * noise.noise(V((p.x * 9.0, p.y * 9.0, 0.3))) + 0.004 * noise.noise(V((p.x * 23.0, p.y * 23.0, 1.7)))
    return p + V((0, 0, side * (belly + wrinkle * math.sin(math.pi * b) + lift)))


def _zone(a, b):
    if a < 0.2 and b > 0.68:
        return 4
    if b < 0.13:
        return 1 if a < 0.38 else 2 if a < 0.7 else 3
    return 0


def _cloth(side, na=40, nb=16):
    m = Mesh()
    pts = [[patch(i / na, j / nb, side) for j in range(nb + 1)] for i in range(na + 1)]
    verts = [p for row in pts for p in row]
    for i in range(na):
        for j in range(nb):
            q = (i * (nb + 1) + j, (i + 1) * (nb + 1) + j, (i + 1) * (nb + 1) + j + 1, i * (nb + 1) + j + 1)
            m.faces.append(q if side > 0 else q[::-1])
            m.mats.append(_zone((i + 0.5) / na, (j + 0.5) / nb))
            m.uvs.append(None)
    m.verts = verts
    return m


def _strip(mesh, pts, side, width, lift=0.003):
    """A taped strip (batten pocket, edge tape) lying on the cloth."""
    n = V((0, 0, side))
    sweep(mesh, [p + n * lift for p in pts], (width / 2, 0.0016), up=n, sides=4, step=0.025)


def build_sail(k, name, place, side):
    cloth = _cloth(side)
    tape, black, grey, rope = Mesh(), Mesh(), Mesh(), Mesh()
    for a in BATTENS:
        _strip(tape, [patch(a, j / 20, side) for j in range(1, 20)], side, 0.03)
        end = patch(a, 0.985, side, 0.004)
        rbox(black, frame(end, (0, 1, 0), (1, 0, 0)), (0.035, 0.022, 0.012), 0.004, seg=1)
    _strip(tape, [patch(i / 30, 0.99, side) for i in range(31)], side, 0.022, 0.002)
    _strip(tape, [patch(0.008, j / 16, side) for j in range(17)], side, 0.022, 0.002)
    _strip(grey, [patch(0.06 + 0.12 * i / 8, 0.7 + 0.28 * i / 8, side) for i in range(9)], side, 0.012, 0.0025)
    _strip(grey, [patch(0.16 - 0.12 * i / 8, 0.72 + 0.26 * i / 8, side) for i in range(9)], side, 0.012, 0.0025)
    _mast(black, grey)
    _boom(black, grey, rope, side)
    film = k.mat("sail_film", "#d5d9dd", 0.12, transmission=0.5)
    orange = k.mat("sail_orange", "#ff6a2a", 0.45, emission="#ff5a1f", strength=0.6)
    mid = k.mat("sail_mid", "#ec4823", 0.45, emission="#e8401c", strength=0.5)
    red = k.mat("sail_red", "#d8281c", 0.45, emission="#d02418", strength=0.45)
    xply = k.mat("sail_xply", "#8c9298", 0.35, transmission=0.35)
    emit(k, name, cloth.moved(place), [film, orange, mid, red, xply], sharp=0, recalc=False)
    emit(k, name + "_tape", tape.moved(place), orange)
    emit(k, name + "_black", black.moved(place), k.mat("rig_black", "#1a1a1a", 0.35))
    emit(k, name + "_grey", grey.moved(place), k.mat("rig_grey", "#55595c", 0.5))
    emit(k, name + "_rope", rope.moved(place), k.mat("rig_rope", "#ff6a2a", 0.75))


def _mast(black, grey):
    """Mast in its black luff sleeve, the extension, base and downhaul."""
    pts = [V((x, mast_y(x), 0)) for x in (0.2, 0.7, 1.4, 2.1, H + 0.03)]
    sweep(black, pts, 0.024, sides=10, step=0.06)
    sleeve = [V((x, mast_y(x), 0)) for x in (TACK - 0.02, 0.8, 1.6, 2.3, H - 0.01)]
    sweep(black, sleeve, 0.034, sides=14, step=0.05)
    rbox(black, frame(V((H + 0.0, mast_y(H) + 0.01, 0)), (1, 0, 0), (0, 1, 0)), (0.06, 0.05, 0.05), 0.012, seg=1)
    cyl(grey, V((0.05, 0, 0)), V((0.21, 0, 0)), 0.03, sides=14)
    cyl(black, V((0.0, 0, 0)), V((0.06, 0, 0)), 0.032, sides=14)
    rbox(grey, frame(V((0.004, 0, 0)), (1, 0, 0), (0, 1, 0)), (0.008, 0.09, 0.07), 0.003, seg=1)
    # the downhaul pulley under the tack, its lines up to the sail
    blk = V((0.2, 0.06, 0))
    rbox(black, frame(blk, (1, 0, 0), (0, 1, 0)), (0.05, 0.03, 0.02), 0.006, seg=1)
    for dz in (-0.006, 0.006):
        sweep(grey, [blk + V((0.02, 0, dz)), V((TACK + 0.01, 0.05, dz))], 0.003, sides=5, smooth_path=False)


def _boom(black, grey, rope, side):
    """Boom arms either side of the sail from the front clamp to the tail
    end past the clew, grips on the front half, uphaul and outhaul."""
    front = V((BOOM, mast_y(BOOM), 0))
    tail = CLEW + V((-0.035, 0.08, 0))
    u = (tail - front).normalized()
    L = (tail - front).length
    rbox(black, frame(front + u * 0.02, u, (-u.y, u.x, 0)), (0.11, 0.07, 0.075), 0.018, seg=2)
    for s in (1, -1):
        spread = [0.035, 0.1, 0.112, 0.09, 0.045]
        pts = [front + u * (L * f) + V((0, 0, s * w)) for f, w in zip((0.05, 0.28, 0.55, 0.82, 0.98), spread)]
        sweep(black, pts, 0.016, sides=12, step=0.03)
        sweep(grey, pts[:3], 0.0185, sides=12, step=0.03)
    sweep(black, [front + u * (L * 0.97) + V((0, 0, 0.045)), tail + u * 0.03, front + u * (L * 0.97) + V((0, 0, -0.045))], 0.016, sides=12, step=0.015)
    sweep(rope, [CLEW, tail], 0.004, sides=6, smooth_path=False)
    cyl(grey, CLEW + V((0, 0, -0.01)), CLEW + V((0, 0, 0.01)), 0.015, sides=12)
    # the uphaul droops from the boom's front end down to the mast foot
    a, b = front + V((-0.03, 0.02, side * 0.03)), V((0.24, 0.05, side * 0.03))
    sag = [a.lerp(b, t) + V((0, 0.16 * math.sin(math.pi * t) ** 1.2, side * 0.05 * math.sin(math.pi * t))) for t in (0.0, 0.2, 0.4, 0.6, 0.8, 1.0)]
    sweep(rope, sag, 0.0045, sides=6, step=0.03)
