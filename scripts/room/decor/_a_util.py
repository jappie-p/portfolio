"""Builder A's shape helpers on top of the kit: turned profiles (pots, mugs),
extruded outlines (the slab, the planks), light tubes (cables, springs),
rounded boxes and Poly Haven models trimmed to one variant. Site
coordinates throughout, as in kit.py."""

import math

import bmesh
import bpy
from mathutils import Vector

from space import T


def rbox(k, name, size, at, material, radius=0.006, segments=3, rot=(0, 0, 0), anchor="center"):
    """A box with rounded edges (`radius`, `segments` steps)."""
    obj = k.box(name, size, at, material, bevel=radius, rot=rot, anchor=anchor)
    if radius > 0:
        obj.modifiers["bevel"].segments = segments
    return obj


def lathe(k, name, profile, at, material, segments=32, rot=(0, 0, 0), ribs=0, rib_depth=0.0, smooth=True):
    """A turned shape: `profile` is [(radius, y), ...] from the bottom centre
    out and up, swept around the site y axis. `ribs` flutes the outside."""
    bm = bmesh.new()
    rings = []
    for r, y in profile:
        if r <= 1e-6:
            rings.append([bm.verts.new((0, 0, y))])
            continue
        ring = []
        for i in range(segments):
            a = 2 * math.pi * i / segments
            rr = r * (1 + rib_depth * math.cos(ribs * a)) if ribs else r
            ring.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), y)))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        if len(a) == 1 and len(b) == 1:
            continue
        if len(a) == 1 or len(b) == 1:
            tip, ring = (a[0], b) if len(a) == 1 else (b[0], a)
            for i in range(segments):
                vs = (tip, ring[i], ring[(i + 1) % segments]) if len(a) == 1 else (ring[i], ring[(i + 1) % segments], tip)
                bm.faces.new(vs)
            continue
        for i in range(segments):
            j = (i + 1) % segments
            bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = k._mesh_obj(name, bm)
    k.place(obj, at, rot)
    return k.finish(obj, material, smooth=smooth)


def prism(k, name, outline, y0, y1, material, bevel=0.0, segments=2):
    """An outline [(x, z), ...] (counter-clockwise seen from above) extruded
    from y0 up to y1, as one closed solid."""
    bm = bmesh.new()
    vs = [bm.verts.new(T(x, y0, z)) for x, z in outline]
    face = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    top = [v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, 0, y1 - y0), verts=top)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = k._mesh_obj(name, bm)
    k.finish(obj, material, bevel, segments)
    for p in obj.data.polygons:
        p.use_smooth = False
    return obj


def tube(k, name, points, radius, material, res=6, ring=2, poly=False, closed=False):
    """A light round tube (cable, spring, frame) through site points:
    `res` curve steps per segment, `ring` bevel steps per quarter."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = ring
    cu.resolution_u = res
    cu.use_fill_caps = True
    if poly or len(points) < 3:
        sp = cu.splines.new("POLY")
        sp.points.add(len(points) - 1)
        for p, pt in zip(sp.points, points):
            p.co = (*T(*pt), 1)
    else:
        sp = cu.splines.new("BEZIER")
        sp.bezier_points.add(len(points) - 1)
        for bp, pt in zip(sp.bezier_points, points):
            bp.co = T(*pt)
            bp.handle_left_type = bp.handle_right_type = "AUTO"
    sp.use_cyclic_u = closed
    obj = bpy.data.objects.new(name, cu)
    k.link(obj)
    cu.materials.append(material)
    return obj


def helix(start, end, radius, turns, steps=10):
    """Points of a coil wound around the line start -> end (site points)."""
    a, b = Vector(start), Vector(end)
    axis = (b - a).normalized()
    side = axis.cross(Vector((0, 1, 0)))
    if side.length < 1e-4:
        side = axis.cross(Vector((1, 0, 0)))
    side.normalize()
    up = axis.cross(side)
    n = int(turns * steps)
    pts = []
    for i in range(n + 1):
        t = i / n
        ang = 2 * math.pi * turns * t
        p = a.lerp(b, t) + radius * (math.cos(ang) * side + math.sin(ang) * up)
        pts.append(tuple(p))
    return pts


def join(k, objs, name):
    """Join meshes into one object (fewer draw calls, one bake island set)."""
    objs = [o for o in objs if o.type == "MESH"]
    if len(objs) < 2:
        return objs[0] if objs else None
    with bpy.context.temp_override(active_object=objs[0], selected_editable_objects=objs, selected_objects=objs):
        bpy.ops.object.join()
    objs[0].name = name
    return objs[0]


def _site_bounds(objs):
    pts = []
    for o in objs:
        if o.type == "MESH":
            pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def ph(k, asset_id, at, rot=(0, 0, 0), height=None, width=None, pick=None, drop=(), ratio=None, stretch=1.0):
    """A Poly Haven model trimmed to one variant (`pick`, a name suffix such
    as "_c"), without the parts named in `drop`, set on the floor at `at`
    and scaled to `height` (or `width`), `stretch` widening it sideways.
    `ratio` decimates it. Returns (root, kept meshes)."""
    root = k.asset(asset_id)
    kids = list(root.children)
    for o in kids:
        bad = (pick and not o.name.split(".")[0].endswith(pick)) or any(d in o.name for d in drop)
        if bad:
            bpy.data.objects.remove(o, do_unlink=True)
    kids = [o for o in root.children]
    bpy.context.view_layer.update()
    lo, hi = _site_bounds(kids)
    shift = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    for o in kids:
        o.location -= shift
    size = hi - lo
    s = 1.0
    if height:
        s = height / size.z
    elif width:
        s = width / max(size.x, size.y)
    k.place(root, at, rot)
    root.scale = (s * stretch, s * stretch, s)
    if ratio:
        for o in kids:
            if o.type == "MESH" and len(o.data.polygons) > 2000:
                d = o.modifiers.new("decimate", "DECIMATE")
                d.ratio = ratio
                d.use_collapse_triangulate = True
    return root, kids


def tris(objs):
    """Triangles after modifiers (for the budget)."""
    dg = bpy.context.evaluated_depsgraph_get()
    n = 0
    for o in objs:
        if o.type not in {"MESH", "CURVE", "FONT"}:
            continue
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        n += sum(len(p.vertices) - 2 for p in me.polygons)
        ev.to_mesh_clear()
    return n


def cubes(k, name, boxes, material, bevel=0.0, segments=2):
    """Many boxes as one mesh: [((x, y, z) centre, (w, h, d)), ...] in site
    coordinates (or local ones, when parented later)."""
    bm = bmesh.new()
    for (x, y, z), (w, h, d) in boxes:
        vs = bmesh.ops.create_cube(bm, size=1.0)["verts"]
        bmesh.ops.scale(bm, vec=(w, d, h), verts=vs)
        bmesh.ops.translate(bm, vec=T(x, y, z), verts=vs)
    obj = k._mesh_obj(name, bm)
    return k.finish(obj, material, bevel, segments)


def rig(k, name, at, rot, objs):
    """Hang objects built around the origin under one empty at `at`, `rot`."""
    e = bpy.data.objects.new(name, None)
    k.link(e)
    k.place(e, at, rot)
    for o in objs:
        o.parent = e
    return e


def aim_rotation(direction):
    """The Blender rotation that turns local +z (a turned shape's axis, site
    y) to point along a site direction."""
    return Vector((0, 0, 1)).rotation_difference(T(*direction).normalized()).to_euler()


def bar(k, name, a, b, size, material, bevel=0.003):
    """A rectangular bar (w, h) between two site points at the same height."""
    ax, ay, az = a
    bx, by, bz = b
    length = math.hypot(bx - ax, bz - az)
    yaw = math.degrees(math.atan2(-(bz - az), bx - ax))
    w, h = size
    return k.box(name, (length, h, w), ((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2), material, bevel=bevel, rot=(0, yaw, 0))


def panel(k, name, shape, material, thick, nu=14, nv=10):
    """A curved sheet: `shape(u, v)` gives the site point for u in
    [-0.5, 0.5] across and v in [0, 1] up; solidified to `thick`."""
    bm = bmesh.new()
    grid = [[bm.verts.new(T(*shape(i / nu - 0.5, j / nv))) for j in range(nv + 1)] for i in range(nu + 1)]
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = k._mesh_obj(name, bm)
    sol = obj.modifiers.new("solidify", "SOLIDIFY")
    sol.thickness = thick
    sol.offset = 0.0
    return k.finish(obj, material)
