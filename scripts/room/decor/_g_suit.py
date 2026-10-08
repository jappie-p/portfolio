"""A black leather one-piece race suit on a broad hanger. One smooth hide
(_g_suit_cage, subdivided in _g_suit_hide) in matte black and charcoal
panels, raised welts along every seam, perforated chest panels, accordion
stretch at the lower back and behind the knees, domed shoulder and elbow
armour with hard sliders, knee pucks on velcro, a centre zip with its
puller, wrist and ankle zips, and a white flash down each sleeve.

The suit is turned `turn` degrees from facing the room toward the front
of it, so the aero hump shows in silhouette, and hung so its nearest
point stays `gap` off the wall. Suit axes: x to the suit's left, y up
(site height), z to the front."""

import math

from decor._g_common import Mesh, V, cyl, emit, frame, rbox, sweep
from decor._g_suit_cage import ELBOW, KNEE, Y0, build_cage
from decor._g_suit_hide import DOME_RHOS, PUCK_RHOS, Hide, dome, puck
from decor._g_suit_mats import materials

PANELS = {  # panel: (material, seam group)
    "lining": ("lining", None),
    "collar": ("trim", "collar"),
    "yoke": ("leather", "yoke"),
    "hump": ("alt", "hump"),
    "chest": ("perf", "chest"),
    "back": ("alt", "back"),
    "side": ("alt", "side"),
    "belly": ("leather", "belly"),
    "stretch": ("stretch", None),
    "seat": ("leather", "seat"),
    "shoulder": ("leather", "shoulder"),
    "sleeve": ("leather", "sleeve"),
    "cuff": ("trim", None),
    "inside": ("lining", None),
    "thigh": ("alt", "thigh"),
    "leg": ("leather", "leg"),
}
SLOTS = ["leather", "alt", "perf", "stretch", "trim", "lining"]


def _hide_mesh(hide):
    """The hide as one mesh, a material slot per face, UVs = its front view."""
    m = Mesh()
    slot = {p: SLOTS.index(mat) for p, (mat, _g) in PANELS.items()}
    m.verts = list(hide.verts)
    for f, p in zip(hide.faces, hide.panels):
        m.faces.append(f)
        m.mats.append(slot[p])
        m.uvs.append([(hide.verts[i].x, hide.verts[i].y) for i in f])
    return m


def _zip(hide, parts):
    """The centre zip from the collar's lip to the crotch, its slider and
    a puller with a green grip."""
    line = hide.along([V((0, Y0 + 0.088 - 0.012 * i, 0.4)) for i in range(58)], (0, 0, -1), lift=0.001)
    line = [p for p in line if p.z > 0.02]
    sweep(parts["tape"], line, (0.0012, 0.0078), up=V((1, 0, 0)), sides=4, step=0.02)
    teeth = [p + V((0, 0, 0.0024)) for p in line]
    sweep(parts["zip"], teeth, (0.0014, 0.0026), up=V((1, 0, 0)), sides=4, step=0.016)
    top = line[2] + V((0, 0, 0.005))
    rbox(parts["zip"], frame(top, (0, -1, 0), (0, 0, 1)), (0.024, 0.008, 0.013), 0.003, seg=2)
    hang = V((0, -1, 0.22)).normalized()
    tab = top + V((0, -0.012, 0.004)) + hang * 0.016
    rbox(parts["zip"], frame(tab, hang, (0, 0, 1)), (0.03, 0.0032, 0.011), 0.0015, seg=1)
    rbox(parts["green"], frame(tab + hang * 0.009, hang, (0, 0, 1)), (0.016, 0.0056, 0.0135), 0.0025, seg=2)


def _armour(hide, cage, parts, s):
    """Shoulder and elbow domes with hard sliders on top, and the knee's
    velcro patch with its puck, on side s (+1 the suit's left)."""
    c0, t0, o0, _f0, _ra, _rb = cage.arms[s][0]
    c1 = cage.arms[s][1][0]
    core = c0 * 0.4 + c1 * 0.6
    n = (o0 - t0 * 0.15).normalized()
    lift = hide.patch(parts["armour"], core, n, t0, (0.086, 0.058), dome(0.011), DOME_RHOS, segs=20)
    hide.patch(parts["slider"], core, n, t0, (0.064, 0.019), puck(0.0055, crown=0.0, edge=0.5), PUCK_RHOS, segs=16, base=lift)
    c, t, o, f, _ra, _rb = cage.arms[s][ELBOW]
    n = (o * 0.5 - f * 0.87).normalized()
    lift = hide.patch(parts["armour"], c, n, t, (0.066, 0.05), dome(0.012), DOME_RHOS, segs=20)
    hide.patch(parts["slider"], c, n, t, (0.048, 0.019), puck(0.006, crown=0.0, edge=0.5), PUCK_RHOS, segs=16, base=lift)
    c, t, o, f, _rx, _rz = cage.legs[s][KNEE]
    n = (o + f * 0.35).normalized()
    at = c + t * 0.018
    lift = hide.patch(parts["velcro"], at, n, t, (0.072, 0.056), puck(0.0022, crown=0.0, edge=0.2), PUCK_RHOS[-4:], segs=20)
    hide.patch(parts["puck"], at, n, t, (0.062, 0.047), puck(0.017), PUCK_RHOS, segs=24, base=lift)


def _ribs(hide, cage, parts):
    """Accordion ribs across the waist (front, either side of the zip, and
    the lower back) and behind both knees."""
    ys = [Y0 - 0.37 - 0.0115 * i for i in range(7)]
    for degs in (range(140, 221, 8), range(5, 46, 8), range(-5, -46, -8)):
        dirs = [V((math.sin(a), 0, math.cos(a))) for a in (math.radians(d) for d in degs)]
        hide.ribs(parts["stretch"], lambda y: V((0, y, -0.01)), dirs, ys)
    for s in (1, -1):
        rings = cage.legs[s]
        _c, _t, o, f, _rx, _rz = rings[KNEE]
        dirs = [o * math.sin(a) + f * math.cos(a) for a in (math.radians(d) for d in range(128, 246, 12))]
        ys = [Y0 - 0.945 - 0.0135 * i for i in range(8)]
        hide.ribs(parts["stretch"], lambda y, rings=rings: _axis_at(rings, y), dirs, ys)


def _axis_at(rings, y):
    """The point on a limb's axis at height y."""
    cs = [r[0] for r in rings]
    for a, b in zip(cs, cs[1:]):
        if b.y <= y <= a.y:
            return a.lerp(b, (a.y - y) / (a.y - b.y))
    return cs[-1]


def _limb_line(hide, rings, i0, i1, aim, lift, step=0.015):
    """Surface points down a limb from ring i0 to ring i1, about `step`
    apart, at the angle aim(out, front) round its axis, lifted `lift`, so
    a strip laid on them hugs the leather all the way."""
    pts = []
    for i in range(i0, i1):
        (c, _t, o, f, _a, _b), (c2, _t2, o2, f2, _a2, _b2) = rings[i], rings[i + 1]
        n = max(1, math.ceil((c2 - c).length / step))
        for j in range(n + (i == i1 - 1)):
            u = j / n
            d = aim(o.lerp(o2, u), f.lerp(f2, u)).normalized()
            hit = hide.cast(c.lerp(c2, u) + d * 0.3, -d)
            if hit is not None:
                pts.append(hit + d * lift)
    return pts


def _flash(hide, cage, parts, s):
    """A white flash down the front-outer edge of the sleeve, clear of the
    elbow armour, tapering at both ends."""
    rings = cage.arms[s]
    mid = rings[len(rings) // 2]
    side = V((0, 1, 0)).cross((mid[2] + mid[3]).normalized())
    pts = _limb_line(hide, rings, 1, len(rings) - 1, lambda o, f: o + f, 0.0009)[2:-2]
    n = len(pts) - 1
    width = [(0.0011, 0.0072 * min(1.0, 0.3 + i / 3, 0.3 + (n - i) / 2.5)) for i in range(n + 1)]
    sweep(parts["flash"], pts, width, up=side, sides=4, step=0.018)


def _cuff_zips(hide, cage, parts, s):
    """Short zips up the back of each wrist and the outside of each ankle."""
    for rings, i0, aim in ((cage.arms[s], 4, (0.5, -0.86)), (cage.legs[s], 5, (0.8, -0.6))):
        d = rings[i0][2] * aim[0] + rings[i0][3] * aim[1]
        across = V((0, 1, 0)).cross(d)
        pts = _limb_line(hide, rings, i0, len(rings) - 1, lambda o, f, aim=aim: o * aim[0] + f * aim[1], 0.0012)
        sweep(parts["tape"], pts, (0.0011, 0.0062), up=across, sides=4, step=0.016)
        out = [p + d.normalized() * 0.0016 for p in pts]
        sweep(parts["zip"], out, (0.0011, 0.002), up=across, sides=4, step=0.016)


def _hook(at, hook_y, mat_parts):
    """The hanger's boss in the collar and its steel hook over the wall
    arm, in site axes (the hook swivels square to the arm)."""
    x, z = at.x, at.z
    cyl(mat_parts["boss"], V((x, Y0 - 0.02, z)), V((x, Y0 + 0.022, z)), 0.013, sides=14)
    rod = 0.011 + 0.0042 + 0.003
    arc = [V((x, hook_y + rod * math.sin(a), z + rod * math.cos(a))) for a in (math.radians(d) for d in range(180, -50, -20))]
    stem = [V((x, Y0 + 0.01, z)), V((x, hook_y - 0.05, z)), V((x, hook_y - 0.022, z - rod * 0.7))]
    sweep(mat_parts["hanger"], stem + arc, 0.0042, sides=8, step=0.01)
    rbox(mat_parts["hanger"], frame(arc[-1]), (0.011, 0.011, 0.011), 0.0055, seg=2)


def build_suit(k, name, z, turn, hook_y, wall, gap=0.035):
    """Build the suit centred on site z, turned `turn` degrees toward the
    room's front, hanging from a hook arm at `hook_y`. Returns where it
    hangs (site x, 0, z) and its triangle count."""
    cage = build_cage()
    hide = Hide(cage, list(PANELS))
    mats = materials(k)
    parts = {key: Mesh() for key in ("welt", "armour", "slider", "puck", "velcro", "stretch", "flash", "zip", "tape", "green")}
    for line in hide.seams(lambda p: PANELS[p][1]):
        hide.piping(parts["welt"], line, 0.0022)
    for line in hide.seams(lambda p: p in ("lining", "inside")):
        if hide.verts[line[0]].y > Y0:
            hide.piping(parts["green"], line, 0.003, lift=0.001, sides=6)
    _zip(hide, parts)
    _ribs(hide, cage, parts)
    for s in (1, -1):
        _armour(hide, cage, parts, s)
        _flash(hide, cage, parts, s)
        _cuff_zips(hide, cage, parts, s)
    body = _hide_mesh(hide)
    a = math.radians(turn)
    left, up = V((math.sin(a), 0, math.cos(a))), V((0, 1, 0))
    spin = frame((0, 0, 0), left, up)
    reach = max((spin @ v).x for m in [body, *parts.values()] for v in m.verts)
    at = V((wall - gap - reach, 0.0, z))
    place = frame(at, left, up)
    count = {}
    for key, m in [("hide", body), *parts.items()]:
        mm = [mats[s] for s in SLOTS] if key == "hide" else mats[key]
        count[key] = sum(len(f) - 2 for f in m.faces)
        emit(k, f"{name}_{key}", m.moved(place), mm)
    hook = {"hanger": Mesh(), "boss": Mesh()}
    _hook(at, hook_y, hook)
    for key, m in hook.items():
        count[key] = sum(len(f) - 2 for f in m.faces)
        emit(k, f"{name}_{key}", m, mats[key])
    tris = sum(count.values())
    print(f"  [suit] at x={at.x:.3f} z={at.z:.3f}, reach {reach:.3f}, {tris} triangles {count}")
    return at, tris
