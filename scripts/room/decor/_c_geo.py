"""Builder C's geometry: meshes made from raw vertices in site metres (x
along, y up, z toward you) for the shapes the kit's boxes and tubes can't
make. Tubes with a changing, oval cross-section, revolved profiles, lofts,
flat parts with holes and teeth. Parts gather in a `Mesh` per material
group and become one object each, so a bike is a few dozen objects, not a
few thousand."""

import math

import bmesh
import bpy
from mathutils import Matrix, Vector

from space import T

V = Vector
TAU = math.tau

# site axes to Blender axes (as in kit.py), for whole placements
_C = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))


# -- placements ------------------------------------------------------------


def basis(x, y):
    """A 3x3 site rotation whose local x and y point along `x` and `y`
    (y is straightened against x; z = x cross y)."""
    x = V(x).normalized()
    y = V(y)
    y = (y - x * y.dot(x)).normalized()
    return Matrix((x, y, x.cross(y))).transposed()


def frame(at=(0, 0, 0), x=(1, 0, 0), y=(0, 1, 0)):
    """A 4x4 site placement: origin `at`, local axes from `basis`."""
    m = basis(x, y).to_4x4()
    m.translation = V(at)
    return m


def to_blender(m):
    """A 4x4 site placement as a Blender matrix_world."""
    b = (_C @ m.to_3x3() @ _C.inverted()).to_4x4()
    b.translation = T(*m.translation)
    return b


# -- the mesh accumulator --------------------------------------------------


class Mesh:
    """Vertices (site metres), faces, a material slot per face and an
    optional UV per face corner."""

    def __init__(self):
        self.verts, self.faces, self.mats, self.uvs = [], [], [], []

    def add(self, verts, faces, mat=0, uvs=None):
        o = len(self.verts)
        self.verts += [V(v) for v in verts]
        for i, f in enumerate(faces):
            self.faces.append(tuple(o + j for j in f))
            self.mats.append(mat)
            self.uvs.append(uvs[i] if uvs else None)
        return o

    def moved(self, m):
        self.verts = [m @ v for v in self.verts]
        return self


class Parts(dict):
    """Meshes by material key, made on first use: parts["rubber"]."""

    def __missing__(self, key):
        self[key] = Mesh()
        return self[key]


def emit_parts(k, name, parts, mats, parent=None, sharp=40):
    """One object per material key in `parts` (named name_key)."""
    return [emit(k, f"{name}_{key}", mesh, mats[key], sharp, parent) for key, mesh in parts.items() if mesh.faces]


def emit(k, name, mesh, mats, sharp=40, parent=None, recalc=True):
    """Turn a Mesh into an object in the active collection. Edges sharper
    than `sharp` degrees stay hard, the rest is shaded smooth. `recalc`
    turns every closed part's faces outward (the site culls back faces)."""
    if not mesh.faces:
        return None
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(T(*v)) for v in mesh.verts], [], mesh.faces)
    for m in mats if isinstance(mats, (list, tuple)) else [mats]:
        me.materials.append(m)
    me.polygons.foreach_set("material_index", mesh.mats)
    if any(u is not None for u in mesh.uvs):
        layer = me.uv_layers.new(name="UVMap")
        for poly, uv in zip(me.polygons, mesh.uvs):
            for li, c in zip(poly.loop_indices, uv or [(0, 0)] * poly.loop_total):
                layer.data[li].uv = c
    me.validate(clean_customdata=False)
    if recalc:
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
    me.shade_smooth()
    if sharp:
        me.set_sharp_from_angle(angle=math.radians(sharp))
    me.update()
    obj = bpy.data.objects.new(name, me)
    k.link(obj)
    if parent is not None:
        obj.parent = parent
    return obj


# -- paths -----------------------------------------------------------------


def smooth(points, radii=None, step=0.02):
    """A Catmull-Rom path through `points`, about `step` apart, with any
    per-point values in `radii` (numbers or tuples) blended along it."""
    pts = [V(p) for p in points]
    vals = radii if radii is not None else [0.0] * len(pts)
    if len(pts) == 2:
        n = max(1, math.ceil((pts[1] - pts[0]).length / step))
        out = [pts[0].lerp(pts[1], i / n) for i in range(n + 1)]
        return out, [_mix(vals[0], vals[1], i / n) for i in range(n + 1)]
    ext = [pts[0] * 2 - pts[1]] + pts + [pts[-1] * 2 - pts[-2]]
    out, rad = [], []
    for i in range(len(pts) - 1):
        p0, p1, p2, p3 = ext[i : i + 4]
        n = max(1, math.ceil((p2 - p1).length / step))
        for s in range(n):
            t = s / n
            out.append(_catmull(p0, p1, p2, p3, t))
            rad.append(_mix(vals[i], vals[i + 1], t))
    out.append(pts[-1])
    rad.append(vals[-1])
    return out, rad


def _catmull(p0, p1, p2, p3, t):
    t2, t3 = t * t, t * t * t
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)


def _mix(a, b, t):
    if isinstance(a, (tuple, list)):
        return tuple(x + (y - x) * t for x, y in zip(a, b))
    return a + (b - a) * t


def _frames(pts, up):
    """A (tangent, side, normal) frame per point: `side` follows `up` when
    given (so an oval tube keeps its tall side in the bike's plane), else
    is carried along the path without twisting."""
    n = len(pts)
    tans = []
    for i in range(n):
        a, b = pts[max(i - 1, 0)], pts[min(i + 1, n - 1)]
        tans.append((b - a).normalized())
    out = []
    prev = None
    for t in tans:
        if up is not None:
            s = V(up) - t * V(up).dot(t)
            if s.length < 1e-5:
                s = prev if prev is not None else t.orthogonal()
        elif prev is None:
            s = t.orthogonal()
        else:
            s = prev - t * prev.dot(t)
        s.normalize()
        out.append((t, s, t.cross(s)))
        prev = s
    return out


def sweep(mesh, points, radius, mat=0, sides=12, up=None, caps=True, step=0.02, smooth_path=True):
    """A tube along `points`. `radius` is one number, an (a, b) pair or a
    list of either per point: a is the half-height across the path in the
    plane `up` is normal to, b the half-width along `up`."""
    ctrl = list(points)
    rad = radius if isinstance(radius, list) else [radius] * len(ctrl)
    rad = [(r, r) if not isinstance(r, (tuple, list)) else tuple(r) for r in rad]
    if smooth_path:
        pts, rad = smooth(ctrl, rad, step)
    else:
        pts = [V(p) for p in ctrl]
    frames = _frames(pts, up)
    verts, faces = [], []
    for p, (a, b), (_t, s, nrm) in zip(pts, rad, frames):
        for j in range(sides):
            th = TAU * j / sides
            verts.append(p + nrm * (a * math.cos(th)) + s * (b * math.sin(th)))
    for i in range(len(pts) - 1):
        for j in range(sides):
            j2 = (j + 1) % sides
            faces.append((i * sides + j, i * sides + j2, (i + 1) * sides + j2, (i + 1) * sides + j))
    if caps:
        faces.append(tuple(reversed(range(sides))))
        last = (len(pts) - 1) * sides
        faces.append(tuple(last + j for j in range(sides)))
    mesh.add(verts, faces, mat)
    return pts


def cyl(mesh, a, b, r, mat=0, sides=12, caps=True):
    """A straight round rod from a to b."""
    return sweep(mesh, [a, b], r, mat, sides, caps=caps, smooth_path=False)


def helix(center, axis, radius, length, turns, steps_per_turn=16):
    """Points of a coil spring around `axis` from `center`."""
    ax = V(axis).normalized()
    u = ax.orthogonal().normalized()
    w = ax.cross(u)
    n = int(turns * steps_per_turn)
    return [V(center) + ax * (length * i / n) + (u * math.cos(TAU * turns * i / n) + w * math.sin(TAU * turns * i / n)) * radius for i in range(n + 1)]


# -- revolved, lofted and flat shapes ---------------------------------------


def revolve(mesh, profile, m, segs=48, mat=0, closed=False, mats=None):
    """Spin a profile of (r, h) points around local z of the placement `m`
    (a 4x4 site matrix). `closed` joins the last profile point to the
    first. `mats` gives a material per profile segment."""
    verts, faces, fm = [], [], []
    n = len(profile)
    for s in range(segs):
        a = TAU * s / segs
        c, sn = math.cos(a), math.sin(a)
        for r, h in profile:
            verts.append(m @ V((r * c, r * sn, h)))
    spans = n if closed else n - 1
    for s in range(segs):
        s2 = (s + 1) % segs
        for i in range(spans):
            i2 = (i + 1) % n
            faces.append((s * n + i, s2 * n + i, s2 * n + i2, s * n + i2))
            fm.append(mats[i] if mats else mat)
    o = len(mesh.verts)
    mesh.verts += verts
    for f, mi in zip(faces, fm):
        mesh.faces.append(tuple(o + j for j in f))
        mesh.mats.append(mi)
        mesh.uvs.append(None)


def disc(mesh, m, r, thick, mat=0, segs=32, r_in=0.0):
    """A flat disc (or washer) of thickness `thick` centred on placement
    `m`, its faces normal to local z."""
    h = thick / 2
    if r_in > 0:
        revolve(mesh, [(r_in, -h), (r, -h), (r, h), (r_in, h)], m, segs, mat, closed=True)
        return
    revolve(mesh, [(r, -h), (r, h)], m, segs, mat)
    ring = [m @ V((r * math.cos(TAU * s / segs), r * math.sin(TAU * s / segs), h)) for s in range(segs)]
    mesh.add(ring, [tuple(range(segs))], mat)
    ring = [m @ V((r * math.cos(TAU * s / segs), r * math.sin(TAU * s / segs), -h)) for s in range(segs)]
    mesh.add(ring, [tuple(reversed(range(segs)))], mat)


def loft(mesh, rings, mat=0, caps=(True, True), closed=True, uvs=None):
    """Join rings of points (same count each) into a skin; caps close the
    first and last ring. `uvs` is an optional function (i, j) -> (u, v)."""
    n = len(rings[0])
    verts = [V(p) for ring in rings for p in ring]
    faces, fuv = [], []
    spans = n if closed else n - 1
    for i in range(len(rings) - 1):
        for j in range(spans):
            j2 = (j + 1) % n
            faces.append((i * n + j, i * n + j2, (i + 1) * n + j2, (i + 1) * n + j))
            if uvs:
                fuv.append([uvs(i, j), uvs(i, j + 1), uvs(i + 1, j + 1), uvs(i + 1, j)])
    if caps[0]:
        faces.append(tuple(reversed(range(n))))
        fuv.append([(0, 0)] * n)
    if caps[1]:
        last = (len(rings) - 1) * n
        faces.append(tuple(last + j for j in range(n)))
        fuv.append([(0, 0)] * n)
    mesh.add(verts, faces, mat, fuv if uvs else None)


def slab(mesh, m, rings, segs, thick, keep=None, mat=0, back=True):
    """A flat polar part (a brake disc, a chainring, a sprocket) of
    thickness `thick` on placement `m`. `rings` lists the radii from the
    centre out; a ring may be a function of the angle step j instead (for
    teeth). `keep(band, j)` says which cells stay solid (slots, spiders).
    Without `back` the -z face and the inner rim are left off (a sprocket
    stacked against a bigger one)."""
    h = thick / 2

    def rad(i, j):
        r = rings[i]
        return r(j % segs) if callable(r) else r

    def pt(i, j, z):
        a = TAU * j / segs
        r = rad(i, j)
        return m @ V((r * math.cos(a), r * math.sin(a), z))

    cells = [(b, j) for b in range(len(rings) - 1) for j in range(segs) if keep is None or keep(b, j)]
    solid = set(cells)
    verts, faces = [], []
    index = {}

    def vid(i, j, side):
        key = (i, j % segs, side)
        if key not in index:
            index[key] = len(verts)
            verts.append(pt(i, j, h if side else -h))
        return index[key]

    for b, j in cells:
        faces.append((vid(b, j, 1), vid(b + 1, j, 1), vid(b + 1, j + 1, 1), vid(b, j + 1, 1)))
        if back:
            faces.append((vid(b, j + 1, 0), vid(b + 1, j + 1, 0), vid(b + 1, j, 0), vid(b, j, 0)))
        # walls where a solid cell meets air
        if (b == 0 and back) or (b > 0 and (b - 1, j) not in solid):
            faces.append((vid(b, j, 0), vid(b, j, 1), vid(b, j + 1, 1), vid(b, j + 1, 0)))
        if b == len(rings) - 2 or (b + 1, j) not in solid:
            faces.append((vid(b + 1, j + 1, 0), vid(b + 1, j + 1, 1), vid(b + 1, j, 1), vid(b + 1, j, 0)))
        if (b, (j - 1) % segs) not in solid:
            faces.append((vid(b + 1, j, 0), vid(b + 1, j, 1), vid(b, j, 1), vid(b, j, 0)))
        if (b, (j + 1) % segs) not in solid:
            faces.append((vid(b, j + 1, 0), vid(b, j + 1, 1), vid(b + 1, j + 1, 1), vid(b + 1, j + 1, 0)))
    mesh.add(verts, faces, mat)


def teeth(n, r_tip, r_root):
    """A radius function for `slab`: n teeth over 2n angle steps."""
    return lambda j: r_tip if j % 2 == 0 else r_root


def pitch_radius(n, pitch=0.0127):
    """The radius of an n-tooth sprocket for a chain of `pitch`."""
    return pitch / (2 * math.sin(math.pi / n))


def box(mesh, m, size, mat=0):
    """A plain box of `size` (x, y, z) centred on placement `m`."""
    x, y, z = (s / 2 for s in size)
    pts = [m @ V((sx * x, sy * y, sz * z)) for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)]
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    mesh.add(pts, faces, mat)


def rbox(mesh, m, size, r, mat=0, seg=2):
    """A box of `size` (x, y, z) with edges and corners rounded to radius
    r, centred on placement `m`: a cube grid pushed out onto the rounding."""
    h = [s / 2 for s in size]
    r = min(r, *h) * 0.999
    core = [x - r for x in h]

    def params(half):
        a = [-1 + (r / half) * k / seg for k in range(seg + 1)]
        return a + [-x for x in reversed(a)]

    P = [params(x) for x in h]
    weld, verts, faces = {}, [], []

    def vid(c):
        q = V(c)
        inner = V([max(-core[i], min(core[i], q[i])) for i in range(3)])
        d = q - inner
        p = inner + (d.normalized() * r if d.length > 1e-9 else d)
        key = tuple(round(x, 7) for x in p)
        if key not in weld:
            weld[key] = len(verts)
            verts.append(m @ p)
        return weld[key]

    for axis in range(3):
        a1, a2 = (axis + 1) % 3, (axis + 2) % 3
        for sign in (-1, 1):
            U, W = P[a1], P[a2]
            grid = []
            for u in U:
                row = []
                for w in W:
                    c = [0.0, 0.0, 0.0]
                    c[axis], c[a1], c[a2] = sign * h[axis], u * h[a1], w * h[a2]
                    row.append(vid(c))
                grid.append(row)
            for i in range(len(U) - 1):
                for j in range(len(W) - 1):
                    f = (grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1])
                    faces.append(f if sign > 0 else f[::-1])
    mesh.add(verts, faces, mat)
