"""The bike kit's contact points: steerer, stem and bars (flat riser bars
with grips and brake levers, or drop bars with tape and hoods), the
seatpost and the saddle. Bike axes: x forward, y up, z to the drive side."""

import math

from mathutils import Matrix

from decor._c_geo import V, cyl, frame, loft, rbox, sweep

Z = V((0, 0, 1))


def cockpit(parts, ax, c):
    """Steerer, stem and bars above the head tube. `ax` holds the steering
    axis (`top` point, unit `dir` up the axis); `c` is the cockpit spec.
    Returns the bar clamp centre and a dict of anchor points."""
    d = V(ax["dir"])
    fwd = V((d.y, -d.x, 0))
    top = V(ax["top"])
    # spacers and the stem's steerer clamp
    s0 = top + d * c["spacers"]
    cyl(parts["alu"], top, s0, 0.0185, sides=16)
    clamp_c = s0 + d * 0.02
    cyl(parts["alu"], s0, s0 + d * 0.042, 0.021, sides=16)
    cyl(parts["alu"], s0 + d * 0.042, s0 + d * 0.05, 0.012, sides=12)
    rot = Matrix.Rotation(math.radians(c.get("turn", 0.0)), 4, d) if c.get("turn") else Matrix.Identity(4)
    pivot = Matrix.Translation(clamp_c) @ rot @ Matrix.Translation(-clamp_c)
    stem_dir = (Matrix.Rotation(math.radians(c["stem_rise"]), 3, Z) @ fwd).normalized()
    bar_c = clamp_c + stem_dir * c["stem"]
    sweep(parts["alu"], [pivot @ (clamp_c + stem_dir * 0.012), pivot @ bar_c], (0.0165, 0.019), up=pivot.to_3x3() @ Z, sides=12, smooth_path=False)
    cyl(parts["alu"], pivot @ (bar_c - Z * 0.026), pivot @ (bar_c + Z * 0.026), 0.0205, sides=16)
    anchors = {}
    if c["bars"] == "riser":
        _riser(parts, pivot, bar_c, c, anchors)
    else:
        _drops(parts, pivot, bar_c, c, anchors)
    return pivot @ bar_c, anchors


def _riser(parts, pivot, bc, c, anchors):
    w = c["width"] / 2
    half = [(0.0, 0.0, 0.0), (0.0, 0.003, 0.05), (-0.002, 0.012, 0.1), (-0.008, 0.024, 0.16), (-0.022, 0.03, 0.26), (-0.04, 0.033, w)]
    pts = [bc + V((x, y, -z)) for x, y, z in reversed(half[1:])] + [bc + V(p) for p in half]
    rad = [0.0111] * 3 + [0.0135, 0.0165, 0.0175, 0.0175, 0.0165, 0.0135] + [0.0111] * 2
    sweep(parts["alu"], [pivot @ p for p in pts], rad, sides=12, step=0.015)
    for s in (1, -1):
        end = bc + V((-0.04, 0.033, s * w))
        inner = bc + V((-0.031, 0.032, s * (w - 0.135)))
        sweep(parts["grip"], [pivot @ inner, pivot @ end], 0.0158, sides=14, smooth_path=False)
        for p in (inner, end):
            cyl(parts["black"], pivot @ (p - Z * s * 0.003), pivot @ (p + Z * s * 0.005), 0.0168, sides=14)
        # lever: clamp, master cylinder pointing forward, blade reaching out
        lc = bc + V((-0.026, 0.031, s * (w - 0.165)))
        cyl(parts["black"], pivot @ (lc - Z * 0.008), pivot @ (lc + Z * 0.008), 0.0155, sides=12)
        rbox(parts["black"], pivot @ frame(lc + V((0.03, 0.006, 0)), (1, 0.15, 0), (0, 1, 0)), (0.05, 0.022, 0.018), 0.006, seg=1)
        rbox(parts["black"], pivot @ frame(lc + V((0.022, 0.024, s * 0.004)), (1, 0, 0), (0, 1, 0)), (0.03, 0.012, 0.02), 0.004, seg=1)
        blade = [lc + V((0.052, 0.004, 0)), lc + V((0.06, -0.004, s * 0.035)), lc + V((0.05, -0.012, s * 0.085))]
        sweep(parts["black"], [pivot @ p for p in blade], (0.0045, 0.0028), sides=8)
        anchors[f"lever{s}"] = pivot @ (lc + V((0.03, -0.004, 0)))
        anchors[f"end{s}"] = pivot @ end
    # shifter pod (drive side) and dropper remote (other side), under the bar
    rbox(parts["black"], pivot @ frame(bc + V((-0.018, 0.01, w - 0.19)), (1, -0.4, 0), (0.4, 1, 0)), (0.045, 0.022, 0.026), 0.006, seg=1)
    rbox(parts["black"], pivot @ frame(bc + V((-0.016, 0.014, -(w - 0.19))), (1, -0.4, 0), (0.4, 1, 0)), (0.026, 0.016, 0.018), 0.005, seg=1)


def _drops(parts, pivot, bc, c, anchors):
    w = c["width"] / 2
    for s in (1, -1):
        half = [(0.0, 0.0, 0.0), (0.0, 0.0, 0.08), (0.006, 0.0, 0.15), (0.03, 0.0, w - 0.01), (0.072, -0.012, w), (0.086, -0.045, w), (0.08, -0.098, w), (0.05, -0.128, w), (-0.005, -0.13, w + 0.008), (-0.045, -0.125, w + 0.012)]
        pts = [pivot @ (bc + V((x, y, s * z))) for x, y, z in half]
        rad = [0.0159, 0.0159, 0.0125, 0.0119] + [0.0119] * 6
        sweep(parts["alu"], pts[:5], rad[:5], sides=12, step=0.012)
        sweep(parts["tape"], pts[2:], [r + 0.0022 for r in rad[2:]], sides=14, step=0.012)
        # the hood (brake/shift lever body) on the bend, blade down the drop
        hood = bc + V((0.096, 0.012, s * w))
        rings = []
        for i, (x, hw, hh) in enumerate([(-0.03, 0.016, 0.018), (-0.01, 0.019, 0.024), (0.015, 0.018, 0.028), (0.035, 0.014, 0.026), (0.047, 0.011, 0.016)]):
            ring = []
            for j in range(12):
                a = -math.tau * j / 12
                ring.append(pivot @ (hood + V((x - 0.012 * max(0, math.sin(a)), hh * math.sin(a) * (1.25 if math.sin(a) > 0 else 0.9) - 0.008, hw * math.cos(a)))))
            rings.append(ring)
        loft(parts["hood"], rings)
        blade = [hood + V((0.04, -0.006, 0)), hood + V((0.03, -0.06, 0.004 * s)), hood + V((0.005, -0.115, 0.01 * s))]
        sweep(parts["alu"], [pivot @ p for p in blade], (0.006, 0.0045), sides=8)
        anchors[f"lever{s}"] = pivot @ hood
        anchors[f"end{s}"] = pts[-1]


def seat(parts, s, c):
    """Seatpost up the seat axis and the saddle on top. `s` holds the
    seat tube's `top` and unit `dir`; `c` the saddle spec. Returns the
    saddle's centre."""
    d = V(s["dir"])
    top = V(s["top"])
    clamp = top + d * c["post"]
    if c.get("dropper"):
        cyl(parts["black"], top - d * 0.01, top + d * 0.045, 0.0175, sides=16)
        cyl(parts["dropper"], top + d * 0.045, clamp - d * 0.03, 0.0153, sides=16)
        cyl(parts["black"], clamp - d * 0.03, clamp, 0.017, sides=16)
    else:
        sweep(parts["post"], [top - d * 0.01, clamp], (0.0175, 0.011), up=Z, sides=12, smooth_path=False)
    rbox(parts["black"], frame(clamp + d * 0.008, (1, 0, 0), (0, 1, 0)), (0.05, 0.02, 0.03), 0.005, seg=1)
    centre = clamp + V((0.0, 0.034, 0))
    _saddle(parts, centre, c)
    if c.get("bag"):
        rbox(parts["bag"], frame(centre + V((-0.07, -0.06, 0)), (1, -0.25, 0), (0.25, 1, 0)), (0.13, 0.07, 0.085), 0.02, seg=2)
        for dz in (-0.022, 0.022):
            cyl(parts["black"], centre + V((-0.05, -0.028, dz)), centre + V((-0.06, -0.012, dz)), 0.006, sides=6)
    return centre


def _saddle(parts, c, spec):
    """A lofted saddle: wide flat rear, narrow nose, padded top, a shell
    underneath, and two rails down to the clamp."""
    L, W = spec["saddle_len"], spec["saddle_w"] / 2
    stations = 18
    rings = []
    for i in range(stations + 1):
        t = i / stations
        x = -L * 0.48 + L * t
        hw = W * (1 - 0.82 * t**1.6) if t > 0.05 else W * (0.75 + 5 * t)
        hw = max(hw, 0.012)
        top = 0.012 + 0.006 * math.sin(math.pi * min(1, t * 1.2)) - (0.004 if t < 0.12 else 0)
        rise = 0.004 * (t - 0.5) ** 2 * 4 + (0.012 * (0.08 - t) / 0.08 if t < 0.08 else 0)
        ring = []
        for j in range(16):
            a = -math.tau * j / 16
            ca, sa = math.cos(a), math.sin(a)
            y = (top if sa > 0 else 0.009) * sa
            ring.append(c + V((x, y + rise + (0.003 * ca * ca if sa > 0 else 0), hw * math.copysign(abs(ca) ** 0.7, ca))))
        rings.append(ring)
    loft(parts["saddle"], rings)
    for dz in (-0.022, 0.022):
        rail = [c + V((-L * 0.36, -0.006, dz * 1.5)), c + V((-0.05, -0.03, dz)), c + V((0.05, -0.03, dz)), c + V((L * 0.36, -0.006, dz * 0.5))]
        sweep(parts["steel"], rail, 0.0035, sides=6)
