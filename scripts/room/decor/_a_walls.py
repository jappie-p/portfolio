"""The two walls (bible 2.1, 2.2, 2.4 to 2.6, 2.9): stepped plaster walls
with the window openings cut in, rounded tops and a soft front corner, two
black clerestory windows looking out on trees, skirting and sockets.

Each wall is built in its own (u along, v up, w into the wall) space and
mapped into the room by `site`; every edge gets its own bevel weight."""

import bmesh

from space import T

from decor import _a_tex as tx
from decor._a_trees import draw as draw_trees
from decor._a_util import rbox

THICK = 0.12
WIN_V = (2.15, 2.75)
BACK = {
    "us": [0.0, 0.9, 1.15, 2.55, 5.6, 5.72],
    "vs": [0.0, 2.15, 2.35, 2.75, 2.9],
    "height": lambda u: 2.35 if u < 0.9 else 2.9,
    "window": (1.15, 2.55, 1.85),
    "site": lambda u, v, w: (u, v, -w),
    "end": 0.0,
}
RIGHT = {
    "us": [0.0, 0.55, 1.95, 3.1, 3.35],
    "vs": [0.0, 2.15, 2.45, 2.75, 2.9],
    "height": lambda u: 2.9 if u < 3.1 else 2.45,
    "window": (0.55, 1.95, 1.25),
    "site": lambda u, v, w: (5.6 + w, v, u),
    "end": 3.35,
}
WIDTH = 0.08


def plaster(k):
    """Fine plaster #e3cfae, the Poly Haven normal at 0.3 on a 1.2 m tile,
    a touch darker in the bottom 0.3 m."""
    name = "a_plaster"
    if name in k.mats:
        return k.mats[name]
    m, nt, p = tx.new_mat(name)
    vec = tx.coords(nt, 1.2)
    diff = tx.image(tx.tex_file("plastered_wall_03", "diff"))
    col = tx.tinted(nt, tx.box_image(nt, diff, vec).outputs["Color"], diff, "#e3cfae", 0.35)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = tx.node(nt, "ShaderNodeSeparateXYZ")
    tx.link(nt, tc.outputs["Object"], sep.inputs[0])
    dust = tx.node(nt, "ShaderNodeMapRange", **{"From Max": 0.3, "To Min": 0.95, "To Max": 1.0})
    tx.link(nt, sep.outputs["Z"], dust.inputs["Value"])
    sc = tx.node(nt, "ShaderNodeVectorMath")
    sc.operation = "SCALE"
    tx.link(nt, col, sc.inputs[0])
    tx.link(nt, dust.outputs["Result"], sc.inputs["Scale"])
    tx.link(nt, sc.outputs[0], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.92
    tx.link(nt, tx.normal_map(nt, tx.image(tx.tex_file("plastered_wall_03", "nor"), True), vec, 0.3), p.inputs["Normal"])
    m["gloss"] = False
    k.mats[name] = m
    return m


def _in_window(spec, u, v):
    u0, u1, _ = spec["window"]
    return u0 < u < u1 and WIN_V[0] < v < WIN_V[1]


def _weight(spec, a, b, sharp):
    """Bevel weight (times WIDTH) of the sharp edge a-b, given in wall space:
    0.03 on the tops and steps, 0.08 round on the right wall's front end,
    4 mm on the window reveals, nothing where the two walls meet."""
    (ua, va, wa), (ub, vb, wb) = a, b
    if not sharp or max(va, vb) < 1e-3:
        return 0.0
    if (spec is BACK and min(ua, ub) > 5.6 - 1e-4) or (spec is RIGHT and max(ua, ub) < 1e-4):
        return 0.0
    u0, u1, _ = spec["window"]
    if u0 - 1e-4 <= min(ua, ub) and max(ua, ub) <= u1 + 1e-4 and WIN_V[0] - 1e-4 <= min(va, vb) and max(va, vb) <= WIN_V[1] + 1e-4:
        return 0.004 / WIDTH
    end = spec["end"]
    if abs(ua - end) < 1e-4 and abs(ub - end) < 1e-4 and min(va, vb) < 2.3:
        if spec is BACK:
            return 0.012 / WIDTH
        return 1.0 if max(wa, wb) < 1e-4 else 0.03 / WIDTH
    return 0.03 / WIDTH if min(va, vb) > 2.3 else 0.0


def wall(k, name, spec):
    us, vs, site = spec["us"], spec["vs"], spec["site"]
    bm = bmesh.new()
    grid = {}

    def vert(i, j):
        if (i, j) not in grid:
            grid[(i, j)] = bm.verts.new(T(*site(us[i], vs[j], 0.0)))
        return grid[(i, j)]

    faces = []
    for i in range(len(us) - 1):
        for j in range(len(vs) - 1):
            um, vm = (us[i] + us[i + 1]) / 2, (vs[j] + vs[j + 1]) / 2
            if vm > spec["height"](um) or _in_window(spec, um, vm):
                continue
            faces.append(bm.faces.new((vert(i, j), vert(i + 1, j), vert(i + 1, j + 1), vert(i, j + 1))))
    ext = bmesh.ops.extrude_face_region(bm, geom=faces)
    moved = [v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=T(*site(0, 0, THICK)) - T(*site(0, 0, 0)), verts=moved)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.dissolve_limit(bm, angle_limit=0.01, verts=[], edges=list(bm.edges))
    layer = bm.edges.layers.float.new("bevel_weight_edge")
    for e in bm.edges:
        a, b = (_wall_space(spec, v.co) for v in e.verts)
        sharp = len(e.link_faces) == 2 and e.link_faces[0].normal.angle(e.link_faces[1].normal, 0.0) > 0.5
        e[layer] = _weight(spec, a, b, sharp)
    obj = k._mesh_obj(name, bm)
    mod = obj.modifiers.new("bevel", "BEVEL")
    mod.limit_method = "WEIGHT"
    mod.width = WIDTH
    mod.segments = 4
    mod.harden_normals = True
    obj.data.materials.append(plaster(k))
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def _wall_space(spec, co):
    """A Blender point back in the wall's (u, v, w)."""
    x, y, z = co.x, co.z, -co.y
    if spec is BACK:
        return (x, y, -z)
    return (z, y, x - 5.6)


def _box(bm, site, u0, u1, v0, v1, w0, w1):
    vs = [bm.verts.new(T(*site(u, v, w))) for u in (u0, u1) for v in (v0, v1) for w in (w0, w1)]
    for f in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
        bm.faces.new([vs[i] for i in f])


def _solid(k, name, boxes, site, material, bevel):
    bm = bmesh.new()
    for b in boxes:
        _box(bm, site, *b)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = k._mesh_obj(name, bm)
    return k.finish(obj, material, bevel, 2, smooth=False)


def window(k, name, spec):
    """Black frame 0.045 wide, 0.06 deep, 0.02 in from the room; one
    mullion; a glass pane; an oak sill 0.03 proud."""
    u0, u1, um = spec["window"]
    v0, v1 = WIN_V
    site, f, w0, w1 = spec["site"], 0.045, 0.02, 0.08
    frame = [
        (u0, u0 + f, v0, v1, w0, w1), (u1 - f, u1, v0, v1, w0, w1),
        (u0 + f, u1 - f, v1 - f, v1, w0, w1), (u0 + f, u1 - f, v0, v0 + f, w0, w1),
        (um - f / 2, um + f / 2, v0 + f, v1 - f, w0, w1),
    ]
    _solid(k, f"{name}_frame", frame, site, k.mat("a_window_black", "#1a1a1a", 0.45), 0.002)
    _solid(k, f"{name}_glass", [(u0 + f, u1 - f, v0 + f, v1 - f, 0.047, 0.053)], site, tx.glass(k), 0.0)
    _solid(k, f"{name}_sill", [(u0 - 0.03, u1 + 0.03, v0 - 0.022, v0 + 0.008, -0.03, w0)], site, k.wood("a_sill_oak", "#c99a5f", 0.45, scale=9), 0.003)
    backdrop(k, f"{name}_outside", spec)


def backdrop(k, name, spec, segs=16):
    """A curved band of tree canopy outside the window, glowing like daylight
    (emission 1.5), not casting shadows. Its foot stands 0.5 to 0.65 m out,
    its top leans in against the wall just under the wall top, so no camera
    above the room sees it over the wall; on the right wall it runs well
    back past the window, where the site's camera looks out through it."""
    u0, u1, _ = spec["window"]
    a, b = u0 - (0.15 if spec is BACK else 0.6), u1 + 0.45
    v0, v1 = 1.45, spec["vs"][-1] - 0.04
    site = spec["site"]
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    cols = []
    for i in range(segs + 1):
        t = i / segs
        u = a + (b - a) * t
        # out to 0.65 m and back, but tucked in against the wall at the
        # back window's left end, where the low wall would show it
        reach = min(1.0, t / 0.3) if spec is BACK else 1.0
        w = THICK + 0.02 + (0.5 + 0.15 * (1 - (2 * t - 1) ** 2)) * (3 * reach**2 - 2 * reach**3)
        cols.append((bm.verts.new(T(*site(u, v0, w))), bm.verts.new(T(*site(u, v1, THICK + 0.005))), t))
    for (a0, a1, ta), (b0, b1, tb) in zip(cols, cols[1:]):
        face = bm.faces.new((a0, b0, b1, a1))
        for loop, co in zip(face.loops, ((ta, 0), (tb, 0), (tb, 1), (ta, 1))):
            loop[uv].uv = co if spec is BACK else (1 - co[0], co[1])
    obj = k._mesh_obj(name, bm)
    k.finish(obj, k.image_mat("a_outside", draw_trees(), rough=1.0, emission=1.5))
    obj.visible_shadow = False
    return obj


def skirting(k):
    """0.09 high, 0.014 proud, chamfered top, a 2 mm shadow gap to the floor."""
    m = k.mat("a_skirting", "#f1ebe0", 0.5)
    k.box("skirting_back", (5.6, 0.09, 0.014), (2.8, 0.047, 0.007), m, bevel=0.004)
    k.box("skirting_right", (0.014, 0.09, 3.25), (5.593, 0.047, 1.625), m, bevel=0.004)


def socket(k, name, at, facing):
    """A white double socket plate with its two earthing cups, on the back
    wall (`facing` "z") or the right wall ("-x")."""
    plate = k.mat("a_socket_white", "#f4f2ee", 0.35)
    dark = k.mat("a_socket_hole", "#5c5a56", 0.6)
    x, y, z = at
    back = facing == "z"
    rbox(k, name, (0.08, 0.08, 0.009), at, plate, radius=0.008, segments=3, rot=(0, 0 if back else -90, 0))
    for d in (-0.017, 0.017):
        pos = (x + d, y, z + 0.0045) if back else (x - 0.0045, y, z + d)
        k.cylinder(f"{name}_cup", 0.012, 0.001, pos, dark, bevel=0.0, rot=(90, 0, 0) if back else (0, 0, 90), verts=20)


def build_walls(k):
    wall(k, "wall_back", BACK)
    wall(k, "wall_right", RIGHT)
    window(k, "window_back", BACK)
    window(k, "window_right", RIGHT)
    skirting(k)
    socket(k, "socket_back", (0.45, 0.32, 0.005), "z")
    socket(k, "socket_right", (5.595, 0.32, 0.9), "-x")
