"""A vented road helmet: a long, smooth teardrop shell with big slot vents
front to back, a cream centre stripe, and straps. Same axes as the MTB
helmet in _c_helmets: x to the front, y up through the crown, z to its
left."""

import math

from decor._c_geo import Mesh, V, cyl, emit, frame, rbox, sweep
from decor._c_helmets import _ribbon, shell


def road_helmet(k, name, at, front=(-0.55, -0.2, 0.8), up=(0.3, 0.92, 0.25)):
    """The helmet centred at `at` (site), its nose along `front`."""
    A, B, C = 0.155, 0.11, 0.1
    t0, t1, nt, ns = 0.25, 2.95, 40, 32

    def smax(t):
        f = max(0.0, min(1.0, (t - 2.0) / 0.9))
        return 1.5 + 0.35 * f * f * (3 - 2 * f)

    def P(i, j):
        t = t0 + (t1 - t0) * i / nt
        s = smax(t) * (-1 + 2 * j / ns)
        taper = 1 - 0.28 * max(0.0, -math.cos(t))  # the tail narrows
        x = A * math.cos(t)
        return (x, B * math.sin(t) * math.cos(s) - 0.01, C * taper * math.sin(t) * math.sin(s))

    # three long slots each side of the crown, two short ones at the front
    cols = (-0.62, -0.31, 0.31, 0.62)

    def keep(i, j):
        t = t0 + (t1 - t0) * (i + 0.5) / nt
        sg = -1 + 2 * (j + 0.5) / ns
        if 0.5 < t < 2.5 and any(abs(sg - c) < 0.06 for c in cols):
            return False
        return not (0.7 < t < 2.3 and abs(sg) < 0.05)

    m, stripe, gear = Mesh(), Mesh(), Mesh()
    centre = V((0, -0.02, 0))
    shell(m, P, nt, ns, keep, 0.02, centre)

    def mid(i, j):
        return P(i, ns // 2 - 1 + 2 * j / 2)

    _ribbon(stripe, lambda i, j: P(i, ns // 2 - 1 + j), nt, 2, 0.001, centre)
    for side in (1, -1):
        fa = V((0.07, -0.02, side * 0.085))
        ra = V((-0.08, -0.03, side * 0.08))
        y = V((0.0, -0.1, side * 0.06))
        for a in (fa, ra):
            sweep(gear, [a, a + V((0.0, -0.04, side * 0.004)), y], (0.007, 0.0012), up=V((0, 0, 1)), sides=6, step=0.01)
        sweep(gear, [y, V((0.01, -0.15, side * 0.028))], (0.007, 0.0012), up=V((0, 0, 1)), sides=6, step=0.01)
    rbox(gear, frame(V((0.01, -0.16, 0)), (1, 0, 0), (0, 1, 0)), (0.028, 0.02, 0.06), 0.006, seg=1)
    cyl(gear, V((-0.15, -0.03, 0)), V((-0.165, -0.03, 0)), 0.016, sides=16)
    place = frame(at, front, up)
    shell_mat = k.mat("road_helmet_shell", "#171717", 0.2, coat=0.8)
    foam = k.mat("road_helmet_foam", "#2c2a27", 0.85)
    cream = k.mat("road_helmet_stripe", "#efe6d2", 0.4)
    strap = k.mat("helmet_strap", "#151515", 0.9)
    emit(k, name, m.moved(place), [shell_mat, foam])
    emit(k, name + "_stripe", stripe.moved(place), cream)
    emit(k, name + "_straps", gear.moved(place), strap)
