"""Frames and forks for the bike kit, from a few geometry numbers: a
full-suspension trail frame (hydroformed main triangle, chainstays,
seatstays, rocker link, coil shock) with a suspension fork, and an aero
road frame with a rigid fork. Bike axes: x forward, y up, z toward the
drive side; the rear axle is the origin."""

import math

from decor._c_geo import V, cyl, disc, frame, helix, rbox, sweep

Z = V((0, 0, 1))


def geometry(g):
    """Key points of a frame from its geometry numbers (metres, degrees)."""
    wb, cs, drop = g["wheelbase"], g["chainstay"], g["bb_drop"]
    ha, sa = math.radians(g["head_angle"]), math.radians(g["seat_angle"])
    d = V((-math.cos(ha), math.sin(ha), 0))
    n = V((math.sin(ha), math.cos(ha), 0))
    front = V((wb, 0, 0))
    a0 = front - n * g["offset"]
    crown = a0 + d * g["a2c"]
    hb = crown + d * 0.012
    sdir = V((-math.cos(sa), math.sin(sa), 0))
    bb = V((math.sqrt(cs * cs - drop * drop), -drop, 0))
    return {
        "rear": V((0, 0, 0)), "front": front, "bb": bb, "dir": d, "fwd": n,
        "crown": crown, "hb": hb, "ht": hb + d * g["head_tube"],
        "sdir": sdir, "stop": bb + sdir * g["seat_tube"],
    }


def _tube(parts, key, pts, rad, sides=16):
    return sweep(parts[key], pts, rad, up=Z, sides=sides, step=0.032)


def mtb_frame(parts, p, g):
    """The trail frame. Returns anchor points (decals, shock, hooks)."""
    d, n, bb, hb, ht, sdir = p["dir"], p["fwd"], p["bb"], p["hb"], p["ht"], p["sdir"]
    _tube(parts, "frame", [hb - d * 0.014, ht + d * 0.006], [(0.031, 0.031), (0.027, 0.027)], 20)
    dt0, dt3 = hb + d * 0.035 - n * 0.006, bb + V((0.03, 0.03, 0))
    down = [dt0, dt0.lerp(dt3, 0.3) + V((0.006, 0.014, 0)), dt0.lerp(dt3, 0.7) + V((0.004, 0.006, 0)), dt3]
    _tube(parts, "frame", down, [(0.029, 0.025), (0.031, 0.027), (0.03, 0.028), (0.026, 0.031)])
    t0, t1 = bb + sdir * (g["seat_tube"] - 0.085), ht - d * 0.024
    top = [t0, t0.lerp(t1, 0.5) + V((0, 0.012, 0)), t1]
    _tube(parts, "frame", top, [(0.019, 0.017), (0.021, 0.018), (0.024, 0.02)])
    stop = p["stop"]
    _tube(parts, "frame", [bb + sdir * 0.015, stop], [(0.022, 0.022), (0.0185, 0.0185)])
    cyl(parts["black"], stop - sdir * 0.012, stop + sdir * 0.006, 0.0198, sides=16)
    cyl(parts["frame"], bb - Z * 0.037, bb + Z * 0.037, 0.0225, sides=20)
    # rear end: main pivot above the BB, chainstays, dropouts, seatstays,
    # rocker on the seat tube, coil shock down to the down tube
    rear = p["rear"]
    piv = bb + V((-0.02, 0.058, 0))
    rp = bb + sdir * (g["seat_tube"] - 0.14) + n * 0.004
    rr = rp + V((-0.06, 0.03, 0))
    se = rp + V((0.06, 0.036, 0))
    drop = rear + V((0.012, 0.012, 0))
    for s in (1, -1):
        _tube(parts, "frame", [piv + Z * (s * 0.034), piv.lerp(drop, 0.5) + V((0, -0.016, 0)) + Z * (s * 0.054), drop + V((0.022, -0.006, 0)) + Z * (s * 0.064)], [(0.015, 0.012), (0.013, 0.011), (0.011, 0.009)], 12)
        _tube(parts, "frame", [drop + V((0.004, 0.02, 0)) + Z * (s * 0.064), drop.lerp(rr, 0.5) + V((0.008, -0.01, 0)) + Z * (s * 0.054), rr + Z * (s * 0.037)], [(0.011, 0.009), (0.012, 0.009), (0.013, 0.009)], 12)
        rbox(parts["frame"], frame(drop + Z * (s * 0.066), (1, 0.3, 0), (-0.3, 1, 0)), (0.06, 0.05, 0.01), 0.006, seg=1)
        sweep(parts["black"], [rr + Z * (s * 0.037), rp + Z * (s * 0.037), se + Z * (s * 0.037)], (0.015, 0.0045), up=Z, sides=10, step=0.012)
    for c in (piv, rp, rr, se):
        cyl(parts["black"], c - Z * 0.047, c + Z * 0.047, 0.0075, sides=10)
    cyl(parts["black"], rear - Z * 0.084, rear + Z * 0.08, 0.0078, sides=10)
    sm = dt0.lerp(dt3, 0.64) + V((0.004, 0.034, 0))
    rbox(parts["frame"], frame(sm - V((0, 0.012, 0)), (1, -0.6, 0), (0.6, 1, 0)), (0.04, 0.02, 0.03), 0.006, seg=1)
    _shock(parts, sm, se)
    return {"down": (dt3, dt0), "top": (t0, t1), "shock": (sm, se)}


def _shock(parts, a, b):
    """A coil shock between two eyes: damper body, chrome shaft, the spring
    and its preload collar."""
    u = (b - a).normalized()
    L = (b - a).length
    for c in (a, b):
        cyl(parts["black"], c - Z * 0.012, c + Z * 0.012, 0.0095, sides=12)
    body_end = a + u * (L * 0.5)
    cyl(parts["black"], a + u * 0.01, body_end, 0.0205, sides=18)
    cyl(parts["black"], body_end, body_end + u * 0.01, 0.024, sides=18)
    cyl(parts["stanchion"], body_end, b - u * 0.012, 0.008, sides=12)
    cyl(parts["collar"], body_end + u * 0.01, body_end + u * 0.017, 0.026, sides=18)
    sweep(parts["spring"], helix(body_end + u * 0.018, u, 0.0195, L * 0.5 - 0.034, 6.5), 0.0032, sides=6, step=0.008)
    cyl(parts["black"], b - u * 0.02, b - u * 0.012, 0.022, sides=16)


def suspension_fork(parts, p, g):
    d, n, front = p["dir"], p["fwd"], p["front"]
    a2c = g["a2c"]
    leg = lambda t, s: front + d * t + Z * (s * 0.056)
    for s in (1, -1):
        cyl(parts["stanchion"], leg(a2c - 0.01, s), leg(a2c - 0.24, s), 0.018, sides=18)
        cyl(parts["black"], leg(a2c, s), leg(a2c + 0.012, s), 0.0175, sides=16)
        sweep(parts["lower"], [leg(a2c - 0.205, s), leg(0.03, s)], [0.0238, 0.0205], sides=18, smooth_path=False)
        cyl(parts["black"], leg(a2c - 0.212, s), leg(a2c - 0.198, s), 0.0252, sides=18)
        rbox(parts["lower"], frame(leg(0.0, s), d, n), (0.05, 0.034, 0.018), 0.007, seg=1)
    arch = [leg(a2c - 0.22, -1) + n * 0.016, front + d * (a2c - 0.19) + n * 0.044, leg(a2c - 0.22, 1) + n * 0.016]
    sweep(parts["lower"], arch, 0.012, sides=12, step=0.012)
    rbox(parts["black"], frame(p["crown"] + n * 0.026 + d * 0.004, n, d), (0.07, 0.03, 0.155), 0.011, seg=2)
    cyl(parts["black"], p["crown"], p["hb"], 0.0185, sides=16)
    cyl(parts["black"], front - Z * 0.078, front + Z * 0.074, 0.0078, sides=10)
    sweep(parts["black"], [front - Z * 0.078, front - Z * 0.084 + V((0.03, -0.02, 0)), front - Z * 0.084 + V((0.07, -0.03, 0))], (0.006, 0.004), up=Z, sides=8)


def rigid_fork(parts, p, g):
    d, n, front = p["dir"], p["fwd"], p["front"]
    crown = p["crown"]
    for s in (1, -1):
        blade = [crown + n * 0.012 + Z * (s * 0.046), front.lerp(crown, 0.5) + n * 0.018 + Z * (s * 0.05), front + Z * (s * 0.052)]
        sweep(parts["fork"], blade, [(0.02, 0.0125), (0.016, 0.01), (0.0115, 0.0075)], up=Z, sides=14, step=0.02)
        rbox(parts["fork"], frame(front + Z * (s * 0.054), d, n), (0.035, 0.026, 0.01), 0.005, seg=1)
    rbox(parts["fork"], frame(crown + n * 0.008 - d * 0.004, n, d), (0.05, 0.03, 0.105), 0.012, seg=2)
    cyl(parts["black"], crown, p["hb"], 0.0185, sides=16)
    cyl(parts["black"], front - Z * 0.07, front + Z * 0.066, 0.0072, sides=10)


def road_frame(parts, p, g):
    d, n, bb, hb, ht, sdir = p["dir"], p["fwd"], p["bb"], p["hb"], p["ht"], p["sdir"]
    _tube(parts, "frame", [hb - d * 0.01, ht + d * 0.004], [(0.027, 0.021), (0.023, 0.019)], 20)
    dt0, dt3 = hb + d * 0.03 - n * 0.008, bb + V((0.03, 0.024, 0))
    _tube(parts, "frame", [dt0, dt0.lerp(dt3, 0.5) + V((0.002, 0.004, 0)), dt3], [(0.025, 0.018), (0.024, 0.018), (0.024, 0.021)])
    t0, t1 = bb + sdir * (g["seat_tube"] - 0.035), ht - d * 0.022
    _tube(parts, "frame", [t0, t1], [(0.0155, 0.0145), (0.018, 0.0155)])
    stop = p["stop"]
    _tube(parts, "frame", [bb + sdir * 0.015, bb + sdir * 0.2 + n * 0.006, stop], [(0.023, 0.0165), (0.021, 0.015), (0.02, 0.0155)])
    cyl(parts["frame"], bb - Z * 0.036, bb + Z * 0.036, 0.0225, sides=20)
    rear = p["rear"]
    junction = bb + sdir * (g["seat_tube"] - 0.13)
    for s in (1, -1):
        _tube(parts, "frame", [bb + V((-0.025, 0.004, 0)) + Z * (s * 0.032), bb.lerp(rear, 0.55) + Z * (s * 0.06), rear + V((0.03, 0.004, 0)) + Z * (s * 0.064)], [(0.014, 0.011), (0.011, 0.009), (0.0095, 0.0075)], 12)
        _tube(parts, "frame", [rear + V((0.012, 0.022, 0)) + Z * (s * 0.064), rear.lerp(junction, 0.5) + Z * (s * 0.05), junction - n * 0.012 + Z * (s * 0.02)], [(0.0085, 0.0065), (0.0095, 0.007), (0.011, 0.008)], 12)
        rbox(parts["frame"], frame(rear + V((0.012, 0.01, 0)) + Z * (s * 0.066), (1, 0.4, 0), (-0.4, 1, 0)), (0.05, 0.042, 0.009), 0.005, seg=1)
    cyl(parts["black"], rear - Z * 0.078, rear + Z * 0.074, 0.0072, sides=10)
    # head-tube badge, brand green, on the front of the head tube
    mid = hb.lerp(ht, 0.55)
    disc(parts["badge"], frame(mid + n * 0.027, d, Z), 0.0125, 0.003, segs=20)
    return {"down": (dt3, dt0), "top": (t0, t1)}


def caliper(parts, centre, w, angle, mount):
    """A disc brake caliper astride the rotor at `angle` (degrees, round
    the axle from forward), with a small mount back to the frame."""
    r, z = w["rotor"]
    a = math.radians(angle)
    u = V((math.cos(a), math.sin(a), 0))
    t = V((-math.sin(a), math.cos(a), 0))
    c = V(centre) + u * (r - 0.012) + Z * (z - 0.004)
    rbox(parts["black"], frame(c, t, u), (0.062, 0.03, 0.036), 0.008, seg=2)
    rbox(parts["black"], frame(c + Z * -0.006 - u * 0.022, t, u), (0.05, 0.022, 0.02), 0.005, seg=1)
    sweep(parts["black"], [c - u * 0.02 + Z * -0.008, V(mount)], (0.009, 0.006), up=Z, sides=8, smooth_path=False)
    return c
