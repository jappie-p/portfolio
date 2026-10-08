"""The suit's cage: a coarse quad body that a Catmull-Clark subdivision
turns into one smooth hide. Torso rings run from inside the collar down to
the seat; the sleeves grow out of holes under the shoulders and the legs
split off the seat ring at the crotch, each ending in a cuff turned in on
itself. Every face is named for its panel, so the hide knows its leather
and where its seams run.

Suit axes: x to the suit's left, y up (site height), z to the front. The
cage is cut like race leathers: the sleeves bend forward at the elbow,
the knees are pre-bent, and the aero hump rises behind the collar."""

import math

from mathutils import Vector as V

Y0 = 2.1  # the top of the shoulders

_DEG = [0, 22, 48, 70, 90, 110, 134, 158, 180]
TH = [math.radians(a) for a in _DEG + [360 - a for a in reversed(_DEG[1:-1])]]
NT = len(TH)
HUMP_W = {6: 0.1, 7: 0.7, 8: 1.0, 9: 0.7, 10: 0.1}

# torso rows from the collar's inside down to the seat: name, dy, half-width,
# front, back; how far the hump pushes out behind and lifts the row; how
# far the row dips at the front centre; and column angles moved off TH
# (degrees), which curve the panel lines
ROWS = [
    ("deep", -0.02, 0.05, 0.046, 0.052, 0.0, 0.0, 0.0, {}),
    ("lip", 0.094, 0.066, 0.062, 0.07, 0.0, 0.0, 0.0, {}),
    ("outer", 0.074, 0.076, 0.07, 0.08, 0.05, 0.008, 0.0, {}),
    ("base", 0.04, 0.09, 0.08, 0.09, 0.1, 0.05, 0.0, {}),
    ("yoke", 0.02, 0.148, 0.095, 0.1, 0.122, 0.042, 0.0, {6: -6}),
    ("s2", -0.008, 0.19, 0.104, 0.106, 0.124, 0.014, 0.0, {2: -4, 6: -4}),
    ("s3", -0.075, 0.19, 0.115, 0.108, 0.106, 0.0, 0.0, {2: 0, 6: 0}),
    ("s4", -0.15, 0.167, 0.12, 0.106, 0.07, 0.0, 0.0, {2: 5, 6: 6}),
    ("c1", -0.24, 0.161, 0.118, 0.1, 0.025, 0.0, 0.035, {2: 2, 6: 12}),
    ("w1", -0.36, 0.144, 0.103, 0.093, 0.0, 0.0, 0.018, {}),
    ("w2", -0.44, 0.147, 0.1, 0.096, 0.0, 0.0, 0.018, {}),
    ("h1", -0.52, 0.161, 0.099, 0.108, 0.0, 0.0, 0.0, {}),
    ("h2", -0.58, 0.166, 0.097, 0.113, 0.0, 0.0, 0.0, {}),
]
ROW = {r[0]: i for i, r in enumerate(ROWS)}
CROTCH = (0.0, -0.64, -0.008)

# left sleeve rings out of the arm hole: x, dy, z, half-size out/in, front/back
ARM = [
    (0.214, -0.085, 0.0, 0.072, 0.066),
    (0.232, -0.17, 0.004, 0.066, 0.062),
    (0.24, -0.29, 0.014, 0.06, 0.058),
    (0.244, -0.39, 0.032, 0.058, 0.061),
    (0.246, -0.47, 0.064, 0.053, 0.054),
    (0.245, -0.55, 0.094, 0.047, 0.047),
    (0.243, -0.605, 0.11, 0.042, 0.043),
]
ELBOW = 3

# left leg rings below the seat: x, dy, z, half-width, half-depth
LEG = [
    (0.093, -0.69, 0.004, 0.09, 0.094),
    (0.096, -0.83, 0.026, 0.083, 0.086),
    (0.095, -0.93, 0.056, 0.075, 0.077),
    (0.094, -0.995, 0.078, 0.071, 0.073),
    (0.092, -1.06, 0.07, 0.066, 0.066),
    (0.09, -1.16, 0.04, 0.062, 0.066),
    (0.088, -1.28, 0.012, 0.052, 0.054),
    (0.087, -1.345, 0.002, 0.047, 0.049),
]
KNEE = 3


def _sp(x, p):
    return math.copysign(abs(x) ** p, x)


def torso_point(row, j):
    """Vertex j of a torso row: a rounded-box ring, the hump pushed out
    behind, the front centre dipped."""
    _n, dy, a, f, b, hump, rise, dip, shift = ROWS[row]
    p = 1.0 if row < ROW["base"] else 0.76
    m = min(j, NT - j)
    th = TH[j] + math.copysign(math.radians(shift.get(m, 0.0)), math.sin(TH[j]) or 1.0)
    s, c = math.sin(th), math.cos(th)
    x = a * _sp(s, p)
    z = (f if c > 0 else b) * _sp(c, p)
    if c < 0:
        z -= hump * HUMP_W.get(j, 0.0)
        dy += rise * HUMP_W.get(j, 0.0)
    return V((x, Y0 + dy - dip * max(0.0, c) ** 3, z))


def _axes(pts, i, first=None):
    """Down-the-limb tangent and the limb's outward and forward axes at ring i."""
    a = pts[i - 1] if i > 0 else (first if first is not None else pts[0])
    b = pts[min(i + 1, len(pts) - 1)]
    t = (b - a).normalized()
    f = V((0, 0, 1))
    f = (f - t * f.dot(t)).normalized()
    return t, f.cross(t), f


class Cage:
    """Vertices, quads and a panel name per face, plus the limbs' rings
    (centres and axes) for the details that follow them."""

    def __init__(self):
        self.verts, self.faces, self.panels = [], [], []
        self.arms, self.legs = {}, {}

    def v(self, p):
        self.verts.append(V(p))
        return len(self.verts) - 1

    def face(self, ids, panel):
        self.faces.append(tuple(ids))
        self.panels.append(panel)

    def band(self, r0, r1, panel):
        """Quads between two rings; panel(j) names column j (None leaves a hole)."""
        n = len(r0)
        for j in range(n):
            name = panel(j)
            if name:
                self.face((r0[j], r0[(j + 1) % n], r1[(j + 1) % n], r1[j]), name)


def _torso_panel(band, col):
    c = min(col, NT - 1 - col)
    name = ROWS[band][0]
    if name == "deep":
        return "lining"
    if name == "lip" or (name == "outer" and c < 6):
        return "collar"
    if name == "outer":
        return "hump"
    if name in ("base", "yoke"):
        return "hump" if c >= 6 else "yoke"
    if name in ("s2", "s3"):
        if c in (3, 4):
            return None
        return "chest" if c <= 2 else ("back" if c == 5 else "hump")
    if name == "s4":
        return "chest" if c <= 1 else ("side" if c <= 4 else ("back" if c == 5 else "hump"))
    if name == "c1":
        return "belly" if c <= 1 else ("side" if c <= 4 else "back")
    if name == "w1":
        return "stretch" if c <= 1 or c >= 6 else ("side" if c <= 4 else "back")
    return "belly" if c <= 2 else ("side" if c == 3 and name == "w2" else "seat")


def _arm_panel(band):
    if band <= 1:
        return "shoulder"
    if band == len(ARM) - 1:
        return "cuff"
    return "sleeve"


def _leg_panel(band, k):
    if band == len(LEG) - 1:
        return "cuff"
    front = k in (9, 0, 1, 2)
    if band == 0:
        return "belly" if front else "seat"
    if band < KNEE:
        return "thigh" if front or k == 3 else "leg"
    if band in (KNEE, KNEE + 1):
        return "stretch" if k in (5, 6, 7) else "leg"
    return "leg"


def _cuff(cage, ids, t, panel):
    """Turn a limb's end in on itself: a rolled lip, then a dark cap."""
    pts = [cage.verts[i] for i in ids]
    c = sum(pts, V()) / len(pts)
    lip = [cage.v(c + (p - c) * 0.8 - t * 0.008) for p in pts]
    cage.band(ids, lip, lambda j: panel)
    cage.face(list(reversed(lip)), "inside")


def _arm(cage, T, s):
    """A sleeve grown out of the 2 x 2 hole under the shoulder of side s,
    its rings matched to the hole's eight corners."""
    a, b, m = (4, 5, 3) if s > 0 else (12, 11, 13)
    s2, s3, s4 = ROW["s2"], ROW["s3"], ROW["s4"]
    hole = [T[s2][a], T[s2][b], T[s3][b], T[s4][b], T[s4][a], T[s4][m], T[s3][m], T[s2][m]]
    centre = sum((cage.verts[i] for i in hole), V()) / 8
    cs = [V((s * x, Y0 + dy, z)) for x, dy, z, _ra, _rb in ARM]
    prev, rings = hole, []
    for i, (_x, _dy, _z, ra, rb) in enumerate(ARM):
        t, o, f = _axes(cs, i, centre)
        o = o * s
        bulge = 0.008 if i == ELBOW else 0.0
        ids = []
        for k in range(8):
            ph = math.tau * k / 8
            r = rb + (bulge if math.sin(ph) > 0.5 else 0.0)
            ids.append(cage.v(cs[i] + o * (math.cos(ph) * ra) - f * (math.sin(ph) * r)))
        cage.band(prev, ids, lambda k, i=i: _arm_panel(i))
        prev = ids
        rings.append((cs[i], t, o, f, ra, rb))
    _cuff(cage, prev, rings[-1][1], "cuff")
    cage.arms[s] = rings


def _leg(cage, T, s):
    """A leg split off the seat ring at the crotch: half the seat ring plus
    the crotch point is its first ring, the rest turn toward even spacing."""
    h2 = ROW["h2"]
    if s > 0:
        root = [T[h2][j] for j in range(9)] + [cage.crotch]
    else:
        root = [T[h2][0]] + [T[h2][NT - j] for j in range(1, 9)] + [cage.crotch]
    top = V((s * LEG[0][0], 0, LEG[0][2]))
    phis = []
    for i in root:
        p = cage.verts[i]
        phis.append(math.atan2((p.x - top.x) * s, p.z - top.z))
    for i in range(1, len(phis)):
        while phis[i] < phis[i - 1]:
            phis[i] += math.tau
    cs = [V((s * x, Y0 + dy, z)) for x, dy, z, _rx, _rz in LEG]
    prev, rings = root, []
    for i, (_x, _dy, _z, rx, rz) in enumerate(LEG):
        t, o, f = _axes(cs, i, V((s * 0.09, Y0 - 0.6, 0.0)))
        o = o * s
        w = min(1.0, (i + 1) / 3)
        ids = []
        for k, ph0 in enumerate(phis):
            ph = ph0 + (phis[0] + math.tau * k / len(phis) - ph0) * w
            knee = 0.012 * max(0.0, math.cos(ph - 0.35)) ** 2 if i == KNEE else 0.0
            p = cs[i] + o * (math.sin(ph) * (rx + knee)) + f * (math.cos(ph) * (rz + knee))
            ids.append(cage.v(p - t * _leg_slide(i, ph)))
        cage.band(prev, ids, lambda k, i=i: _leg_panel(i, k))
        prev = ids
        rings.append((cs[i], t, o, f, rx, rz))
    _cuff(cage, prev, rings[-1][1], "cuff")
    cage.legs[s] = rings


def _leg_slide(i, ph):
    """How far ring i's vertex at angle ph moves up the leg, so the seams
    curve: the hip seam climbs over the outer hip, the seam above the knee
    dips toward the kneecap."""
    if i == 0:
        return 0.035 * math.sin(ph)
    if i == KNEE - 1:
        return -0.03 * max(0.0, math.cos(ph - 0.3)) ** 2
    return 0.0


def build_cage():
    """The whole suit as a quad cage, ready to subdivide."""
    cage = Cage()
    T = [[cage.v(torso_point(r, j)) for j in range(NT)] for r in range(len(ROWS))]
    cage.face(T[0], "lining")
    for r in range(len(ROWS) - 1):
        cage.band(T[r], T[r + 1], lambda j, r=r: _torso_panel(r, j))
    cage.crotch = cage.v(V((CROTCH[0], Y0 + CROTCH[1], CROTCH[2])))
    for s in (1, -1):
        _arm(cage, T, s)
        _leg(cage, T, s)
    return cage
