"""What makes the trainer set-up lived in (story 05): a towel folded over
the bar tops, a bottle in a cage on the down tube, and a small floor fan
turned on the rider's place.

The towel and the bottle are built in the bike's own axes (see _bike) and
moved with its placement; the fan stands in the room in site metres."""

import math

from decor._c_geo import Mesh, V, cyl, disc, emit, frame, rbox, revolve, smooth, sweep

Z = V((0, 0, 1))


def towel(k, name, bike, z0=0.035, z1=0.155):
    """A green towel folded to a strip, hung over the drive-side bar top
    between `z0` and `z1` (bike z): a short fall in front, a longer one
    toward the saddle, a cream woven band near each hem (green, so it
    reads against the cream fork)."""
    bc = bike.anchors["bar"]
    zc, half = (z0 + z1) / 2, (z1 - z0) / 2
    drape = [(-0.05, -0.24), (-0.036, -0.12), (-0.026, -0.03), (-0.024, 0.0), (-0.016, 0.017), (0.0, 0.0225), (0.016, 0.017), (0.024, 0.0), (0.03, -0.05), (0.04, -0.11), (0.05, -0.14)]
    pts, _ = smooth([bc + V((x, y, zc)) for x, y in drape], step=0.008)
    along = [0.0]
    for a, b in zip(pts, pts[1:]):
        along.append(along[-1] + (b - a).length)
    L = along[-1]
    cuts = [0.0, 0.012, 0.03, L - 0.03, L - 0.012, L]
    cloth, band = Mesh(), Mesh()
    for i, (s0, s1) in enumerate(zip(cuts, cuts[1:])):
        run = [p for p, s in zip(pts, along) if s0 - 1e-6 <= s <= s1 + 1e-6]
        if len(run) < 2:
            continue
        sweep(band if i in (1, 3) else cloth, run, (0.0035, half), up=Z, sides=12, smooth_path=False)
    emit(k, name, cloth.moved(bike.m), k.mat("tr_towel", "#33583e", 0.95, noise=60, mottle=0.07, bump=0.6, bump_scale=700))
    emit(k, f"{name}_band", band.moved(bike.m), k.mat("tr_towel_band", "#ebe4d6", 0.85, bump=0.4, bump_scale=700))


def bottle(k, name, bike, at=0.15):
    """A white bottle with a green label and a black cap, in a black wire
    cage on top of the down tube, its base `at` metres up from the BB end."""
    a, b = bike.anchors["down"]
    u = (b - a).normalized()
    n = V((-u.y, u.x, 0))
    off = 0.066
    base = a + u * at + n * off
    m = frame(base, n, Z)
    prof = [(0.0335, 0.0), (0.0362, 0.005), (0.0365, 0.05), (0.0338, 0.08), (0.0338, 0.115), (0.0365, 0.14), (0.0365, 0.176), (0.0325, 0.193), (0.023, 0.201), (0.0185, 0.204), (0.0195, 0.207), (0.0195, 0.226), (0.012, 0.233), (0.0075, 0.24), (0.0045, 0.246)]
    mats = [0, 0, 0, 1, 1, 1, 0, 0, 0, 2, 2, 2, 2, 2]
    body = Mesh()
    revolve(body, prof, m, 32, mats=mats)
    disc(body, m @ frame((0, 0, 0.0005)), 0.0335, 0.001, segs=32)
    disc(body, m @ frame((0, 0, 0.246)), 0.0045, 0.001, mat=2, segs=12)
    emit(k, name, body.moved(bike.m), [k.mat("tr_bottle", "#efece5", 0.45), k.mat("bk_green", "#1f4a32", 0.35, metal=0.3), k.mat("bk_black", "#1b1b1b", 0.5)])
    cage = Mesh()
    r = 0.0365 + 0.003
    for s in (1, -1):
        rail = [a + u * (at + 0.02) + n * 0.027, a + u * (at + 0.03) + n * (off - 0.01) + Z * (s * r * 0.95), a + u * (at + 0.09) + n * off + Z * (s * r), a + u * (at + 0.15) + n * off + Z * (s * r), a + u * (at + 0.17) + n * (off + r * 0.7) + Z * (s * r * 0.7), a + u * (at + 0.172) + n * (off + r)]
        sweep(cage, rail, 0.0024, sides=6, step=0.012)
    sweep(cage, [a + u * (at + 0.025) + n * 0.027, a + u * (at - 0.006) + n * 0.04, a + u * (at - 0.006) + n * (off + 0.012)], 0.0024, sides=6, step=0.012)
    rbox(cage, frame(a + u * (at + 0.06) + n * 0.0255, u, n), (0.1, 0.004, 0.016), 0.0018, seg=1)
    for h in (0.028, 0.092):
        cyl(cage, a + u * (at + h) + n * 0.026, a + u * (at + h) + n * 0.031, 0.005, sides=10)
    emit(k, f"{name}_cage", cage.moved(bike.m), k.mat("bk_black", "#1b1b1b", 0.5))


def fan(k, name, at, aim, lead=(), R=0.15, hub_y=0.21):
    """A small floor fan on a round foot, its head in a U-yoke, turned to
    look at `aim` (site points): a cream shroud with vent ribs and the
    motor pod behind, a graphite grille domed in front, three blades.
    `lead` routes its power cable from the foot (site points)."""
    x, _, z = at
    c = V((x, hub_y, z))
    ax = _axis_frame(c, (V(aim) - c).normalized())
    side, f = ax.col[0].xyz, ax.col[2].xyz
    shroud, grille, dark = Mesh(), Mesh(), Mesh()
    # the shroud: a deep bowl with a rolled front lip (local z is the axis)
    bowl = [(0.045, -0.115), (0.07, -0.112), (0.105, -0.095), (0.135, -0.065), (R, -0.03), (R + 0.006, 0.0), (R + 0.004, 0.018), (R - 0.004, 0.022), (R - 0.008, 0.008), (R - 0.012, -0.03), (0.13, -0.06), (0.1, -0.085)]
    revolve(shroud, bowl, ax, 48, closed=True)
    disc(dark, ax @ frame((0, 0, -0.118)), 0.05, 0.02, segs=32)
    for rr, zz in ((0.062, -0.117), (0.092, -0.105), (0.118, -0.087)):
        sweep(dark, [ax @ V((rr * math.cos(a), rr * math.sin(a), zz)) for a in (math.tau * i / 40 for i in range(41))], 0.0028, sides=5, smooth_path=False)
    # front grille: rings on a shallow dome, spokes, the centre badge
    dome = lambda r: 0.022 + 0.026 * (1 - (r / R) ** 2)  # noqa: E731
    for rr in (0.035, 0.065, 0.095, 0.125, R - 0.006):
        sweep(grille, [ax @ V((rr * math.cos(a), rr * math.sin(a), dome(rr))) for a in (math.tau * i / 48 for i in range(49))], 0.0016, sides=5, smooth_path=False)
    for i in range(16):
        a = math.tau * i / 16
        sweep(grille, [ax @ V((rr * math.cos(a), rr * math.sin(a), dome(rr))) for rr in (0.03, 0.07, 0.11, R - 0.004)], 0.0015, sides=4, step=0.02)
    disc(shroud, ax @ frame((0, 0, dome(0) + 0.003)), 0.032, 0.006, segs=28)
    # three blades, pitched 28 degrees, on a spinner
    disc(dark, ax @ frame((0, 0, -0.02)), 0.03, 0.03, segs=24)
    pitch = math.radians(28)
    for i in range(3):
        a = math.tau * i / 3 + 0.4
        radial = V((math.cos(a), math.sin(a), 0))
        chord = V((-math.sin(a), math.cos(a), 0)) * math.cos(pitch) + Z * math.sin(pitch)
        rbox(dark, ax @ frame(radial * 0.08 - Z * 0.02, radial, chord), (0.105, 0.075, 0.004), 0.0018, seg=1)
    # the yoke from the foot up to pivots either side of the head, the foot
    w = R + 0.018
    down = V((0, 1, 0))
    yoke = [c + side * w, c + side * w - down * 0.08, c + side * (w * 0.75) - down * 0.15, V((x, 0.045, z)), c - side * (w * 0.75) - down * 0.15, c - side * w - down * 0.08, c - side * w]
    sweep(shroud, yoke, (0.009, 0.014), up=f, sides=10, step=0.02)
    for s in (1, -1):
        cyl(dark, c + side * (s * (R + 0.002)), c + side * (s * (w + 0.016)), 0.017, sides=16)
    revolve(shroud, [(0.06, 0.0), (0.11, 0.0), (0.118, 0.006), (0.115, 0.018), (0.09, 0.028), (0.03, 0.034), (0.016, 0.034)], frame((x, 0, z), (1, 0, 0), (0, 0, -1)), 40)
    cyl(shroud, V((x, 0.03, z)), V((x, 0.06, z)), 0.016, sides=14)
    emit(k, name, shroud, k.mat("tr_fan", "#e9e4d9", 0.45))
    emit(k, f"{name}_grille", grille, k.mat("tr_fan_grille", "#3c3d3f", 0.4, metal=0.6))
    emit(k, f"{name}_motor", dark, k.mat("tr_fan_dark", "#2a2a2b", 0.5))
    if lead:
        cable = Mesh()
        sweep(cable, [V((x, 0.012, z)) - f * 0.1, *lead], 0.0035, sides=6, step=0.04)
        emit(k, f"{name}_lead", cable, k.mat("b_cable", "#161616", 0.45))


def _axis_frame(c, f):
    """A placement at `c` whose local z is the direction `f`, local x level
    and local y leaning up."""
    side = V((f.z, 0, -f.x)).normalized()
    return frame(c, side, f.cross(side))
