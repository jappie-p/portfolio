"""Wheels for the bike kit: rim, laced spokes, hub, a knobbed or slick tyre,
brake disc and valve. Built in the bike's own axes (x forward, y up, z
toward the drive side) around a wheel centre, into a `Parts` by material:
rim, spoke, hub, tyre, sidewall, knob, rotor, steel."""

import math

from mathutils import Matrix

from decor._c_geo import TAU, V, box, cyl, frame, revolve, slab


def wheel(parts, centre, w, turn=0.0):
    """One wheel. `w` is the wheel spec (see _bike.MTB_WHEEL); `turn`
    rotates the whole wheel (radians) so two wheels never line up."""
    m = Matrix.Translation(V(centre)) @ Matrix.Rotation(turn, 4, "Z")
    _rim(parts["rim"], m, w)
    _tyre(parts, m, w)
    _hub(parts["hub"], m, w)
    _spokes(parts["spoke"], m, w)
    if w.get("rotor"):
        _rotor(parts["rotor"], m, w)
    _valve(parts["steel"], m, w)
    return m


def _rim(mesh, m, w):
    R, hw, d = w["R"], w["rim_w"] / 2, w["rim_d"]
    # (r, h) round the section: bed and hooks, the braking flank, the
    # spoke bed (deep rims run their flank flat for most of the depth)
    prof = [
        (R + 0.003, -hw),
        (R + 0.004, -hw * 0.82),
        (R + 0.0005, -hw * 0.7),
        (R + 0.0005, hw * 0.7),
        (R + 0.004, hw * 0.82),
        (R + 0.003, hw),
        (R - d * 0.55, hw),
        (R - d * 0.88, hw * 0.78),
        (R - d, hw * 0.35),
        (R - d, -hw * 0.35),
        (R - d * 0.88, -hw * 0.78),
        (R - d * 0.55, -hw),
    ]
    revolve(mesh, prof, m, w.get("segs", 64), closed=True)


def _tyre_profile(w, n=12):
    """(r, h, phi) points over the tyre section from bead to bead."""
    R, B = w["R"], w["tyre_w"] / 2
    A = w["tyre_h"] * 0.56
    rc = R + w["tyre_h"] - A
    p = w.get("square", 0.8)
    out = [(R + 0.002, -w["rim_w"] / 2 + 0.002, -2.2)]
    for i in range(n + 1):
        phi = math.radians(-112 + 224 * i / n)
        c, s = math.cos(phi), math.sin(phi)
        out.append((rc + A * math.copysign(abs(c) ** p, c), B * math.copysign(abs(s) ** p, s), phi))
    out.append((R + 0.002, w["rim_w"] / 2 - 0.002, 2.2))
    return out


def _tyre(parts, m, w):
    prof = _tyre_profile(w)
    tread = math.radians(w.get("tread_deg", 48))
    keys = []
    for a, b in zip(prof, prof[1:]):
        mid = (a[2] + b[2]) / 2
        keys.append("tyre" if abs(mid) < tread else "sidewall")
    # revolve twice, once per material, by blanking the other's spans
    segs = w.get("segs", 72)
    for key in ("tyre", "sidewall"):
        spans = [i for i, kk in enumerate(keys) if kk == key]
        for run in _runs(spans):
            pts = [(r, h) for r, h, _ in prof[run[0] : run[-1] + 2]]
            revolve(parts[key], pts, m, segs)
    if w.get("knobs"):
        _knobs(parts["knob"], m, w)


def _runs(idx):
    """Consecutive runs in a sorted list of indices."""
    out = []
    for i in idx:
        if out and i == out[-1][-1] + 1:
            out[-1].append(i)
        else:
            out.append([i])
    return out


def _section_point(w, phi):
    """Surface point (r, h) and outward normal (nr, nh) of the tyre at phi."""
    R, B = w["R"], w["tyre_w"] / 2
    A = w["tyre_h"] * 0.56
    rc = R + w["tyre_h"] - A
    p = w.get("square", 0.8)

    def at(f):
        c, s = math.cos(f), math.sin(f)
        return rc + A * math.copysign(abs(c) ** p, c), B * math.copysign(abs(s) ** p, s)

    r, h = at(phi)
    r2, h2 = at(phi + 1e-3)
    dr, dh = r2 - r, h2 - h
    ln = math.hypot(dr, dh)
    return r, h, dh / ln, -dr / ln


def _knobs(mesh, m, w):
    """Rows of block knobs: a staggered centre row, transition and
    shoulder rows, each knob standing on the tyre's surface."""
    n = w.get("knob_count", 42)
    rows = [(8, (0.0095, 0.0042, 0.011), 0), (-8, (0.0095, 0.0042, 0.011), 0.5), (36, (0.0085, 0.0045, 0.008), 0.25), (-36, (0.0085, 0.0045, 0.008), 0.75), (66, (0.012, 0.005, 0.009), 0), (-66, (0.012, 0.005, 0.009), 0.5)]
    for deg, size, phase in rows:
        r, h, nr, nh = _section_point(w, math.radians(deg))
        for i in range(n):
            if deg in (8, -8) and i % 2:
                continue
            a = TAU * (i + phase) / n
            er = V((math.cos(a), math.sin(a), 0))
            et = V((-math.sin(a), math.cos(a), 0))
            nrm = er * nr + V((0, 0, 1)) * nh
            c = er * r + V((0, 0, h)) + nrm * (size[1] / 2 - 0.0008)
            box(mesh, m @ frame(c, et, nrm), size)


def _hub(mesh, m, w):
    L, fr = w["hub_len"], w["flange_r"]
    zl, zr = w["flange_z"]
    prof = [
        (0.005, -L - 0.004),
        (0.011, -L - 0.004),
        (0.012, -L + 0.004),
        (0.016, -L + 0.008),
        (0.018, zl - 0.004),
        (fr, zl - 0.0015),
        (fr, zl + 0.0015),
        (0.021, zl + 0.005),
        (0.019, (zl + zr) / 2),
        (0.021, zr - 0.005),
        (fr, zr - 0.0015),
        (fr, zr + 0.0015),
        (0.018, zr + 0.004),
        (0.016, L - 0.008),
        (0.012, L - 0.004),
        (0.011, L + 0.004),
        (0.005, L + 0.004),
    ]
    revolve(mesh, prof, m, 24)


def _spokes(mesh, m, w):
    """Cross-laced spokes: half on each flange, every other one leading."""
    n, cross = w["spokes"], w.get("cross", 3)
    R, d = w["R"], w["rim_d"]
    step = TAU / (n // 2)
    for side, z in enumerate(w["flange_z"]):
        for i in range(n // 2):
            ha = i * step + side * TAU / n
            ra = ha + (1 if i % 2 == 0 else -1) * cross * 2 * TAU / n
            hub = V((w["flange_r"] * 0.86 * math.cos(ha), w["flange_r"] * 0.86 * math.sin(ha), z))
            rr = R - d + 0.002
            rim = V((rr * math.cos(ra), rr * math.sin(ra), (0.0025 if side else -0.0025)))
            cyl(mesh, m @ hub, m @ rim, w.get("spoke_r", 0.0011), sides=4, caps=False)


def _rotor(mesh, m, w):
    """A six-armed disc with a slotted braking track."""
    rr, z = w["rotor"]
    segs = 48
    rings = [0.021, 0.027, rr - 0.017, rr - 0.012, rr - 0.0055, rr]

    def keep(band, j):
        if band == 1:
            return j % 8 in (0, 1)
        if band == 3:
            return j % 3 != 1
        return True

    slab(mesh, m @ Matrix.Translation((0, 0, z)), rings, segs, 0.0019, keep)


def _valve(mesh, m, w):
    R, d = w["R"], w["rim_d"]
    a = math.radians(30)
    u = V((math.cos(a), math.sin(a), 0))
    cyl(mesh, m @ (u * (R - d)), m @ (u * (R - d - 0.028)), 0.003, sides=8)
