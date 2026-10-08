"""The groei board's medals (bible 3.16): a bronze-gold disc with a raised
rim, a dark recessed face and a raised line icon, hung from a V of green
ribbon pinned to the board."""

import math

import bmesh

from decor._b_util import brass, disc
from space import T

GOLD = "#b78a45"


def gold(k):
    return k.mat("b_medal_gold", GOLD, 0.35, metal=1.0)


def ring(k, name, centre, radius, thick, material, points=24):
    """A closed round wire (a torus) facing +z."""
    cx, cy, cz = centre
    pts = [(cx + radius * math.cos(a), cy + radius * math.sin(a), cz) for a in (2 * math.pi * i / points for i in range(points))]
    obj = k.tube(name, pts, thick, material, closed=True)
    obj.data.resolution_u = 2
    obj.data.bevel_resolution = 1
    return obj


def polyline(k, name, strokes, width, depth, at, material):
    """Raised strokes (lists of (x, y) relative to `at`) as one mesh: each
    segment a small box, overlapping at the joints like a drawn line."""
    bm = bmesh.new()
    x0, y0, z0 = at
    for pts in strokes:
        for (ax, ay), (bx, by) in zip(pts, pts[1:]):
            dx, dy = bx - ax, by - ay
            n = math.hypot(dx, dy) or 1.0
            ux, uy = dx / n, dy / n
            px, py = -uy * width / 2, ux * width / 2
            e = width / 2
            quad = [(ax - ux * e + px, ay - uy * e + py), (bx + ux * e + px, by + uy * e + py), (bx + ux * e - px, by + uy * e - py), (ax - ux * e - px, ay - uy * e - py)]
            lo = [bm.verts.new(T(x0 + x, y0 + y, z0)) for x, y in quad]
            hi = [bm.verts.new(T(x0 + x, y0 + y, z0 + depth)) for x, y in quad]
            bm.faces.new(hi[::-1])
            for i in range(4):
                bm.faces.new([lo[i], lo[(i + 1) % 4], hi[(i + 1) % 4], hi[i]])
    obj = k._mesh_obj(name, bm)
    return k.finish(obj, material, smooth=False)


def _rect(w, h, cx, cy, c):
    """A rounded rectangle outline (chamfered corners)."""
    l, r, b, t = cx - w / 2, cx + w / 2, cy - h / 2, cy + h / 2
    return [(l + c, t), (r - c, t), (r, t - c), (r, b + c), (r - c, b), (l + c, b), (l, b + c), (l, t - c), (l + c, t)]


def _arc(a, b, bulge, n=8):
    """Points from a to b bowed sideways by `bulge`."""
    (ax, ay), (bx, by) = a, b
    dx, dy = bx - ax, by - ay
    nx, ny = -dy, dx
    return [(ax + dx * t + nx * bulge * math.sin(math.pi * t), ay + dy * t + ny * bulge * math.sin(math.pi * t)) for t in (i / n for i in range(n + 1))]


ICONS = {
    # a presentation screen on a little stand
    "screen": [_rect(0.05, 0.035, 0, 0.006, 0.004), [(0, -0.0115), (0, -0.019)], [(-0.01, -0.0195), (0.01, -0.0195)]],
    # two peaks with a snow line (the sun is a dot, added below)
    "peaks": [[(-0.032, -0.018), (-0.013, 0.014), (-0.003, -0.001), (0.011, 0.02), (0.032, -0.018)], [(-0.019, 0.004), (-0.013, 0.0), (-0.008, 0.005)]],
    # a leaf with its midrib and stem
    "leaf": [_arc((-0.018, -0.018), (0.022, 0.024), 0.32), _arc((-0.018, -0.018), (0.022, 0.024), -0.32), [(-0.028, -0.028), (0.012, 0.013)]],
}


def medal(k, name, centre, icon):
    """A medal hanging with its centre at `centre` (its back on the
    ribbon), the face toward +z."""
    x, y, z = centre
    g = gold(k)
    r, t = 0.062, 0.006
    disc(k, f"{name}_disc", r, t, (x, y, z), g, bevel=0.003)
    front = z + t
    ring(k, f"{name}_rim", (x, y, front), 0.0565, 0.0028, g)
    disc(k, f"{name}_face", 0.05, 0.0008, (x, y, front - 0.0003), k.mat("b_medal_recess", "#4a3a22", 0.5, metal=0.3), bevel=0.0)
    polyline(k, f"{name}_icon", ICONS[icon], 0.0032, 0.0016, (x, y, front + 0.0004), g)
    if icon == "peaks":
        disc(k, f"{name}_sun", 0.0055, 0.0016, (x + 0.022, y + 0.022, front + 0.0004), g, bevel=0.0005)
    # the loop at the top that the ribbon runs through
    ring(k, f"{name}_loop", (x, y + r + 0.006, z + t / 2), 0.0075, 0.0018, g, points=12)


def ribbon(k, name, x, top, bottom, front, spread=0.035, width=0.03):
    """A V of green ribbon: two straps pinned at `top`, meeting at
    `bottom`, the right strap over the left."""
    mat = k.mat("b_ribbon", "#1f4a32", 0.8, sheen=0.4, bump=0.12, bump_scale=1400)
    fold = k.mat("b_ribbon_fold", "#183b28", 0.85, sheen=0.4)
    for i, side in enumerate((-1, 1)):
        length = math.hypot(spread, top - bottom)
        angle = -side * math.degrees(math.atan2(spread, top - bottom))
        cx, cy = x + side * spread / 2, (top + bottom) / 2 - 0.004
        zc = front + 0.0009 + i * 0.0016
        k.box(f"{name}_strap{i}", (width, length + 0.016, 0.0014), (cx, cy, zc), mat, bevel=0.0005, rot=(0, 0, angle))
        tx = x + side * spread
        k.box(f"{name}_fold{i}", (width * 1.02, 0.01, 0.0014), (tx, top - 0.002, zc + 0.0012), fold, bevel=0.0005, rot=(0, 0, angle))
        disc(k, f"{name}_pin{i}", 0.0042, 0.003, (tx, top - 0.002, zc + 0.0018), brass(k), bevel=0.0012, verts=12)
