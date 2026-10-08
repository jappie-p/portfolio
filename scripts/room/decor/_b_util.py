"""Builder B's shared bits: textured oak, LED strips, brackets, wall
shelves, cables, and Poly Haven assets fitted to a size. Everything takes
the kit `k` and site coordinates like the kit itself."""

import json
import math
import os

import bmesh
import bpy
import numpy as np

from assets import CACHE, _get
from kit import hex_rgb
from space import T

OAK = "#c99a5f"
LED = "#ffc37a"


# -- materials -----------------------------------------------------------


def ph_texture(tex_id, kind="Diffuse", res="1k"):
    """A Poly Haven texture map (jpg), fetched once into the cache."""
    meta = os.path.join(CACHE, tex_id, "files.json")
    _get("https://api.polyhaven.com/files/" + tex_id, meta)
    with open(meta) as f:
        url = json.load(f)[kind][res]["jpg"]["url"]
    return _get(url, os.path.join(CACHE, tex_id, res, os.path.basename(url)))


def _mean_linear(img):
    px = np.empty(len(img.pixels), dtype=np.float32)
    img.pixels.foreach_get(px)
    srgb = px.reshape(-1, 4)[::7, :3].mean(axis=0)
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]


def wood_tex(k, name, tint=OAK, tex_id="oak_veneer_01", scale=1.0, rough=0.4, along_y=False, soft=0.0):
    """Real wood (a Poly Haven veneer) mapped in object space and tinted
    to `tint`, keeping its grain; a faint bump from the grain. `scale` is
    how many metres one tile spans; the grain runs along the object's
    local x, or up (site y) with `along_y`; `soft` (0..1) calms the grain
    toward its average colour."""
    if name in k.mats:
        return k.mats[name]
    m = k.mat(name, tint, rough)
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    # the grain runs up the veneer images (v); feed v the object's length
    # (Blender x, or z = site up with `along_y`) and u the sum of the two
    # other axes, so fronts and tops both show long grain
    coord = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(coord.outputs["Object"], sep.inputs["Vector"])
    across = nt.nodes.new("ShaderNodeMath")
    across.operation = "ADD"
    along = "Z" if along_y else "X"
    others = ["X", "Y"] if along_y else ["Y", "Z"]
    nt.links.new(sep.outputs[others[0]], across.inputs[0])
    nt.links.new(sep.outputs[others[1]], across.inputs[1])
    uv = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(across.outputs["Value"], uv.inputs["X"])
    nt.links.new(sep.outputs[along], uv.inputs["Y"])
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (1 / scale,) * 3
    mapping.inputs["Location"].default_value = (0.37, 0.11, 0)
    nt.links.new(uv.outputs["Vector"], mapping.inputs["Vector"])
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(ph_texture(tex_id), check_existing=True)
    nt.links.new(mapping.outputs["Vector"], tex.inputs["Vector"])
    mean = _mean_linear(tex.image)
    want = hex_rgb(tint)
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 1.0
    mix.inputs["B"].default_value = (*[w / max(c, 1e-3) for w, c in zip(want, mean)], 1)
    calm = nt.nodes.new("ShaderNodeMix")
    calm.data_type = "RGBA"
    calm.inputs["Factor"].default_value = soft
    calm.inputs["B"].default_value = (*mean, 1)
    nt.links.new(tex.outputs["Color"], calm.inputs["A"])
    nt.links.new(calm.outputs["Result"], mix.inputs["A"])
    nt.links.new(mix.outputs["Result"], p.inputs["Base Color"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.08
    bump.inputs["Distance"].default_value = 0.0005
    nt.links.new(tex.outputs["Color"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], p.inputs["Normal"])
    return m


def oak(k):
    return wood_tex(k, "b_oak", OAK, "oak_veneer_01", scale=0.6)


def oak_up(k):
    """The same oak with its grain running up (uprights)."""
    return wood_tex(k, "b_oak_up", OAK, "oak_veneer_01", scale=0.6, along_y=True)


def led_mat(k, color=LED, strength=12.0, name=None):
    return k.mat(name or f"b_led_{color.lstrip('#')}_{strength:g}", color, 0.5, emission=color, strength=strength)


def glass(k, name="b_glass", tint="#ffffff", rough=0.05, alpha=0.12):
    """Glass (frames, the rack door, the candle) as a thin blended film:
    `alpha` of tint and reflection over what is behind it. It stays live,
    lets the sun and the rack glow through in the bake, and reads clean in
    the previews where raytraced refraction would speckle."""
    if name in k.mats:
        return k.mats[name]
    m = k.mat(name, tint, rough, alpha=alpha)
    m.surface_render_method = "BLENDED"
    m.use_backface_culling = False
    m["live"] = True
    return m


def black_steel(k):
    return k.mat("b_black_steel", "#1c1c1c", 0.45, metal=0.6, bump=0.02, bump_scale=900)


def brass(k):
    return k.mat("b_brass", "#b08d57", 0.3, metal=1.0)


def matte(k, color, rough=0.55, name=None, **o):
    return k.mat(name or f"b_{color.lstrip('#')}_{rough:g}", color, rough, **o)


# -- shapes --------------------------------------------------------------


def boxes(k, name, parts, material=None, bevel=0.003, at=(0, 0, 0), rot=(0, 0, 0), segments=2):
    """Several boxes as one mesh: `parts` = [(size, centre), ...] in the
    object's own site-axis frame, placed at `at` turned by `rot`."""
    bm = bmesh.new()
    for (w, h, d), (cx, cy, cz) in parts:
        geom = bmesh.ops.create_cube(bm, size=1.0)
        vs = geom["verts"]
        bmesh.ops.scale(bm, vec=(w, d, h), verts=vs)
        bmesh.ops.translate(bm, vec=T(cx, cy, cz), verts=vs)
    obj = k._mesh_obj(name, bm)
    k.place(obj, at, rot)
    return k.finish(obj, material, bevel, segments)


def disc(k, name, radius, depth, at, material=None, bevel=0.001, verts=32):
    """A cylinder lying on its back: from `at` it runs `depth` toward +z."""
    return k.cylinder(name, radius, depth, at, material, bevel, (90, 0, 0), verts)


def cable(k, name, points, radius=0.004, material=None, res=4, sides=1):
    """A thin tube through site points with a light curve resolution."""
    obj = k.tube(name, points, radius, material or k.mat("b_cable", "#161616", 0.45))
    cu = obj.data
    cu.resolution_u = res
    cu.bevel_resolution = sides
    return obj


def led(k, name, size, at, color, strength=20.0):
    """A small emissive LED (a box `size`), named led_* for the site."""
    return k.box(f"led_{name}", size, at, led_mat(k, color, strength), bevel=0.0)


def bracket(k, name, x, y_under, depth, z0=0.0, material=None, drop=0.12):
    """A black L-bracket under a shelf: a plate on the wall, an arm under
    the shelf and a curved brace between them."""
    m = material or black_steel(k)
    w, t = 0.02, 0.004
    parts = [
        ((w, drop, t), (0, y_under - drop / 2, z0 + t / 2)),
        ((w, t, depth), (0, y_under - t / 2, z0 + depth / 2)),
    ]
    obj = boxes(k, name, parts, m, bevel=0.001, at=(x, 0, 0))
    pts = [(x, y_under - drop * 0.85, z0 + 0.006)]
    for a in (0.35, 0.65):
        pts.append((x, y_under - drop * 0.85 * (1 - a) ** 1.6, z0 + 0.006 + depth * 0.8 * a**0.8))
    pts.append((x, y_under - 0.006, z0 + depth * 0.82))
    brace = k.tube(name + "_brace", pts, 0.0035, m)
    brace.data.resolution_u = 4
    brace.data.bevel_resolution = 1
    return obj


def shelf(k, name, cx, y, w, d, t=0.03, z0=0.0, brackets_at=None, led_strip=True, material=None):
    """An oak wall shelf centred on x `cx`, its middle at height `y`, on
    two brackets, with a warm LED strip (L4) under its front edge."""
    board = k.box(name, (w, t, d), (cx, y, z0 + d / 2), material or oak(k), bevel=0.004)
    under = y - t / 2
    for i, bx in enumerate(brackets_at or (cx - w * 0.36, cx + w * 0.36)):
        bracket(k, f"{name}_bracket{i}", bx, under, d * 0.85, z0)
    if led_strip:
        k.box(f"{name}_channel", (w - 0.04, 0.006, 0.014), (cx, under - 0.003, z0 + d - 0.025), k.mat("b_alu", "#b9b6b0", 0.35, metal=1.0), bevel=0.001)
        led(k, f"strip_{name}", (w - 0.05, 0.002, 0.006), (cx, under - 0.0065, z0 + d - 0.025), LED, 12.0)
    return board


def strip_light(k, name, cx, y, z, w, d=0.04, power=1.5, color=(1.0, 0.76, 0.48)):
    """A soft area light hugging an LED strip, facing down, so the wash on
    the wall below reads in the preview and the bake alike."""
    data = bpy.data.lights.new(name, "AREA")
    data.shape = "RECTANGLE"
    data.size, data.size_y = w, d
    data.energy = power
    data.color = color
    obj = bpy.data.objects.new(name, data)
    # an area light shines down its own -z: Blender's down, as it is
    obj.location = T(cx, y, z)
    obj.visible_camera = False
    k.link(obj)
    return obj


# -- Poly Haven assets ---------------------------------------------------


def _meshes(root):
    return [o for o in root.children_recursive if o.type == "MESH"]


def fit(k, root, at, height=None, width=None, depth=None):
    """Scale an asset so its height (or width along x, or depth along z)
    is the given size, standing on `at` and centred on it in x and z."""
    bpy.context.view_layer.update()
    lo, hi = k.bounds(root)
    size = [h - l for l, h in zip(lo, hi)]
    s = height / size[1] if height else width / size[0] if width else depth / size[2]
    root.scale = [v * s for v in root.scale]
    cx, cz = (lo[0] + hi[0]) / 2, (lo[2] + hi[2]) / 2
    ox, oy, oz = root.location.x, root.location.z, -root.location.y
    root.location = T(at[0] + (ox - cx) * s, at[1] + (oy - lo[1]) * s, at[2] + (oz - cz) * s)
    bpy.context.view_layer.update()
    return root


def decimate(root, ratio):
    for o in _meshes(root):
        mod = o.modifiers.new("decimate", "DECIMATE")
        mod.ratio = ratio
        mod.use_collapse_triangulate = True


def drop_parts(root, word):
    """Remove an asset's meshes whose material name contains `word`."""
    for o in _meshes(root):
        if any(word in (s.material.name if s.material else "") for s in o.material_slots):
            bpy.data.objects.remove(o, do_unlink=True)


def recolor(root, word, material):
    """Give an asset's meshes whose material contains `word` our own material."""
    for o in _meshes(root):
        if any(word in (s.material.name if s.material else "") for s in o.material_slots):
            o.data.materials.clear()
            o.data.materials.append(material)


def retint(root, color):
    """Tint an asset's textured materials toward `color`, keeping their
    light and dark detail (a grey crate from a blue one)."""
    done = set()
    for o in _meshes(root):
        for s in o.material_slots:
            m = s.material
            if not m or m.name in done or not m.use_nodes:
                continue
            done.add(m.name)
            nt = m.node_tree
            p = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
            if p is None or not p.inputs["Base Color"].is_linked:
                continue
            src = p.inputs["Base Color"].links[0].from_socket
            bw = nt.nodes.new("ShaderNodeRGBToBW")
            nt.links.new(src, bw.inputs["Color"])
            img = next((n.image for n in nt.nodes if n.type == "TEX_IMAGE" and n.image), None)
            mean = sum(_mean_linear(img)) / 3 if img else 0.5
            gain = nt.nodes.new("ShaderNodeMath")
            gain.operation = "MULTIPLY"
            gain.inputs[1].default_value = 1 / max(mean, 1e-3)
            nt.links.new(bw.outputs["Val"], gain.inputs[0])
            mix = nt.nodes.new("ShaderNodeMix")
            mix.data_type = "RGBA"
            mix.blend_type = "MULTIPLY"
            mix.inputs["Factor"].default_value = 1.0
            mix.inputs["B"].default_value = hex_rgb(color)
            nt.links.new(gain.outputs["Value"], mix.inputs["A"])
            nt.links.new(mix.outputs["Result"], p.inputs["Base Color"])


def asset(k, asset_id, at, rot=0.0, height=None, width=None, depth=None, ratio=None, drop=None):
    """A Poly Haven model turned `rot` about y, fitted to a size, standing
    on `at`, decimated to `ratio` of its triangles; parts whose material
    names contain `drop` are left out first (a plant without its pot)."""
    root = k.asset(asset_id, (0, 0, 0), (0, rot, 0), 1.0)
    if drop:
        drop_parts(root, drop)
    fit(k, root, at, height, width, depth)
    if ratio:
        decimate(root, ratio)
    return root


def tris(objs):
    """Triangles after modifiers (decimate, bevel, curves), for the budget."""
    dg = bpy.context.evaluated_depsgraph_get()
    n = 0
    for o in objs:
        if o.type not in {"MESH", "CURVE", "FONT"}:
            continue
        me = o.evaluated_get(dg).to_mesh()
        n += sum(len(p.vertices) - 2 for p in me.polygons)
        o.evaluated_get(dg).to_mesh_clear()
    return n
