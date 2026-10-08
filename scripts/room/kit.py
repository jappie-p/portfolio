"""The builders' kit: materials, shapes and placement for the room, in the
site's coordinates (see space.py). Everything made inside `with k.piece(id)`
or `with k.group(name)` lands in that piece's collection; the export turns
each collection into one node the site can light up, mute and open.
"""

import math
from contextlib import contextmanager

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

from assets import import_asset
from space import T

# site axes to Blender axes: (x, y up, z toward you) -> (x, -z, y)
_C = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))


def R(rx=0.0, ry=0.0, rz=0.0):
    """A rotation in site axes (degrees, three.js XYZ order) as a Blender Euler."""
    m = Euler((math.radians(rx), math.radians(ry), math.radians(rz)), "XYZ").to_matrix().to_4x4()
    return (_C @ m @ _C.inverted()).to_euler("XYZ")


def hex_rgb(h):
    """'#rrggbb' as linear RGBA."""
    h = h.lstrip("#")
    srgb = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (*lin, 1.0)


class Kit:
    def __init__(self):
        self.mats = {}
        self.active = bpy.context.scene.collection
        self.story = None
        self.markers = self._collection("markers")

    # -- collections -------------------------------------------------------

    def _collection(self, name):
        c = bpy.data.collections.get(name)
        if not c:
            c = bpy.data.collections.new(name)
            bpy.context.scene.collection.children.link(c)
        return c

    @contextmanager
    def piece(self, story):
        """A story piece: everything made inside is that piece (clickable)."""
        before = (self.active, self.story)
        self.active, self.story = self._collection(f"story_{story}"), story
        try:
            yield self.active
        finally:
            self.active, self.story = before

    @contextmanager
    def group(self, name):
        """A part of the room that is not a story (shell, plants, shelves)."""
        before = (self.active, self.story)
        self.active, self.story = self._collection(f"decor_{name}"), None
        try:
            yield self.active
        finally:
            self.active, self.story = before

    def link(self, obj):
        for c in obj.users_collection:
            c.objects.unlink(obj)
        self.active.objects.link(obj)
        if self.story:
            obj["story"] = self.story
        return obj

    # -- markers the site reads -------------------------------------------

    def _empty(self, name, at):
        e = bpy.data.objects.new(name, None)
        e.location = T(*at)
        e.empty_display_size = 0.08
        self.markers.objects.link(e)
        return e

    def pin(self, story, at):
        """Where the story's numbered label floats (site coordinates)."""
        self._empty(f"pin_{story}", at)

    def view(self, story, target, offset, fov=None):
        """What the camera looks at when the story opens, and from where
        (an offset from the target, site coordinates); `fov` (vertical
        degrees) if the close-up wants its own lens."""
        e = self._empty(f"view_{story}", target)
        e["offset"] = list(offset)
        if fov:
            e["fov"] = float(fov)

    # -- materials --------------------------------------------------------

    def mat(self, name, color="#cccccc", rough=0.5, metal=0.0, **o):
        """A Principled material, made once per name. Extras: emission (hex),
        strength, coat, coat_rough, sheen, transmission, alpha, subsurface,
        bump (strength of a fine noise bump), noise (scale of a colour mottle)."""
        if name in self.mats:
            return self.mats[name]
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        nt = m.node_tree
        p = nt.nodes["Principled BSDF"]
        p.inputs["Base Color"].default_value = hex_rgb(color) if isinstance(color, str) else color
        p.inputs["Roughness"].default_value = rough
        p.inputs["Metallic"].default_value = metal
        if "emission" in o:
            p.inputs["Emission Color"].default_value = hex_rgb(o["emission"])
            p.inputs["Emission Strength"].default_value = o.get("strength", 1.0)
        if "coat" in o:
            p.inputs["Coat Weight"].default_value = o["coat"]
            p.inputs["Coat Roughness"].default_value = o.get("coat_rough", 0.05)
        if "sheen" in o:
            p.inputs["Sheen Weight"].default_value = o["sheen"]
        if "transmission" in o:
            p.inputs["Transmission Weight"].default_value = o["transmission"]
        if "subsurface" in o:
            p.inputs["Subsurface Weight"].default_value = o["subsurface"]
        if "alpha" in o:
            p.inputs["Alpha"].default_value = o["alpha"]
        if o.get("noise"):
            self._mottle(nt, p, color, o["noise"], o.get("mottle", 0.12))
        if o.get("bump"):
            self._bump(nt, p, o["bump"], o.get("bump_scale", 180.0))
        m["gloss"] = rough < 0.35 or metal > 0.5
        self.mats[name] = m
        return m

    def _mottle(self, nt, p, color, scale, amount):
        n = nt.nodes.new("ShaderNodeTexNoise")
        n.inputs["Scale"].default_value = scale
        n.inputs["Detail"].default_value = 6
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = amount
        mix.inputs["A"].default_value = hex_rgb(color) if isinstance(color, str) else color
        nt.links.new(n.outputs["Color"], mix.inputs["B"])
        nt.links.new(mix.outputs["Result"], p.inputs["Base Color"])

    def _bump(self, nt, p, strength, scale):
        n = nt.nodes.new("ShaderNodeTexNoise")
        n.inputs["Scale"].default_value = scale
        b = nt.nodes.new("ShaderNodeBump")
        b.inputs["Strength"].default_value = strength
        nt.links.new(n.outputs["Fac"], b.inputs["Height"])
        nt.links.new(b.outputs["Normal"], p.inputs["Normal"])

    def image_mat(self, name, path, rough=0.5, emission=0.0, metal=0.0):
        """A material showing an image (a screen, a poster, a label). With
        `emission` it gives off its own light, like a screen."""
        if name in self.mats:
            return self.mats[name]
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        nt = m.node_tree
        p = nt.nodes["Principled BSDF"]
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = bpy.data.images.load(path, check_existing=True)
        nt.links.new(tex.outputs["Color"], p.inputs["Base Color"])
        p.inputs["Roughness"].default_value = rough
        p.inputs["Metallic"].default_value = metal
        if emission:
            nt.links.new(tex.outputs["Color"], p.inputs["Emission Color"])
            p.inputs["Emission Strength"].default_value = emission
        self.mats[name] = m
        return m

    def wood(self, name, color="#c9a678", rough=0.45, scale=6.0, streak=0.35):
        """Wood with its grain running along the object's local x: long
        wavering streaks over a slow mottle."""
        if name in self.mats:
            return self.mats[name]
        m = self.mat(name, color, rough)
        nt = m.node_tree
        p = nt.nodes["Principled BSDF"]
        coord = nt.nodes.new("ShaderNodeTexCoord")
        mapping = nt.nodes.new("ShaderNodeMapping")
        mapping.inputs["Scale"].default_value = (0.25, 6.0, 6.0)
        nt.links.new(coord.outputs["Object"], mapping.inputs["Vector"])
        wave = nt.nodes.new("ShaderNodeTexWave")
        wave.wave_type = "BANDS"
        wave.bands_direction = "Y"
        wave.inputs["Scale"].default_value = scale
        wave.inputs["Distortion"].default_value = 7.0
        wave.inputs["Detail"].default_value = 3.0
        nt.links.new(mapping.outputs["Vector"], wave.inputs["Vector"])
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        base = hex_rgb(color)
        dark = tuple(c * (1 - streak) for c in base[:3]) + (1.0,)
        ramp.color_ramp.elements[0].color = dark
        ramp.color_ramp.elements[1].color = base
        nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
        nt.links.new(ramp.outputs["Color"], p.inputs["Base Color"])
        return m

    # -- shapes -----------------------------------------------------------

    def _mesh_obj(self, name, bm):
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me)
        bm.free()
        obj = bpy.data.objects.new(name, me)
        return self.link(obj)

    def place(self, obj, at=(0, 0, 0), rot=(0, 0, 0), scale=None):
        obj.location = T(*at)
        obj.rotation_euler = R(*rot)
        if scale is not None:
            obj.scale = (scale,) * 3 if isinstance(scale, (int, float)) else scale
        return obj

    def finish(self, obj, material=None, bevel=0.0, segments=3, smooth=True):
        if material is not None:
            obj.data.materials.clear()
            obj.data.materials.append(material)
        if bevel > 0:
            b = obj.modifiers.new("bevel", "BEVEL")
            b.width = bevel
            b.segments = segments
            b.limit_method = "ANGLE"
            b.harden_normals = True
        if smooth and obj.type == "MESH":
            for poly in obj.data.polygons:
                poly.use_smooth = True
        return obj

    def box(self, name, size, at=(0, 0, 0), material=None, bevel=0.004, rot=(0, 0, 0), anchor="center"):
        """A box `size` = (w along x, h up, d toward you), site metres. With
        anchor "floor" it stands on `at` instead of centring on it."""
        w, h, d = size
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=(w, d, h), verts=bm.verts)
        if anchor == "floor":
            bmesh.ops.translate(bm, vec=(0, 0, h / 2), verts=bm.verts)
        obj = self._mesh_obj(name, bm)
        self.place(obj, at, rot)
        return self.finish(obj, material, bevel)

    def cylinder(self, name, radius, height, at=(0, 0, 0), material=None, bevel=0.002, rot=(0, 0, 0), verts=32, radius2=None):
        """A cylinder standing up (along site y) from `at`, or a cone with radius2."""
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=radius, radius2=radius if radius2 is None else radius2, depth=height)
        bmesh.ops.translate(bm, vec=(0, 0, height / 2), verts=bm.verts)
        obj = self._mesh_obj(name, bm)
        self.place(obj, at, rot)
        return self.finish(obj, material, bevel)

    def sphere(self, name, radius, at=(0, 0, 0), material=None, segments=32, rings=16, scale=None):
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=rings, radius=radius)
        obj = self._mesh_obj(name, bm)
        self.place(obj, at, scale=scale)
        return self.finish(obj, material)

    def tube(self, name, points, radius, material=None, resolution=12, closed=False):
        """A round tube through site points (a frame tube, a cable, a hose)."""
        cu = bpy.data.curves.new(name, "CURVE")
        cu.dimensions = "3D"
        cu.bevel_depth = radius
        cu.bevel_resolution = max(2, resolution // 4)
        cu.use_fill_caps = True
        sp = cu.splines.new("POLY" if len(points) < 3 else "BEZIER")
        if sp.type == "BEZIER":
            sp.bezier_points.add(len(points) - 1)
            for bp, pt in zip(sp.bezier_points, points):
                bp.co = T(*pt)
                bp.handle_left_type = bp.handle_right_type = "AUTO"
        else:
            sp.points.add(len(points) - 1)
            for p, pt in zip(sp.points, points):
                p.co = (*T(*pt), 1)
        sp.use_cyclic_u = closed
        obj = bpy.data.objects.new(name, cu)
        self.link(obj)
        if material is not None:
            cu.materials.append(material)
        return obj

    def text(self, name, body, size, at=(0, 0, 0), material=None, rot=(0, 0, 0), extrude=0.0, font=None, align="CENTER"):
        """Lettering (faces +z, toward you, unless turned). `font` is a path."""
        cu = bpy.data.curves.new(name, "FONT")
        cu.body = body
        cu.size = size
        cu.extrude = extrude
        cu.align_x = align
        cu.align_y = "CENTER"
        if font:
            cu.font = bpy.data.fonts.load(font, check_existing=True)
        obj = bpy.data.objects.new(name, cu)
        self.link(obj)
        obj.location = T(*at)
        # text lies in Blender's xy plane: stand it up to face the viewer
        obj.rotation_euler = (R(*rot).to_matrix() @ Euler((math.pi / 2, 0, 0)).to_matrix()).to_euler()
        if material is not None:
            cu.materials.append(material)
        return obj

    def asset(self, asset_id, at=(0, 0, 0), rot=(0, 0, 0), scale=1.0, res="1k"):
        """A Poly Haven model (CC0), real scale, placed in the room. Returns
        its root empty."""
        objs = import_asset(asset_id, res)
        root = bpy.data.objects.new(f"{asset_id}_root", None)
        self.link(root)
        for o in objs:
            self.link(o)
            if o.parent is None:
                o.parent = root
        self.place(root, at, rot, scale)
        return root

    def bounds(self, obj):
        """An object's (and its children's) box in site coordinates: (min, max)."""
        pts = []
        for o in [obj, *obj.children_recursive]:
            if o.type in {"MESH", "CURVE", "FONT"}:
                pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
        lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
        hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
        # back to site axes: x, y up = blender z, z toward you = -blender y
        return (lo.x, lo.z, -hi.y), (hi.x, hi.z, -lo.y)
