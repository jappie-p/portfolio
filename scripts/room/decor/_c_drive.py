"""The drivetrain for the bike kit: chainrings on a spider, cranks and
pedals, a cassette, a rear derailleur, and a chain of real links run over
the ring, the cog and both pulleys. Bike axes: x forward, y up, z toward
the drive side; the rear axle is the origin."""

import math

from mathutils import Matrix

from decor._c_geo import TAU, V, box, cyl, frame, pitch_radius, rbox, slab, sweep, teeth

PITCH = 0.0127
Z = V((0, 0, 1))


def drivetrain(parts, d):
    """Everything from the cranks back. `d` is the drive spec plus the
    frame's `bb` point (see _bike)."""
    bb = V(d["bb"])
    _rings(parts, bb, d)
    _cranks(parts, bb, d)
    zc = _cassette(parts, d)
    guide, tension = _mech(parts, d, zc)
    _chain(parts["chain"], bb, d, zc, guide, tension)


def _rings(parts, bb, d):
    for i, n in enumerate(d["rings"]):
        rp = pitch_radius(n)
        z = d["chainline"] - i * 0.0075
        segs = 2 * n
        rings = [0.024, 0.034, rp - 0.013, rp - 0.004, teeth(n, rp + 0.0042, rp - 0.0028)]
        arms = 4 if i == 0 else 0

        def keep(band, j, segs=segs, arms=arms):
            if band == 1 and arms:
                return j % (segs // arms) < 3
            return band != 1 or not arms

        slab(parts["ring"], Matrix.Translation(bb + Z * z), rings if arms else rings[2:], segs, 0.0034, keep if arms else None)


def _cranks(parts, bb, d):
    L, a = d["crank"], math.radians(d["crank_deg"])
    zo = d["chainline"] + 0.014
    cyl(parts["alu"], bb - Z * zo, bb + Z * zo, 0.012, sides=16)
    for sign, ang in ((1, a), (-1, a + math.pi)):
        u = V((math.cos(ang), math.sin(ang), 0))
        root = bb + Z * (sign * zo)
        tip = bb + u * L + Z * (sign * (zo + 0.008))
        sweep(parts["alu"], [root, root.lerp(tip, 0.5) + Z * (sign * 0.003), tip], [(0.0145, 0.009), (0.0118, 0.0082), (0.0105, 0.0078)], up=Z, sides=12)
        cyl(parts["alu"], root - Z * (sign * 0.004), root + Z * (sign * 0.006), 0.017, sides=16)
        _pedal(parts, tip, sign, d["pedal"])


def _pedal(parts, at, sign, kind):
    out = at + Z * (sign * 0.008)
    cyl(parts["steel"], out - Z * (sign * 0.008), out + Z * (sign * 0.03), 0.0055, sides=8)
    if kind == "flat":
        c = out + Z * (sign * 0.058)
        rbox(parts["alu"], frame(c, (1, 0, 0), (0, 1, 0)), (0.104, 0.017, 0.098), 0.005, seg=1)
        # pins along both long edges
        for x in (-0.042, -0.014, 0.014, 0.042):
            for dz in (-0.042, 0.042):
                for dy in (0.009, -0.009):
                    cyl(parts["steel"], c + V((x, dy, dz)), c + V((x, dy * 1.45, dz)), 0.0018, sides=5)
    else:
        c = out + Z * (sign * 0.04)
        rbox(parts["alu"], frame(c, (1, 0, 0), (0, 1, 0)), (0.07, 0.02, 0.058), 0.007, seg=2)
        box(parts["steel"], frame(c + V((0, 0.011, 0)), (1, 0, 0), (0, 1, 0)), (0.045, 0.003, 0.03))


def _cassette(parts, d):
    """Cogs from the biggest (inboard) out. Returns the chain's cog z."""
    cogs = d["cogs"]
    zc = 0.0
    for i, n in enumerate(cogs):
        rp = pitch_radius(n)
        z = d["cog_z0"] + i * 0.0039
        segs = 2 * n
        tip = teeth(n, rp + 0.0034, rp - 0.0024)
        if n >= 24:
            rings = [0.0175, 0.025, rp - 0.009, tip]

            def keep(band, j, segs=segs):
                return band != 1 or j % (segs // 5) < max(2, segs // 22)
        else:
            rings, keep = [0.0175, tip], None
        slab(parts["steel"], Matrix.Translation(Z * z), rings, segs, 0.0019, keep, back=i == 0)
        if i == d["cog"]:
            zc = z
    return zc


def _mech(parts, d, zc):
    """The rear derailleur: hanger, parallelogram body, cage and pulleys.
    Returns the two pulley centres (guide, tension) in the chain plane."""
    gx, gy = d["guide"]
    tx, ty = d["tension"]
    guide = V((gx, gy, zc))
    tension = V((tx, ty, zc))
    out = d["cog_z0"] + len(d["cogs"]) * 0.0039 + 0.012
    hanger = V((-0.012, -0.012, out))
    body = V(((gx - 0.012) / 2 - 0.024, (gy - 0.012) / 2, out + 0.012))
    rbox(parts["mech"], frame(hanger, (0, -1, 0), (1, 0, 0)), (0.03, 0.022, 0.008), 0.004, seg=1)
    rbox(parts["mech"], frame(body, (-0.6, -1, 0), (1, -0.6, 0)), (0.055, 0.024, 0.026), 0.007, seg=2)
    knuckle = guide + V((-0.004, 0.012, out + 0.004 - zc))
    sweep(parts["mech"], [body + V((0.004, -0.024, 0)), knuckle], (0.011, 0.009), up=Z, sides=10, smooth_path=False)
    for dz in (0.0075, -0.0075):
        sweep(parts["mech"], [guide + Z * dz, tension + Z * dz], (0.021, 0.0012), up=Z, sides=8, smooth_path=False)
    for c in (guide, tension):
        slab(parts["steel"], Matrix.Translation(c), [0.005, 0.013, teeth(12, pitch_radius(12) + 0.003, pitch_radius(12) - 0.002)], 24, 0.0042)
        cyl(parts["mech"], c - Z * 0.009, c + Z * 0.009, 0.0045, sides=8)
    # the cable's housing loop from the chainstay into the body
    sweep(parts["housing"], [body + V((0.02, 0.0, 0.004)), body + V((0.06, 0.035, 0.004)), V((0.13, 0.04, out - 0.02)), V((0.2, 0.03, out - 0.035))], 0.0025, sides=6)
    return guide, tension


def _tangent(a, b):
    """The chain's straight run from circle a to circle b; circles are
    (centre, signed radius), + for counter-clockwise from the drive side."""
    (ca, ra), (cb, rb) = a, b
    D = cb - ca
    phi = math.atan2(D.y, D.x)
    th = phi + math.asin(max(-1.0, min(1.0, (ra - rb) / D.length)))
    m = V((math.sin(th), -math.cos(th), 0))
    return ca + m * ra, cb + m * rb


def _arc(c, r, p_in, p_out):
    a0 = math.atan2(p_in.y - c.y, p_in.x - c.x)
    a1 = math.atan2(p_out.y - c.y, p_out.x - c.x)
    sweep_a = (a1 - a0) % TAU if r > 0 else -((a0 - a1) % TAU)
    n = max(2, int(abs(sweep_a) / 0.08))
    return [c + V((math.cos(a0 + sweep_a * i / n), math.sin(a0 + sweep_a * i / n), 0)) * abs(r) for i in range(n + 1)]


def _chain(mesh, bb, d, zc, guide, tension):
    rp_ring = pitch_radius(d["rings"][0])
    rp_cog = pitch_radius(d["cogs"][d["cog"]])
    rg = pitch_radius(12)
    flat = lambda p: V((p.x, p.y, 0))
    circles = [(flat(bb), rp_ring), (V((0, 0, 0)), rp_cog), (flat(guide), -rg), (flat(tension), rg)]
    runs = [_tangent(circles[i], circles[(i + 1) % 4]) for i in range(4)]
    path = []
    for i, (c, r) in enumerate(circles):
        path += _arc(c, r, runs[i - 1][1], runs[i][0])
    path.append(path[0])
    # z: on the ring's line at the front, on the cog's line at the back
    zr = d["chainline"]

    def zat(x):
        t = max(0.0, min(1.0, (x - 0.06) / (bb.x - 0.06)))
        return zc + (zr - zc) * t

    pts = [V((p.x, p.y, zat(p.x))) for p in path]
    seg = [(pts[i + 1] - pts[i]).length for i in range(len(pts) - 1)]
    total = sum(seg)
    n = max(2, round(total / PITCH / 2) * 2)
    step = total / n
    pins = []
    acc, i = 0.0, 0
    for k in range(n):
        s = k * step
        while i < len(seg) - 1 and acc + seg[i] < s:
            acc += seg[i]
            i += 1
        t = (s - acc) / seg[i] if seg[i] else 0.0
        pins.append(pts[i].lerp(pts[i + 1], t))
    for k in range(n):
        a, b = pins[k], pins[(k + 1) % n]
        c = (a + b) / 2
        u = (b - a).normalized()
        f = frame(c, u, Z.cross(u))
        if k % 2 == 0:
            for dz in (0.0037, -0.0037):
                box(mesh, f @ Matrix.Translation((0, 0, dz)), (step + 0.0045, 0.0078, 0.001))
        else:
            box(mesh, f, (step + 0.0015, 0.0066, 0.0056))
