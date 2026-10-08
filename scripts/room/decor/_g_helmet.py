"""A ski helmet with its goggles, hanging on a wall hook. Helmet axes: x to
the front (the face), y up, z across; origin at the dome's centre, the dome
cut open 3.5 cm below it."""

import math

from decor._g_common import Mesh, V, cyl, emit, frame, loft, rbox, sweep

A, B, C = 0.158, 0.128, 0.116
CUT = -0.035


def _k(y):
    return math.sqrt(max(0.0, 1 - (y / B) ** 2))


def _pt(y, t, grow=0.0, back=0.0):
    k = _k(y)
    bulge = 1 + back * max(0.0, -math.cos(t))
    return V(((A * k + grow) * math.cos(t) * bulge, y, (C * k + grow) * math.sin(t)))


def _ring(y, grow=0.0, n=36):
    return [_pt(y, math.tau * j / n, grow) for j in range(n)]


def _heights(top, n=9):
    return [CUT + (top - CUT) * (i / n) ** 0.75 for i in range(n + 1)]


def _top_arc(grow, t0=0.12, t1=math.pi - 0.12, n=14):
    return [V((A * math.cos(t) * (1 + grow / A), B * math.sin(t) * (1 + grow / B), 0.0)) for t in [t0 + (t1 - t0) * i / n for i in range(n + 1)]]


def build_helmet(k, name, at, front, up):
    shell, liner, trim, strap, vents, stripe = Mesh(), Mesh(), Mesh(), Mesh(), Mesh(), Mesh()
    hs = _heights(B * 0.985)
    loft(shell, [_ring(y) for y in hs], caps=(False, True))
    loft(liner, [_ring(y, -0.012) for y in hs[:-2]], caps=(False, False))
    # the liner's bottom lip and the rim band where the shell ends
    loft(liner, [_ring(CUT, 0.0), _ring(CUT + 0.002, -0.012)], caps=(False, False))
    ring = _ring(CUT + 0.006, 0.002)
    sweep(trim, ring + ring[:1], (0.0035, 0.007), up=V((0, 1, 0)), sides=6, step=0.02, smooth_path=False)
    # ear pads and a chin strap loop each side
    for s in (1, -1):
        rbox(trim, frame(V((-0.01, -0.006, s * (C * _k(-0.006) + 0.0008))), (1, 0, 0), (0, 1, 0)), (0.098, 0.082, 0.012), 0.005, seg=2)
        strap_pts = [V((0.0, -0.04, s * 0.107)), V((0.02, -0.11, s * 0.1)), V((0.05, -0.16, s * 0.07)), V((0.075, -0.18, s * 0.03))]
        sweep(strap, strap_pts, (0.0015, 0.0085), up=V((0, 0, 1)), sides=4, step=0.02)
    rbox(trim, frame(V((0.078, -0.182, 0.0)), (1, 0, 0), (0, 1, 0)), (0.026, 0.02, 0.05), 0.006, seg=1)
    # vents: dark slots in two rows each side of the crown, a slot at the brow
    for el, ts in ((0.78, (-0.55, 0.55)), (0.55, (-1.0, 1.0))):
        for t in ts:
            for dx in (-0.045, 0.0, 0.045):
                y = B * math.sin(el)
                p = _pt(y, math.pi / 2 + t * 0.55 + dx * 6.0, 0.001)
                nrm = V((p.x / A**2, p.y / B**2, p.z / C**2)).normalized()
                rbox(vents, frame(p, V((1, 0, 0)), nrm), (0.045, 0.008, 0.012), 0.003, seg=1)
    # the crown stripe from the brow over the top to the back
    arc = _top_arc(0.0012)
    sweep(stripe, arc, (0.0013, 0.011), up=V((0, 0, 1)), sides=4, step=0.02)
    sweep(trim, _top_arc(0.0009, 0.13, math.pi - 0.14, 10), (0.0012, 0.0016), up=V((0, 0, 1)), sides=4, step=0.02)
    # a little peak above the goggles
    peak = [V((A * 0.93 * math.cos(t), 0.06 + 0.002, (C * 0.95) * math.sin(t))) for t in (-0.7 + 1.4 * i / 8 for i in range(9))]
    place = frame(at, front, up)
    emit(k, name, shell.moved(place), k.mat("skihelm_shell", "#e8e5de", 0.38, coat=0.6, coat_rough=0.12))
    emit(k, name + "_liner", liner.moved(place), k.mat("skihelm_liner", "#2a2a2c", 0.95, bump=0.3, bump_scale=260))
    emit(k, name + "_trim", trim.moved(place), k.mat("skihelm_trim", "#1c1d1f", 0.55))
    emit(k, name + "_strap", strap.moved(place), k.mat("skihelm_strap", "#17181a", 0.8))
    emit(k, name + "_vents", vents.moved(place), k.mat("skihelm_vent", "#0f1011", 0.7))
    emit(k, name + "_stripe", stripe.moved(place), k.mat("skihelm_stripe", "#ff6a2a", 0.45))
    _goggles(k, name + "_goggles", place)
    return place


def _goggles(k, name, place):
    """Goggles worn on the helmet's front: an elastic band round it, a
    rubber frame and a curved orange mirror lens."""
    band, frame_m, lens, logo = Mesh(), Mesh(), Mesh(), Mesh()
    yc, hh, span = 0.056, 0.029, 0.74
    gap = 0.026
    rings = []
    for j in range(5):
        y = yc - hh + 2 * hh * j / 4
        rings.append([_pt(y, -span + 2 * span * i / 16, gap * (1 - 0.35 * abs(2 * j / 4 - 1) ** 2)) for i in range(17)])
    loft(lens, rings, caps=(False, False), closed=False)
    outline = rings[0] + [r[-1] for r in rings[1:]] + rings[-1][::-1][1:] + [r[0] for r in rings[::-1]][1:]
    sweep(frame_m, outline, 0.0065, sides=6, step=0.014, smooth_path=False)
    # the elastic: a wide black band round the helmet at the lens's height
    base = [_pt(yc, math.tau * i / 40, 0.004) for i in range(41)]
    sweep(band, base, (0.003, 0.02), up=V((0, 1, 0)), sides=6, step=0.02, smooth_path=False)
    # a white stripe on the band, and a silver logo plate at the temple
    sweep(logo, [_pt(yc, -math.pi / 2 - 0.9 + 0.0 * i, 0.0) for i in range(2)], 0.001, sides=3, smooth_path=False)
    stripe = Mesh()
    sweep(stripe, [p * 1.0 + V((0, 0, 0)) for p in [_pt(yc, math.pi * 0.62 + 0.9 * i / 12, 0.0075) for i in range(13)]], (0.0012, 0.004), up=V((0, 1, 0)), sides=4, step=0.02)
    emit(k, name + "_lens", lens.moved(place), k.mat("goggle_lens", "#ff7a30", 0.06, metal=0.7, coat=1.0, coat_rough=0.02), recalc=False)
    emit(k, name + "_frame", frame_m.moved(place), k.mat("goggle_frame", "#101112", 0.6))
    emit(k, name + "_band", band.moved(place), k.mat("goggle_band", "#17181a", 0.85))
    emit(k, name + "_bandstripe", stripe.moved(place), k.mat("goggle_stripe", "#efe6d2", 0.6))
