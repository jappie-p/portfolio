"""The suit's hide: the cage subdivided twice (Catmull-Clark, applied), and
what the details need from it. Rays that find the surface, the seams
where two panels meet, and parts that lie on the leather (armour domes,
sliders, accordion ribs) instead of floating near it. All in suit axes."""

import math
from collections import defaultdict

import bmesh
import bpy
from mathutils import Vector as V
from mathutils.bvhtree import BVHTree

from decor._g_common import sweep


class Hide:
    def __init__(self, cage, names, levels=2):
        """Subdivide `cage`; `names` lists the panel names in index order."""
        index = {n: i for i, n in enumerate(names)}
        me = bpy.data.meshes.new("suit_cage")
        me.from_pydata([tuple(v) for v in cage.verts], [], cage.faces)
        for _ in names:
            me.materials.append(None)
        me.polygons.foreach_set("material_index", [index[p] for p in cage.panels])
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
        obj = bpy.data.objects.new("suit_cage", me)
        bpy.context.scene.collection.objects.link(obj)
        mod = obj.modifiers.new("subsurf", "SUBSURF")
        mod.levels = mod.render_levels = levels
        dg = bpy.context.evaluated_depsgraph_get()
        out = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
        bpy.data.objects.remove(obj)
        bpy.data.meshes.remove(me)
        self.verts = [v.co.copy() for v in out.vertices]
        self.normals = [v.normal.copy() for v in out.vertices]
        self.faces = [tuple(p.vertices) for p in out.polygons]
        self.panels = [names[p.material_index] for p in out.polygons]
        bpy.data.meshes.remove(out)
        self.bvh = BVHTree.FromPolygons(self.verts, self.faces)

    def cast(self, origin, direction):
        """Where a ray from `origin` first meets the hide (None if it misses)."""
        return self.bvh.ray_cast(V(origin), V(direction).normalized())[0]

    def seams(self, group):
        """Vertex chains along the edges where faces of two seam groups
        meet; `group(panel)` names a face's group."""
        faces_of = defaultdict(list)
        for fi, f in enumerate(self.faces):
            for a, b in zip(f, f[1:] + f[:1]):
                faces_of[(min(a, b), max(a, b))].append(fi)
        adj = defaultdict(list)
        for (a, b), fs in faces_of.items():
            if len(fs) != 2:
                continue
            ga, gb = group(self.panels[fs[0]]), group(self.panels[fs[1]])
            if ga != gb and ga is not None and gb is not None:
                adj[a].append(b)
                adj[b].append(a)
        used, lines = set(), []

        def walk(a, b):
            line = [a, b]
            used.add((min(a, b), max(a, b)))
            while len(adj[line[-1]]) == 2:
                nxt = [n for n in adj[line[-1]] if (min(line[-1], n), max(line[-1], n)) not in used]
                if not nxt:
                    break
                used.add((min(line[-1], nxt[0]), max(line[-1], nxt[0])))
                line.append(nxt[0])
            return line

        for a in list(adj):
            if len(adj[a]) != 2:
                for b in adj[a]:
                    if (min(a, b), max(a, b)) not in used:
                        lines.append(walk(a, b))
        for a in list(adj):
            for b in adj[a]:
                if (min(a, b), max(a, b)) not in used:
                    lines.append(walk(a, b))
        return lines

    def piping(self, mesh, line, r, lift=0.0006, sides=4):
        """A welt along a seam chain: half sunk, so it reads as raised
        stitching, never as a loose line."""
        keep = line[::2] if len(line) % 2 else line[::2] + line[-1:]
        pts = [self.verts[i] + self.normals[i] * lift for i in keep]
        if len(pts) > 1:
            sweep(mesh, pts, r, sides=sides, step=0.03)

    def along(self, origins, direction, lift=0.0):
        """Surface points under each origin, cast along `direction` (a
        vector, or a function of the origin), lifted back toward it."""
        out = []
        for o in origins:
            d = V(direction(o) if callable(direction) else direction).normalized()
            hit = self.cast(o, d)
            if hit is not None:
                out.append(hit - d * lift)
        return out

    def patch(self, mesh, core, normal, along, size, profile, rhos, segs=24, sink=0.003, base=None):
        """An oval shell lying on the hide, found by rays from `core` (a
        point inside the limb) out through an oval of `size` half-lengths
        (along `along` and across) on the plane where `normal` leaves the
        hide. Lifted by profile(rho) (rho 0 at the centre, 1 at the rim;
        `rhos` are its rings) and sunk `sink` into the hide at the rim, so
        its edge reads as a thick lip. `base(dir)` adds a lift below it (a
        slider on a dome)."""
        n = V(normal).normalized()
        u = V(along) - n * V(along).dot(n)
        u.normalize()
        w = n.cross(u)
        core = V(core)
        r0 = (self.cast(core, n) - core).length

        def at(rho, a, lift):
            q = core + n * r0 + u * (math.cos(a) * rho * size[0]) + w * (math.sin(a) * rho * size[1])
            d = (q - core).normalized()
            hit = self.cast(core, d) or q
            return hit + d * (lift + (base(d) if base else 0.0))

        verts = [at(0.0, 0.0, profile(0.0))]
        for rho in rhos:
            verts += [at(rho, math.tau * j / segs, profile(rho)) for j in range(segs)]
        verts += [at(rhos[-1], math.tau * j / segs, -sink) for j in range(segs)]
        faces = [(0, 1 + j, 1 + (j + 1) % segs) for j in range(segs)]
        for i in range(len(rhos)):
            o0, o1 = 1 + i * segs, 1 + (i + 1) * segs
            faces += [(o0 + j, o1 + j, o1 + (j + 1) % segs, o0 + (j + 1) % segs) for j in range(segs)]
        mesh.add(verts, faces)
        return lambda d: _lift_at(d, n, u, w, r0, size, profile)

    def ribs(self, mesh, centre_at, directions, ys, half=(0.0026, 0.0042), lift=0.0008):
        """Accordion ribs across a stretch panel: one per height in `ys`,
        through the surface found from `centre_at(y)` along `directions`."""
        for y in ys:
            c = centre_at(y)
            pts = []
            for d in directions:
                hit = self.cast(c, d)
                if hit is not None:
                    pts.append(hit + (hit - c).normalized() * lift)
            if len(pts) > 2:
                sweep(mesh, pts, half, sides=4, up=V((0, 1, 0)), step=0.02)


def _lift_at(d, n, u, w, r0, size, profile):
    """A patch's lift along the ray direction `d` from its core."""
    q = d * (r0 / max(d.dot(n), 1e-3))
    rho = math.hypot(q.dot(u) / size[0], q.dot(w) / size[1])
    return profile(min(rho, 1.0))


def dome(height, rim=0.0025):
    """An armour cap: a soft dome down to a rounded lip."""
    def f(rho):
        if rho <= 0.9:
            return rim + height * (1 - (rho / 0.9) ** 2) ** 0.8
        return rim * math.sqrt(max(0.0, 1 - ((rho - 0.9) / 0.1) ** 2)) * 0.5 + rim * 0.5
    return f


def puck(height, crown=0.12, edge=0.28):
    """A slider puck: a low crowned top rolling over a round edge."""
    def f(rho):
        top = height * (1 - crown * rho * rho)
        if rho <= 1 - edge:
            return top
        e = (rho - (1 - edge)) / edge
        return 0.001 + (top - 0.001) * math.sqrt(max(0.0, 1 - e * e))
    return f


DOME_RHOS = [0.2, 0.4, 0.58, 0.74, 0.86, 0.94, 0.985, 1.0]
PUCK_RHOS = [0.25, 0.5, 0.66, 0.78, 0.87, 0.93, 0.97, 1.0]
