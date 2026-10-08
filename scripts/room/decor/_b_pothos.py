"""The trailing pothos (bible 3.18): a pot with a crown of heart leaves and
vines that arc over the rim, spill over an edge and hang, a leaf every
6 cm. Leaves are real low-poly geometry (folded along the midrib, the tip
curling back), all one mesh per plant, coloured per leaf through a
colour attribute so one material serves the whole plant."""

import math
import random

import bmesh
from mathutils import Vector

from kit import hex_rgb
from space import T

# one half of a pothos leaf: (along the midrib, across), tip at (1, 0)
HALF = [(-0.07, 0.13), (-0.04, 0.27), (0.06, 0.37), (0.2, 0.41), (0.38, 0.38), (0.56, 0.3), (0.73, 0.19), (0.87, 0.09)]
RIB = [0.0, 0.25, 0.5, 0.75, 1.0]
DARK, MID, LIGHT, GOLD = "#2a5c20", "#3f8a30", "#5a9e34", "#a9b83f"
VINE = "#2f6a26"


def _lin(h):
    return Vector(hex_rgb(h)[:3])


def _mix(a, b, t):
    return a.lerp(b, max(0.0, min(1.0, t)))


class Plant:
    """One plant's mesh being built: leaves and vines into one bmesh."""

    def __init__(self, seed):
        self.bm = bmesh.new()
        self.col = self.bm.loops.layers.float_color.new("col")
        self.rng = random.Random(seed)

    def _face(self, verts, colors):
        f = self.bm.faces.new(verts)
        for loop, c in zip(f.loops, colors):
            loop[self.col] = (*c, 1.0)
        return f

    def leaf(self, base, tip_dir, normal, length):
        """A heart leaf from `base` (site point) pointing along `tip_dir`,
        its face toward `normal` (both site vectors)."""
        u = Vector(tip_dir).normalized()
        n = Vector(normal)
        n = (n - u * n.dot(u)).normalized()
        v = n.cross(u)
        base = Vector(base)
        width = length * self.rng.uniform(0.72, 0.85)
        fold = self.rng.uniform(0.18, 0.3)
        curl = self.rng.uniform(0.08, 0.2)
        r = self.rng.random()
        tone = _mix(_lin(DARK), _lin(LIGHT), self.rng.random() ** 0.8)
        if r < 0.35:
            tone = _mix(tone, _lin(GOLD), self.rng.uniform(0.2, 0.45))

        def point(a, b):
            lift = fold * abs(b) - curl * a * a
            p = base + u * (a * length) + v * (b * width) + n * (lift * length)
            return self.bm.verts.new(T(*p))

        rib = [point(a, 0) for a in RIB]
        rib_c = [tone * 1.12] * len(rib)
        for side in (1, -1):
            edge = [point(a, side * b) for a, b in HALF]
            edge_c = [tone * (0.82 + 0.18 * a) for a, _ in HALF]
            if side == 1:
                self._face(rib + edge[::-1], rib_c + edge_c[::-1])
            else:
                self._face(rib[:1] + edge + rib[:0:-1], rib_c[:1] + edge_c + rib_c[:0:-1])

    def tube(self, pts, radius, color, sides=5):
        """A thin stem swept through site points."""
        pts = [Vector(p) for p in pts]
        c = _lin(color)
        rings = []
        for i, p in enumerate(pts):
            t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
            a = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
            x = t.cross(a).normalized()
            y = t.cross(x)
            r = radius * (1 - 0.4 * i / max(1, len(pts) - 1))
            rings.append([self.bm.verts.new(T(*(p + (x * math.cos(s) + y * math.sin(s)) * r))) for s in (2 * math.pi * j / sides for j in range(sides))])
        for r0, r1 in zip(rings, rings[1:]):
            for j in range(sides):
                self._face([r0[j], r0[(j + 1) % sides], r1[(j + 1) % sides], r1[j]], [c] * 4)

    def finish(self, k, name, material):
        bmesh.ops.triangulate(self.bm, faces=[f for f in self.bm.faces if len(f.verts) > 4])
        obj = k._mesh_obj(name, self.bm)
        return k.finish(obj, material)


def leaf_material(k):
    """Leaves and vines: their colour from the 'col' attribute."""
    if "b_pothos" in k.mats:
        return k.mats["b_pothos"]
    m = k.mat("b_pothos", MID, 0.45)
    nt = m.node_tree
    attr = nt.nodes.new("ShaderNodeAttribute")
    attr.attribute_name = "col"
    nt.links.new(attr.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"])
    return m


def _bezier(p0, p1, p2, n):
    return [p0 * (1 - t) ** 2 + p1 * 2 * t * (1 - t) + p2 * t * t for t in (i / n for i in range(n + 1))]


def _vine_path(rng, rim, drop, hang, out):
    """From the rim, arcing over to the drop point, then hanging `hang`
    metres with a gentle sway, bowing out along `out` (a site vector)."""
    rim, drop = Vector(rim), Vector(drop)
    lift = (rim + drop) / 2 + Vector((0, 0.025 + rng.uniform(0, 0.02), 0))
    pts = _bezier(rim, lift, drop, 5)
    phase, amp = rng.uniform(0, 6.28), rng.uniform(0.01, 0.03)
    side = Vector((out.z, 0, -out.x)) if abs(out.x) + abs(out.z) > 0 else Vector((1, 0, 0))
    steps = max(2, int(hang / 0.025))
    for i in range(1, steps + 1):
        s = hang * i / steps
        bow = 0.018 * math.sin(math.pi * min(1.0, s / hang) * 0.8) + 0.004
        sway = amp * math.sin(s * 9 + phase) * (s / hang)
        pts.append(drop + Vector((0, -s, 0)) + out * bow + side * sway)
    return pts


def _leaves_along(plant, pts, out, size=(0.08, 0.05), every=0.06):
    """A leaf every `every` metres along the vine, alternating sides,
    smaller toward the tip, facing out and a little up."""
    rng = plant.rng
    total = sum((b - a).length for a, b in zip(pts, pts[1:]))
    side = Vector((out.z, 0, -out.x)) if abs(out.x) + abs(out.z) > 0 else Vector((1, 0, 0))
    run, nxt, flip = 0.0, rng.uniform(0.02, 0.05), 1
    for a, b in zip(pts, pts[1:]):
        seg = (b - a).length
        while run + seg >= nxt:
            t = (nxt - run) / seg
            p = a.lerp(b, t)
            tangent = (b - a).normalized()
            frac = nxt / total
            length = size[0] + (size[1] - size[0]) * frac + rng.uniform(-0.008, 0.008)
            hanging = tangent.y < -0.5
            if hanging:
                tip = side * flip * 0.75 + Vector((0, -0.6, 0)) + out * 0.35
                normal = out + Vector((0, 0.45, 0))
            else:
                tip = side * flip * 0.6 + out * 0.6 + Vector((0, 0.35, 0))
                normal = Vector((0, 1, 0)) + out * 0.4
            tip += Vector((rng.uniform(-0.25, 0.25), rng.uniform(-0.2, 0.2), rng.uniform(-0.15, 0.15)))
            normal += Vector((rng.uniform(-0.3, 0.3), rng.uniform(-0.2, 0.2), rng.uniform(-0.2, 0.2)))
            stalk = p + side * flip * 0.012 + out * 0.008
            plant.tube([p, stalk], 0.0012, VINE, sides=3)
            plant.leaf(stalk, tip, normal, length)
            flip = -flip
            nxt += every * rng.uniform(0.85, 1.15)
        run += seg


def _crown(plant, centre, top, radius, count, out):
    """Leaves standing up out of the soil on short stems."""
    rng = plant.rng
    for i in range(count):
        a = 2 * math.pi * (i + rng.random() * 0.5) / count
        d = Vector((math.cos(a), 0, math.sin(a)))
        base = Vector(centre) + d * radius * rng.uniform(0.1, 0.6) + Vector((0, top - centre[1], 0))
        head = base + d * rng.uniform(0.02, 0.05) + Vector((0, rng.uniform(0.03, 0.09), 0))
        plant.tube([base, (base + head) / 2 + Vector((0, 0.01, 0)), head], 0.0018, VINE, sides=3)
        facing = (d + out * 0.6).normalized()
        plant.leaf(head, facing * 0.8 + Vector((0, 0.5, 0)), Vector((0, 1, 0)) + facing * 0.5, rng.uniform(0.06, 0.085))


def pot(k, name, at, r=0.07, h=0.1, color="#ebe4d6", hanging=False):
    """A ceramic pot standing on `at` with a rim and dark soil."""
    mat = k.mat(f"b_pot_{color.lstrip('#')}", color, 0.42, noise=30, mottle=0.05)
    x, y, z = at
    bottom = r * (0.55 if hanging else 0.82)
    body = k.cylinder(name, r, h, at, mat, 0.004, verts=28, radius2=None)
    body.data.vertices.foreach_set("co", [c for v in body.data.vertices for c in _taper(v.co, y, h, bottom / r)])
    k.cylinder(name + "_rim", r + 0.004, 0.014, (x, y + h - 0.014, z), mat, 0.003, verts=28)
    k.cylinder(name + "_soil", r - 0.006, 0.004, (x, y + h - 0.016, z), k.mat("b_soil", "#3a2a1e", 0.95, noise=200, mottle=0.3), 0.0, verts=20)
    return body


def _taper(co, y0, h, ratio):
    """Narrow a cylinder's vertices toward its bottom (local, Blender z up)."""
    t = co.z / h
    s = ratio + (1 - ratio) * t
    return (co.x * s, co.y * s, co.z)


def pothos(k, name, at, drops, hangs, seed=1, r=0.07, h=0.1, pot_color="#ebe4d6", crown=10, hanging=False):
    """A pothos in a pot standing on `at`. Each vine goes over the edge at
    one of `drops` (site points) and hangs the matching length in `hangs`."""
    pot(k, f"{name}_pot", at, r, h, pot_color, hanging)
    plant = Plant(seed)
    rng = plant.rng
    x, y, z = at
    top = y + h - 0.012
    centre = Vector((x, y, z))
    for drop, hang in zip(drops, hangs):
        drop = Vector(drop)
        flat = Vector((drop.x - x, 0, drop.z - z))
        out = flat.normalized() if flat.length > 1e-4 else Vector((0, 0, 1))
        rim = centre + out * (r * 0.8) + Vector((0, h + 0.002, 0))
        pts = _vine_path(rng, rim, drop, hang, out)
        plant.tube(pts, 0.0028, VINE)
        _leaves_along(plant, pts, out)
    _crown(plant, (x, y, z), top, r, crown, Vector((0, 0, 1)))
    return plant.finish(k, f"{name}_leaves", leaf_material(k))
