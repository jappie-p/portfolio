"""The slab and its oak floor (bible 2.3, 2.7). The slab's front edge steps
forward through an S of two quarter ellipses between x 3.5 and 3.95; the planks
are real boards with V-grooves, clipped to that edge 0.012 short of it so
a dark lip shows, each with its own random value for grain and tone."""

import math
import random

import bmesh

from space import T

from decor import _a_tex as tx
from decor._a_util import prism

FRONT_L, FRONT_R, S0, S1 = 2.95, 3.35, 3.5, 3.95
R, RZ = (S1 - S0) / 2, (FRONT_R - FRONT_L) / 2
LIP = 0.012
PLANK_W = 0.14
TOP, BOTTOM = 0.0, -0.01


def front_z(x):
    """Where the slab's front edge is at x."""
    if x <= S0:
        return FRONT_L
    if x >= S1:
        return FRONT_R
    mid = (FRONT_L + FRONT_R) / 2
    if x <= S0 + R:
        return mid - RZ * math.sqrt(max(1 - ((x - S0) / R) ** 2, 0.0))
    return mid + RZ * math.sqrt(max(1 - ((x - S1) / R) ** 2, 0.0))


def _arc(cx, cz, r, a0, a1, n=10, rz=None):
    rz = r if rz is None else rz
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cz + rz * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def outline(wall=0.12, corner=0.08):
    """The slab seen from above, (x, z) points, walls' footprint included."""
    xw, mid = 5.6 + wall, (FRONT_L + FRONT_R) / 2
    pts = [(0.0, -wall), (xw, -wall)]
    pts += _arc(xw - corner, FRONT_R - corner, corner, 0, 90, 6)
    pts += _arc(S1, mid, R, 90, 180, 10, RZ)
    pts += _arc(S0, mid, R, 0, -90, 10, RZ)[1:]
    pts += [(0.0, FRONT_L)]
    return pts


def slab(k):
    m = k.mat("a_slab", "#2f2d2b", 0.55, bump=0.04, bump_scale=60.0)
    return prism(k, "slab", outline(), -0.22, BOTTOM, m, bevel=0.012, segments=3)


def _finv(z):
    """The smallest x where the inset front edge reaches z."""
    if front_z(S0) - LIP >= z:
        return 0.0
    lo, hi = S0, S1
    for _ in range(30):
        midx = (lo + hi) / 2
        if front_z(midx) - LIP < z:
            lo = midx
        else:
            hi = midx
    return hi


def _clip(xa, xb, z0, z1):
    """A plank's outline, cut by the inset front edge (None if outside)."""
    f = lambda x: front_z(x) - LIP  # noqa: E731
    if f(xb) <= z0 + 0.004:
        return None
    if f(xa) >= z1:
        return [(xa, z0), (xb, z0), (xb, z1), (xa, z1)]
    xs = max(xa, _finv(z0 + 0.004))
    pts = [(xs, z0), (xb, z0)]
    for i in range(13):
        x = xb + (xs - xb) * i / 12
        pts.append((x, min(z1, f(x))))
    out = []
    for p in pts:
        if not out or abs(p[0] - out[-1][0]) + abs(p[1] - out[-1][1]) > 1e-4:
            out.append(p)
    return out if len(out) >= 3 else None


def plank_outlines(seed=11):
    rng = random.Random(seed)
    x0, x1 = LIP, 5.6
    z0 = 0.0
    out = []
    while z0 < FRONT_R - LIP:
        z1 = min(z0 + PLANK_W, FRONT_R - LIP)
        x = x0 - rng.uniform(0.0, 1.2)
        while x < x1:
            xb = x + rng.uniform(0.9, 1.6)
            a, b = max(x, x0), min(xb, x1)
            if b - a > 0.05:
                poly = _clip(a, b, z0, z1)
                if poly:
                    out.append((poly, rng.random()))
            x = xb
        z0 = z1
    return out


def plank_material(k):
    """Oak veneer, tinted #b98550, grain along x, each board shifted and
    toned by its own random value (+/- 8 % lightness)."""
    name = "a_oak_floor"
    if name in k.mats:
        return k.mats[name]
    m, nt, p = tx.new_mat(name)
    attr = nt.nodes.new("ShaderNodeAttribute")
    attr.attribute_name = "rand"
    shift = tx.node(nt, "ShaderNodeCombineXYZ")
    for axis, f in (("X", 17.3), ("Y", 5.1)):
        mul = tx.node(nt, "ShaderNodeMath")
        mul.operation = "MULTIPLY"
        mul.inputs[1].default_value = f
        tx.link(nt, attr.outputs["Fac"], mul.inputs[0])
        tx.link(nt, mul.outputs[0], shift.inputs[axis])
    # (box projection reads a top face as (y, x): the grain runs along x)
    vec = tx.coords(nt, 1.83, offset=shift.outputs["Vector"])
    diff = tx.image(tx.tex_file("oak_veneer_01", "diff"))
    t = tx.box_image(nt, diff, vec)
    col = tx.tinted(nt, t.outputs["Color"], diff, "#b98550", 1.25)
    tone = tx.node(nt, "ShaderNodeMath")
    tone.operation = "PINGPONG"
    tone.inputs[1].default_value = 0.5
    scale7 = tx.node(nt, "ShaderNodeMath")
    scale7.operation = "MULTIPLY"
    scale7.inputs[1].default_value = 7.31
    tx.link(nt, attr.outputs["Fac"], scale7.inputs[0])
    tx.link(nt, scale7.outputs[0], tone.inputs[0])
    gain = tx.node(nt, "ShaderNodeMapRange", **{"From Max": 0.5, "To Min": 0.9, "To Max": 1.08})
    tx.link(nt, tone.outputs[0], gain.inputs["Value"])
    sc = tx.node(nt, "ShaderNodeVectorMath")
    sc.operation = "SCALE"
    tx.link(nt, col, sc.inputs[0])
    tx.link(nt, gain.outputs["Result"], sc.inputs["Scale"])
    tx.link(nt, sc.outputs[0], p.inputs["Base Color"])
    r = tx.box_image(nt, tx.image(tx.tex_file("oak_veneer_01", "rough"), True), vec)
    tx.link(nt, tx.rough_range(nt, r.outputs["Color"], 0.26, 0.4), p.inputs["Roughness"])
    tx.link(nt, tx.normal_map(nt, tx.image(tx.tex_file("oak_veneer_01", "nor"), True), vec, 0.35), p.inputs["Normal"])
    m["gloss"] = False
    k.mats[name] = m
    return m


def planks(k):
    """Every board as its own closed block in one mesh, V-grooved by a
    0.0018 bevel on all edges."""
    bm = bmesh.new()
    rand = bm.faces.layers.float.new("rand")
    for poly, r in plank_outlines():
        vs = [bm.verts.new(T(x, BOTTOM, z)) for x, z in poly]
        face = bm.faces.new(vs)
        ext = bmesh.ops.extrude_face_region(bm, geom=[face])
        top = [v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)]
        bmesh.ops.translate(bm, vec=(0, 0, TOP - BOTTOM), verts=top)
        for f in {f for v in top for f in v.link_faces} | {face}:
            f[rand] = r
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = k._mesh_obj("floor_planks", bm)
    k.finish(obj, plank_material(k), bevel=0.0018, segments=1)
    for p in obj.data.polygons:
        p.use_smooth = False
    return obj
