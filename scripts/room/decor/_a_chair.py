"""The mesh-back task chair (bible 3.43): a five-star nylon base on twin
castors, a gas lift with its chrome stem, a charcoal cushion, a curved mesh
back in a black frame tilted 8 degrees, a lumbar band, side struts and two
4D armrests. Built facing +z around its own origin, then turned 155 degrees
at (2.25, 0, 1.45) so its back is to the camera. (The mesh is opaque
woven fabric: the bake cannot hold a see-through grid.)"""

import math

import bmesh
from mathutils import Matrix, Vector

from space import T

from decor import _a_tex as tx
from decor._a_util import aim_rotation, panel, rbox, rig, tube

AT, YAW = (2.25, 0.0, 1.45), 155
SEAT_Y = 0.47
ARM_X = 0.265
PIVOT = (0.0, 0.42, -0.16)


def _base(k, nylon):
    """Five tapered arms around a hub, one mesh."""
    bm = bmesh.new()
    for i in range(5):
        a = math.radians(72 * i + 18)
        vs = []
        for r, w, y0, y1 in ((0.04, 0.05, 0.075, 0.115), (0.3, 0.03, 0.07, 0.092)):
            for s in (-1, 1):
                for y in (y0, y1):
                    vs.append(bm.verts.new((r, s * w / 2, y)))
        for f in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (1, 5, 7, 3), (0, 2, 6, 4)):
            bm.faces.new([vs[j] for j in f])
        bmesh.ops.transform(bm, matrix=Matrix.Rotation(a, 4, "Z"), verts=vs)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = k._mesh_obj("chair_base", bm)
    k.finish(obj, nylon, bevel=0.007, segments=2)
    return [obj, k.cylinder("chair_hub", 0.05, 0.05, (0, 0.07, 0), nylon, bevel=0.008, verts=28)]


def _castors(k, nylon):
    """Twin-wheel castors at the arm ends, wheels across the arm."""
    parts = []
    wheel = k.mat("a_castor_wheel", "#1a1a1a", 0.35)
    for i in range(5):
        deg = 72 * i + 18
        a = math.radians(deg)
        out = Vector((math.cos(a), 0, -math.sin(a)))
        tan = Vector((-math.sin(a), 0, -math.cos(a)))
        c = out * 0.32
        parts.append(rbox(k, f"castor_hood_{i}", (0.05, 0.03, 0.045), tuple(c + Vector((0, 0.06, 0))), nylon, radius=0.01, segments=2, rot=(0, deg, 0)))
        for s in (-1, 1):
            centre = c + out * 0.012 + tan * (s * 0.0125) + Vector((0, 0.03, 0))
            w = k.cylinder(f"castor_wheel_{i}_{s}", 0.03, 0.011, (0, 0, 0), wheel, bevel=0.003, verts=20)
            w.location = T(*(centre - tan * 0.0055))
            w.rotation_euler = aim_rotation(tuple(tan))
            parts.append(w)
    return parts


def _column(k, nylon):
    chrome = k.mat("a_chrome", "#d6d6d6", 0.12, metal=1.0)
    return [
        k.cylinder("gas_shroud_low", 0.032, 0.1, (0, 0.11, 0), nylon, bevel=0.003, verts=24, radius2=0.03),
        k.cylinder("gas_shroud_mid", 0.028, 0.09, (0, 0.2, 0), nylon, bevel=0.003, verts=24, radius2=0.027),
        k.cylinder("gas_stem", 0.014, 0.07, (0, 0.29, 0), chrome, bevel=0.001, verts=20),
        rbox(k, "chair_mechanism", (0.2, 0.045, 0.24), (0, 0.38, -0.01), nylon, radius=0.008),
        k.cylinder("chair_lever", 0.006, 0.12, (0.1, 0.38, 0.06), nylon, bevel=0.002, rot=(0, 0, -80), verts=10),
        k.sphere("chair_lever_tip", 0.012, (0.215, 0.4, 0.06), nylon, segments=12, rings=8),
    ]


def _seat(k):
    cushion = tx.fabric(k, "a_chair_cushion", "#2b2a28", scale=700.0, bump=0.18)
    shell = k.mat("a_chair_shell", "#1d1d1d", 0.55)
    return [
        rbox(k, "seat_shell", (0.47, 0.02, 0.45), (0, 0.405, 0.02), shell, radius=0.008),
        rbox(k, "seat_cushion", (0.5, 0.07, 0.48), (0, SEAT_Y - 0.035, 0.02), cushion, radius=0.03, segments=6),
    ]


def _back_shape(u, v, inset=0.0):
    w = 0.44 + 0.05 * v - inset
    x = u * w
    z = -0.235 + x * x / 1.1 + 0.025 * math.exp(-(((v - 0.28) / 0.16) ** 2)) - 0.03 * v * v
    return (x, 0.62 + v * 0.5, z)


def _back(k, nylon):
    mesh = tx.fabric(k, "a_chair_mesh", "#2a2927", scale=420.0, bump=0.35, sheen=0.15)
    parts = [panel(k, "back_mesh", lambda u, v: _back_shape(u, v, 0.02), mesh, 0.005, nu=16, nv=12)]
    loop = [_back_shape(-0.5, v / 6) for v in range(7)] + [_back_shape(u / 6 - 0.5, 1) for u in range(1, 6)]
    loop += [_back_shape(0.5, 1 - v / 6) for v in range(7)] + [_back_shape(0.5 - u / 6, 0) for u in range(1, 6)]
    parts.append(tube(k, "back_frame", loop, 0.013, nylon, res=4, ring=2, closed=True))
    band = [_back_shape(u / 8 - 0.5, 0.27) for u in range(9)]
    parts.append(tube(k, "back_lumbar", [(x, y, z - 0.018) for x, y, z in band], 0.02, nylon, res=4, ring=2))
    for s in (-1, 1):
        lo = _back_shape(0.5 * s, 0.0)
        parts.append(tube(k, f"back_strut_{s}", [(s * 0.09, 0.385, -0.1), (s * 0.15, 0.44, -0.2), (lo[0] * 0.96, lo[1] - 0.01, lo[2] - 0.01)], 0.017, nylon, res=6))
    # tilt the whole back 8 degrees about its pivot above the mechanism
    for o in parts:
        o.location -= T(*PIVOT)
    return rig(k, "chair_back", PIVOT, (-8, 0, 0), parts)


def _armrests(k, nylon):
    pad = k.mat("a_arm_pad", "#1f1f1f", 0.7, bump=0.05, bump_scale=200.0)
    parts = []
    for s in (-1, 1):
        x = s * ARM_X
        parts += [
            rbox(k, f"arm_bracket_{s}", (0.17, 0.025, 0.05), (s * 0.18, 0.385, -0.03), nylon, radius=0.006),
            rbox(k, f"arm_post_{s}", (0.035, 0.27, 0.055), (x, 0.52, -0.03), nylon, radius=0.008),
            rbox(k, f"arm_pad_{s}", (0.08, 0.025, 0.25), (x, 0.665, -0.005), pad, radius=0.011, segments=3),
        ]
    return parts


def build_chair(k):
    """Returns the chair's rig empty (for the jacket's draping)."""
    nylon = k.mat("a_nylon_black", "#1f1f1f", 0.6, bump=0.02, bump_scale=300.0)
    parts = _base(k, nylon) + _castors(k, nylon) + _column(k, nylon) + _seat(k) + _armrests(k, nylon)
    back = _back(k, nylon)
    root = rig(k, "chair", AT, (0, YAW, 0), parts)
    back.parent = root
    return root
