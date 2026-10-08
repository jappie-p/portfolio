"""Two helmets: the vented MTB half-shell (bible 3.31) and the full-face
motorbike helmet (3.33). Each shell is a thick skin over a parameter grid:
a glossy outside, foam or fabric inside, and holes (vents, the eye port,
the neck) cut by leaving cells out. Helmet axes: x to the front (visor), y
up through the crown, z to its left."""

import math

from decor._c_geo import Mesh, V, cyl, emit, frame, loft, rbox, sweep, to_blender


def shell(mesh, P, ni, nj, keep, thick, centre, wrap=False, mats=(0, 1)):
    """A shell of thickness `thick` over the grid P(i, j) -> outer point,
    cells (i, j) kept where keep(i, j). The inside is pulled toward
    `centre`; cut edges get walls. Outer faces take mats[0], the rest
    mats[1]."""
    weld, verts = {}, []

    def vid(i, j, side):
        if wrap:
            j %= nj
        p = V(P(i, j))
        if side:
            p = centre + (p - centre) * (1 - thick / max((p - centre).length, 1e-6))
        key = (round(p.x, 6), round(p.y, 6), round(p.z, 6), side)
        if key not in weld:
            weld[key] = len(verts)
            verts.append(p)
        return weld[key]

    cells = {(i, j) for i in range(ni) for j in range(nj) if keep(i, j)}

    def solid(i, j):
        if wrap:
            j %= nj
        return (i, j) in cells

    outer, rest = [], []
    for i, j in cells:
        c = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
        outer.append([vid(a, b, 0) for a, b in c])
        rest.append([vid(a, b, 1) for a, b in reversed(c)])
        for (a, b), (a2, b2), (ni_, nj_) in zip(c, c[1:] + c[:1], ((i, j - 1), (i + 1, j), (i, j + 1), (i - 1, j))):
            if not solid(ni_, nj_):
                rest.append([vid(a, b, 0), vid(a, b, 1), vid(a2, b2, 1), vid(a2, b2, 0)])
    o = len(mesh.verts)
    mesh.verts += verts
    for faces, mat in ((outer, mats[0]), (rest, mats[1])):
        for f in faces:
            f = [x for n, x in enumerate(f) if x != f[n - 1]]
            if len(f) >= 3:
                mesh.faces.append(tuple(o + x for x in f))
                mesh.mats.append(mat)
                mesh.uvs.append(None)


def _ribbon(mesh, P, ni, nj, lift, centre, mat=0):
    """A thin strip over a grid P(i, j) (a stripe on a shell), lifted off
    the surface by `lift`."""
    def at(i, j):
        p = V(P(i, j))
        return centre + (p - centre) * (1 + lift / (p - centre).length)

    rings = [[at(i, j) for j in range(nj + 1)] for i in range(ni + 1)]
    loft(mesh, rings, mat, caps=(False, False), closed=False)


def wall_hook(mesh, base, out, rise, plate_normal, r=0.009):
    """A black J-hook: a plate on the wall at `base`, an arm reaching `out`
    (a site vector) and turning up by `rise`."""
    base, out = V(base), V(out)
    n = V(plate_normal)
    up = V((0, 1, 0))
    tip = base + out
    rbox(mesh, frame(base + n * 0.005, up, n), (0.09, 0.01, 0.04), 0.004, seg=1)
    sweep(mesh, [base + n * 0.008, base + out * 0.55, tip - out.normalized() * 0.02 + up * 0.004, tip + up * rise], r, sides=10, step=0.012)


# -- MTB half-shell ---------------------------------------------------------


def mtb_helmet(k, name, at, front=(-0.55, -0.2, 0.8), up=(0.3, 0.92, 0.25)):
    """The black half-shell with ten vents, a peak and its straps,
    centred at `at` (site), its visor along `front`."""
    A, B, C = 0.13, 0.128, 0.11
    t0, t1, nt, ns = 0.3, 2.95, 34, 30

    def smax(t):
        f = max(0.0, min(1.0, (t - 1.9) / 1.0))
        return 1.48 + 0.42 * f * f * (3 - 2 * f)

    def P(i, j):
        t = t0 + (t1 - t0) * i / nt
        s = smax(t) * (-1 + 2 * j / ns)
        x = A * math.cos(t) * (1 + 0.08 * max(0.0, -math.cos(t)))
        return (x, B * math.sin(t) * math.cos(s) - 0.012, C * math.sin(t) * math.sin(s))

    cols = (-0.64, -0.32, 0.0, 0.32, 0.64)
    rows = ((0.62, 1.22), (1.46, 2.32))

    def keep(i, j):
        t = t0 + (t1 - t0) * (i + 0.5) / nt
        sg = -1 + 2 * (j + 0.5) / ns
        for a, b in rows:
            if a < t < b:
                w = 0.07 if a < 1 else 0.06
                if any(abs(sg - c) < w for c in cols):
                    return False
        return True

    m = Mesh()
    shell(m, P, nt, ns, keep, 0.022, V((0, -0.02, 0)))
    # the peak over the forehead
    def peak(i, j):
        s = 0.62 * (-1 + 2 * j / 16)
        t = t0 + 0.02
        p = V((A * math.cos(t), B * math.sin(t) * math.cos(s) - 0.012, C * math.sin(t) * math.sin(s)))
        return p + V((0.045, -0.006 - 0.012 * abs(s), 0)) * (i / 2)

    shell(m, peak, 2, 16, lambda i, j: True, 0.004, V((0, 0.0, 0)), mats=(0, 0))
    # straps down from both sides to the buckle, the rear dial
    gear = Mesh()
    for side in (1, -1):
        fa = V((0.06, -0.02, side * 0.095))
        ra = V((-0.07, -0.035, side * 0.098))
        y = V((0.0, -0.1, side * 0.07))
        sweep(gear, [fa, fa + V((-0.02, -0.04, side * 0.004)), y], (0.008, 0.0012), up=V((0, 0, 1)), sides=6, step=0.01)
        sweep(gear, [ra, ra + V((0.02, -0.04, -side * 0.004)), y], (0.008, 0.0012), up=V((0, 0, 1)), sides=6, step=0.01)
        sweep(gear, [y, V((0.01, -0.16, side * 0.03))], (0.008, 0.0012), up=V((0, 0, 1)), sides=6, step=0.01)
    rbox(gear, frame(V((0.01, -0.17, 0)), (1, 0, 0), (0, 1, 0)), (0.03, 0.022, 0.07), 0.006, seg=1)
    cyl(gear, V((-0.13, -0.03, 0)), V((-0.145, -0.03, 0)), 0.018, sides=16)
    place = frame(at, front, up)
    black = k.mat("mtb_helmet_shell", "#1a1a1a", 0.25, coat=0.6)
    foam = k.mat("mtb_helmet_foam", "#2c2a27", 0.85)
    strap = k.mat("helmet_strap", "#151515", 0.9)
    emit(k, name, m.moved(place), [black, foam])
    emit(k, name + "_straps", gear.moved(place), strap)


# -- full-face motorbike helmet ---------------------------------------------


def moto_helmet(k, name, at, front, up):
    """Deep black full-face shell with a smoked visor, chin vents, a green
    crown stripe between cream pinstripes, and a small JP at the back.
    The eye port's edges and the neck line run along grid lines, so every
    cut edge is a clean curve."""
    A, B, C = 0.168, 0.15, 0.13
    pu, lo, hi = 0.95, -0.2, 0.34
    nf, nb, n1, n2, n3 = 18, 42, 7, 8, 11
    cols = [-pu + 2 * pu * j / nf for j in range(nf)] + [pu + (math.tau - 2 * pu) * j / nb for j in range(nb)]
    nu = len(cols)

    def raw(u, v):
        cu, su, cv, sv = math.cos(u), math.sin(u), math.cos(v), math.sin(v)
        chin = max(0.0, -sv) * max(0.0, cu) ** 2
        nape = max(0.0, -sv) * max(0.0, -cu)
        x = A * cv * cu + 0.05 * chin**0.8 - 0.012 * nape
        y = B * sv * (0.97 if sv > 0.6 else 1.0) - 0.012 * chin
        z = C * cv * su * (1 - 0.14 * chin)
        return V((x, y, z))

    def neck(u):
        return -0.72 - 0.26 * max(0.0, -math.cos(u)) - 0.05 * abs(math.sin(u))

    def row(i, u):
        if i <= n1:
            return neck(u) + (lo - neck(u)) * i / n1
        if i <= n1 + n2:
            return lo + (hi - lo) * (i - n1) / n2
        return hi + (math.pi / 2 - hi) * (i - n1 - n2) / n3

    def P(i, j):
        u = cols[j % nu]
        return raw(u, row(i, u))

    m = Mesh()
    shell(m, P, n1 + n2 + n3, nu, lambda i, j: not (j < nf and n1 <= i < n1 + n2), 0.03, V((0, -0.01, 0)), wrap=True)
    # visor: a thin smoked sheet just proud of the shell over the port
    vis = Mesh()
    shell(vis, lambda i, j: raw(-1.06 + 2.12 * j / 24, lo - 0.07 + (hi - lo + 0.15) * i / 10) * 1.028, 10, 24, lambda i, j: True, 0.003, V((0, -0.01, 0)), mats=(0, 0))
    trim = Mesh()
    for s in (1, -1):
        p = raw(s * 1.14, 0.06) * 1.03
        cyl(trim, p * 0.995, p * 1.05, 0.018, sides=16)
    for v in (-0.34, -0.43, -0.52):
        p = raw(0.0, v)
        rbox(trim, frame(p, (0, 1, 0), (1, -0.4, 0)), (0.008, 0.008, 0.06), 0.003, seg=1)
    rbox(trim, frame(raw(0.0, 0.6) * 1.01, (0.45, 1, 0), (1, -0.45, 0)), (0.055, 0.012, 0.032), 0.005, seg=1)
    rbox(trim, frame(raw(math.pi, 0.12) * 1.01, (0, 1, 0), (-1, 0, 0)), (0.02, 0.014, 0.12), 0.006, seg=1)
    # crown stripe and pinstripes, over the top from the brow to the back
    stripes = Mesh()

    def band(z0, z1):
        def Q(i, j):
            th = 0.5 + (math.pi + 0.45 - 0.5) * i / 40
            z = z0 + (z1 - z0) * j
            kk = math.sqrt(max(0.0, 1 - (z / C) ** 2))
            return (A * kk * math.cos(th), B * kk * math.sin(th) * (0.97 if math.sin(th) > 0.6 else 1.0), z)
        return Q

    _ribbon(stripes, band(-0.026, 0.026), 40, 1, 0.0012, V((0, 0, 0)), 0)
    for z0 in (0.031, -0.035):
        _ribbon(stripes, band(z0, z0 + 0.004), 40, 1, 0.0012, V((0, 0, 0)), 1)
    place = frame(at, front, up)
    shell_m = k.mat("moto_shell", "#121212", 0.12, coat=1.0, coat_rough=0.03)
    lining = k.mat("moto_lining", "#3a3a3a", 1.0, bump=0.3, bump_scale=300)
    visor = k.mat("moto_visor", "#1a1c1e", 0.02, transmission=0.7)
    grey = k.mat("moto_trim", "#2b2b2b", 0.4)
    green = k.mat("brand_green", "#1f4a32", 0.35, coat=0.6)
    cream = k.mat("bk_cream", "#efe6d2", 0.5)
    emit(k, name, m.moved(place), [shell_m, lining])
    emit(k, name + "_visor", vis.moved(place), visor)
    emit(k, name + "_trim", trim.moved(place), grey)
    emit(k, name + "_stripes", stripes.moved(place), [green, cream])
    # a small silver JP on the back quarter that faces the room
    p = raw(-2.3, 0.02) * 1.004
    d = (raw(-2.35, 0.02) - raw(-2.25, 0.02)).normalized()
    t = k.text(name + "_jp", "JP", 0.032, (0, 0, 0), k.mat("moto_silver", "#c4c4c4", 0.3, metal=1.0), extrude=0.0006)
    t.data.resolution_u = 3
    t.matrix_world = to_blender(place @ frame(p, d, p.normalized()))
    return place
