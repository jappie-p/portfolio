"""The olive hoodie over the chair's right armrest (bible 3.44). Its flat
pattern (body, one sleeve, the hood) is laid over the armrest and cloth-
simulated once onto the pad, post and seat, then frozen; the hem and cuff
are ribbed, and a cream drawstring hangs from the hood."""

import bmesh
import bpy

from space import T

from decor import _a_tex as tx
from decor._a_util import tube

FRAMES = 80
CELL = 0.025


def _local(root, p):
    """A point in the chair's own site space, in Blender world space."""
    return root.matrix_world @ T(*p)


def _pattern(arm_x):
    """Is the cell centred on (x, z) part of the garment? (chair space: x
    across the armrest, outside is -x; z along it, the camera side is -z)."""
    def inside(x, z):
        body = arm_x - 0.5 < x < arm_x + 0.34 and -0.34 < z < 0.16
        sleeve = arm_x - 0.21 < x < arm_x - 0.03 and 0.12 < z < 0.58
        hood = arm_x - 0.3 < x < arm_x - 0.05 and -0.52 < z < -0.3 and ((x - (arm_x - 0.175)) / 0.125) ** 2 + ((z + 0.39) / 0.13) ** 2 < 1.0
        return body or sleeve or hood
    return inside


def _sheet(k, root, arm_x, pad_top):
    """The pattern as a grid of cells; the strip on the pad is pinned."""
    inside = _pattern(arm_x)
    x0, z0 = arm_x - 0.525, -0.55
    nx, nz = int(0.9 / CELL), int(1.16 / CELL)
    bm = bmesh.new()
    verts = {}

    def vert(i, j):
        if (i, j) not in verts:
            verts[(i, j)] = bm.verts.new(_local(root, (x0 + i * CELL, pad_top + 0.012, z0 + j * CELL)))
        return verts[(i, j)]

    rib = []
    for i in range(nx):
        for j in range(nz):
            cx, cz = x0 + (i + 0.5) * CELL, z0 + (j + 0.5) * CELL
            if inside(cx, cz):
                f = bm.faces.new((vert(i, j), vert(i + 1, j), vert(i + 1, j + 1), vert(i, j + 1)))
                if cx < arm_x - 0.45 or cz > 0.52:
                    rib.append(f)
    for f in rib:
        f.material_index = 1
    bm.verts.index_update()
    pinned = [v.index for (i, j), v in verts.items() if abs(x0 + i * CELL - arm_x) < 0.03 and -0.11 < z0 + j * CELL < 0.1]
    # the drawstring runs down the outside from the neckline
    j = int((-0.2 - z0) / CELL)
    tip = [verts[(i, j)].index for i in range(int((arm_x - 0.06 - x0) / CELL), 0, -2) if (i, j) in verts][:6]
    obj = k._mesh_obj("jacket", bm)
    obj.vertex_groups.new(name="pin").add(pinned, 1.0, "REPLACE")
    return obj, tip


def _simulate(obj, colliders):
    for c in colliders:
        c.modifiers.new("collision", "COLLISION")
        c.collision.thickness_outer = 0.006
        c.collision.cloth_friction = 20.0
    mod = obj.modifiers.new("cloth", "CLOTH")
    s = mod.settings
    s.quality = 6
    s.mass = 0.3
    s.tension_stiffness = s.compression_stiffness = 12.0
    s.shear_stiffness = 6.0
    s.bending_stiffness = 0.6
    s.air_damping = 2.0
    s.vertex_group_mass = "pin"
    cs = mod.collision_settings
    cs.collision_quality = 4
    cs.distance_min = 0.004
    cs.use_self_collision = True
    cs.self_distance_min = 0.004
    mod.point_cache.frame_start = 1
    mod.point_cache.frame_end = FRAMES
    scene = bpy.context.scene
    for f in range(1, FRAMES + 1):
        scene.frame_set(f)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
    obj.modifiers.remove(mod)
    old = obj.data
    obj.data = me
    bpy.data.meshes.remove(old)
    scene.frame_set(1)
    for c in colliders:
        c.modifiers.remove(c.modifiers["collision"])


def _drawstring(k, sheet, idx, root):
    """A cream cord lying on the outside of the draped body, with an aglet."""
    centre = root.matrix_world.translation
    pts = []
    for i in idx:
        v = sheet.data.vertices[i]
        p, n = sheet.matrix_world @ v.co, v.normal.copy()
        away = p - centre
        away.z = 0
        if n.dot(away) < 0:
            n = -n
        b = p + n * 0.012
        pts.append((b.x, b.z, -b.y))
    cream = k.mat("a_drawstring", "#ece4d0", 0.8)
    tube(k, "jacket_string", pts, 0.0028, cream, res=6)
    k.cylinder("jacket_aglet", 0.0038, 0.022, pts[-1], k.mat("a_aglet", "#c9c2b0", 0.4, metal=0.3), bevel=0.0005, rot=(180, 0, 0), verts=8)


def build_jacket(k, root, arm_x=-0.265, pad_top=0.6775):
    """Drape the hoodie over the armrest at local x `arm_x` of the chair
    `root` (its armrest, post and seat are the colliders)."""
    olive = tx.fabric(k, "a_jacket", "#5b6b3a", scale=500.0, bump=0.3, sheen=0.35, mottle=0.18)
    rib = tx.fabric(k, "a_jacket_rib", "#4d5c30", scale=260.0, bump=0.6, sheen=0.3)
    bpy.context.view_layer.update()
    kids = [o for o in root.children_recursive if o.type == "MESH"]
    colliders = [o for o in kids if o.name.startswith(("arm_pad_-1", "arm_post_-1", "arm_bracket_-1", "seat_cushion", "seat_shell", "chair_mechanism"))]
    sheet, tip = _sheet(k, root, arm_x, pad_top)
    _simulate(sheet, colliders)
    sheet.data.materials.append(olive)
    sheet.data.materials.append(rib)
    sol = sheet.modifiers.new("solidify", "SOLIDIFY")
    sol.thickness = 0.01
    sol.offset = 1.0
    sub = sheet.modifiers.new("subsurf", "SUBSURF")
    sub.levels = sub.render_levels = 1
    for p in sheet.data.polygons:
        p.use_smooth = True
    if tip:
        _drawstring(k, sheet, tip, root)
    return sheet
