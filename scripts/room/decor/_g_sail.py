"""Jasper's black North Sails sail, hung flat on the gear wall (x = 8.0):
the mast horizontal under two wall brackets, the tack at the back, the cloth
hanging down from the luff sleeve to its clew. Black monofilm and x-ply
panels, a clear window, six batten pockets, taped edges and the white
"NORTH SAILS" wordmark along the leech.

All in site metres. z runs along the wall (the luff), y is up, the cloth
hangs just off the wall and faces -x, into the room."""

import math

from mathutils import noise

from decor._g_common import FONT, Mesh, V, cyl, emit, frame, rbox, sweep

WALL = 7.995
MAST_X, MAST_Y = 7.925, 2.86
TACK_Z, HEAD_Z = 0.25, 3.75
TOP = MAST_Y - 0.03
CLEW_Z, CLEW_Y = 0.64, 1.46
ROACH = 0.17
BATTENS = (0.95, 1.45, 2.35, 2.85, 3.25, 3.55)
WINDOW = (1.55, 2.25, 0.07, 0.36)  # z0, z1, t0, t1 (t = share of the height from the luff)


def bottom(z):
    """The cloth's lower edge: the short foot, then the roached leech."""
    if z <= CLEW_Z:
        u = (z - TACK_Z) / (CLEW_Z - TACK_Z)
        return TOP - (TOP - CLEW_Y) * u - 0.045 * math.sin(math.pi * u)
    s = (z - CLEW_Z) / (HEAD_Z - CLEW_Z)
    return CLEW_Y + (TOP - CLEW_Y) * s - ROACH * math.sin(math.pi * s) ** 0.8


def _smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def cloth_x(z, y):
    """The cloth's depth: tucked up against the sleeve at the luff, hanging
    on the wall below it, with soft pleats and a loose mottle of wrinkles."""
    d = _smooth((TOP - y) / 0.3)
    base = MAST_X + 0.003 + (WALL - 0.012 - MAST_X) * d
    pleat = 0.003 * (0.5 + 0.5 * math.sin(z * 15.0 + 0.6 * math.sin(y * 4.0))) * _smooth((TOP - y) / 0.5)
    wr = 0.0025 * (0.5 + 0.5 * noise.noise(V((z * 4.0, y * 4.0, 0.4))))
    return base - pleat - abs(wr)


def _grid():
    zs = {TACK_Z + (HEAD_Z - TACK_Z) * i / 44 for i in range(45)}
    zs |= set(BATTENS) | {CLEW_Z, WINDOW[0], WINDOW[1], 1.1, 1.0}
    zs |= {b + d for b in BATTENS for d in (-0.02, 0.02)}
    return sorted(z for z in zs if TACK_Z <= z <= HEAD_Z)


_T0 = (0.0, 0.035, WINDOW[2], 0.15, 0.22, 0.3, WINDOW[3], 0.46, 0.56, 0.68, 0.8, 0.9, 1.0)
TS = tuple(sorted(set(_T0) | {(a + b) / 2 for a, b in zip(_T0, _T0[1:])}))


def _zone(z, t):
    """The material of the cloth cell centred on (z, t)."""
    zw0, zw1, t0, t1 = WINDOW
    if zw0 <= z <= zw1 and t0 <= t <= t1:
        return 4
    if t < 0.035:
        return 5
    if z < 1.12 and t > 0.58:
        return 3
    panel = sum(1 for b in BATTENS if z > b + 0.02)
    return (0, 1, 2, 1)[panel % 4]


def _cloth():
    """The cloth as one connected grid (shared corners, so it shades as one
    smooth sheet), each cell in its panel's material."""
    zs = _grid()
    n = len(TS)
    m = Mesh()
    pts = []
    for z in zs:
        b = bottom(z)
        pts += [V((cloth_x(z, y), y, z)) for y in (TOP - t * (TOP - b) for t in TS)]
    o = m.add(pts, [])
    for i in range(len(zs) - 1):
        zm = (zs[i] + zs[i + 1]) / 2
        for j in range(n - 1):
            a = o + i * n + j
            m.faces.append((a, a + n, a + n + 1, a + 1))
            m.mats.append(_zone(zm, (TS[j] + TS[j + 1]) / 2))
            m.uvs.append(None)
    return m


def _on(z, t, lift=0.0035):
    """A point on the cloth at (z, t), lifted off it."""
    y = TOP - t * (TOP - bottom(z))
    return V((cloth_x(z, y) - lift, y, z))


def _strip(mesh, pts, width, thick=0.0018):
    sweep(mesh, pts, (width / 2, thick), up=V((-1, 0, 0)), sides=4, step=0.03)


def _wordmark(k):
    """NORTH SAILS in white, set parallel to the leech a hand above it."""
    z0, z1 = 1.75, 3.05
    pts = [(z, bottom(z) + 0.3) for z in (z0, z1)]
    ang = math.degrees(math.atan2(pts[1][1] - pts[0][1], z1 - z0))
    zc, yc = (z0 + z1) / 2, (pts[0][1] + pts[1][1]) / 2
    x = WALL - 0.027
    white = k.mat("sail_white", "#f2f0ea", 0.55)
    t = k.text("sail_wordmark", "NORTH SAILS", 0.15, (x, yc, zc), white, rot=(0, -90, ang), extrude=0.0012, font=FONT)
    t.data.resolution_u = 4


def build_sail(k, name):
    tape, pocket, grey, black = Mesh(), Mesh(), Mesh(), Mesh()
    for z in BATTENS:
        _strip(pocket, [_on(z, 0.05 + 0.935 * j / 12) for j in range(13)], 0.046)
        end = _on(z, 0.995, 0.005)
        rbox(black, frame(end, (0, 1, 0), (1, 0, 0)), (0.05, 0.03, 0.016), 0.005, seg=1)
    zl = _grid()
    _strip(tape, [_on(z, 0.992, 0.002) for z in zl if z >= CLEW_Z], 0.03)
    _strip(tape, [_on(TACK_Z + (CLEW_Z - TACK_Z) * i / 8, 0.992, 0.002) for i in range(1, 9)], 0.03)
    z0, z1, t0, t1 = WINDOW
    loop = [_on(z0, t0), _on(z1, t0), _on(z1, t1), _on(z0, t1), _on(z0, t0)]
    for a, b in zip(loop, loop[1:]):
        _strip(grey, [a.lerp(b, f / 4) for f in range(5)], 0.016, 0.002)
    _hardware(k, grey, black)
    film = k.mat("sail_film", "#0b0b0d", 0.6)
    film2 = k.mat("sail_film_b", "#15161a", 0.58)
    film3 = k.mat("sail_film_c", "#0f1013", 0.62)
    xply = k.mat("sail_xply", "#26272a", 0.35, sheen=0.4, noise=90, mottle=0.35)
    window = k.mat("sail_window", "#aeb9bd", 0.08, transmission=0.96)
    sleeve = k.mat("sail_sleeve", "#313336", 0.7, noise=140, mottle=0.2)
    emit(k, name, _cloth(), [film, film2, film3, xply, window, sleeve], sharp=0, recalc=False)
    emit(k, name + "_pockets", pocket, k.mat("sail_pocket", "#1c1d20", 0.45))
    emit(k, name + "_tape", tape, k.mat("sail_tape", "#2d2f33", 0.5))
    emit(k, name + "_trim", grey, k.mat("sail_trim", "#4a4d51", 0.5))
    emit(k, name + "_black", black, k.mat("sail_black", "#141414", 0.4))
    _wordmark(k)


def _hardware(k, grey, black):
    """The mast in its sleeve, its foot and head, and two wall brackets."""
    sleeve, mast = Mesh(), Mesh()
    cyl(sleeve, V((MAST_X, MAST_Y, TACK_Z + 0.03)), V((MAST_X, MAST_Y, HEAD_Z - 0.03)), 0.034, sides=16)
    cyl(mast, V((MAST_X, MAST_Y, 0.07)), V((MAST_X, MAST_Y, HEAD_Z + 0.07)), 0.0245, sides=14)
    # the mast foot: grey base collar and a rubber end cap at the tack
    cyl(grey, V((MAST_X, MAST_Y, 0.06)), V((MAST_X, MAST_Y, TACK_Z + 0.06)), 0.0335, sides=16)
    cyl(black, V((MAST_X, MAST_Y, 0.04)), V((MAST_X, MAST_Y, 0.09)), 0.0345, sides=16)
    rbox(grey, frame(V((MAST_X, MAST_Y, 0.035)), (0, 0, 1), (0, 1, 0)), (0.01, 0.09, 0.075), 0.003, seg=1)
    rbox(black, frame(V((MAST_X, MAST_Y, HEAD_Z + 0.07)), (0, 0, 1), (0, 1, 0)), (0.05, 0.05, 0.05), 0.012, seg=1)
    for z in (1.4, 3.6):
        cyl(black, V((MAST_X, MAST_Y, z)), V((MAST_X, MAST_Y, z + 0.03)), 0.036, sides=16)
    # downhaul pulley and a short rope loop under the tack end
    rbox(black, frame(V((MAST_X + 0.0, MAST_Y - 0.075, 0.33)), (0, 0, 1), (0, 1, 0)), (0.025, 0.035, 0.05), 0.006, seg=1)
    # wall brackets: a rubber strap round the sleeve on a short steel arm
    for z in (1.3, 3.05):
        ring = [V((MAST_X + 0.041 * math.cos(a), MAST_Y + 0.041 * math.sin(a), z)) for a in [math.tau * i / 16 for i in range(17)]]
        sweep(black, ring, (0.0035, 0.014), up=V((0, 0, 1)), sides=6, step=0.02, smooth_path=False)
        rbox(grey, frame(V((MAST_X + 0.036, MAST_Y + 0.047, z)), (1, 0, 0), (0, 1, 0)), (0.075, 0.02, 0.022), 0.004, seg=1)
        rbox(grey, frame(V((WALL - 0.005, MAST_Y + 0.047, z)), (0, 0, 1), (0, 1, 0)), (0.01, 0.075, 0.05), 0.003, seg=1)
    emit(k, "sail_sleeve", sleeve, k.mat("sail_sleeve_tube", "#2c2e31", 0.75, noise=160, mottle=0.2))
    emit(k, "sail_mast", mast, k.mat("sail_mast", "#101012", 0.3))
