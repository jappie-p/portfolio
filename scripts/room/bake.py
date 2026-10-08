"""Bake the room's light into textures with Cycles.

Every part of the room is grouped by its collection (a story piece, the
shell, a decor group) and by how it is drawn on the site:

    matte   the light baked in, drawn as is
    gloss   the light baked in, with live reflections on top (metal, gloss)
    cutout  like matte, with the alpha of its leaves kept (plants)
    live    not baked: screens, LEDs, lamp shades, glass keep their own
            materials (they give off light, or are seen through)

Each group's objects get one shared lightmap UV and one atlas; the atlas
holds radiance (light times colour, glossy left out) scaled by `SCALE` so
the brightest patches of sun survive 8 bits. The site multiplies it back.
"""

import math
import os
import time

import bpy
import numpy as np

# radiance is stored at this fraction (the site divides by it)
SCALE = 0.5
SAMPLES = int(os.environ.get("ROOM_SAMPLES", "128"))
# ROOM_REUSE=1: take each group's atlas and lightmap UVs from the last bake
# instead of baking it again (for changes to live parts only: screens, glass,
# the backdrop). The UVs are saved, not unwrapped again: island packing does
# not come out the same twice. A group whose objects changed is baked anew.
REUSE = os.environ.get("ROOM_REUSE") == "1"
# atlas size from a group's surface: pixels per metre, and the bounds
DENSITY = {"story": 520, "decor": 380, "shell": 260}
SIZES = (256, 2048)


def _select(objs, active=None):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = active or (objs[0] if objs else None)


def prepare():
    """Everything a mesh, modifiers applied, one material per object."""
    scene_objs = [o for o in bpy.context.scene.objects]
    convert = [o for o in scene_objs if o.type in {"CURVE", "FONT", "SURFACE", "META"} or (o.type == "MESH" and len(o.modifiers))]
    if convert:
        _select(convert)
        bpy.ops.object.convert(target="MESH")
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    # make instanced data single-user, so each object can carry its own UVs
    for o in meshes:
        if o.data.users > 1:
            o.data = o.data.copy()
    multi = [o for o in meshes if len([s for s in o.material_slots if s.material]) > 1]
    for o in multi:
        _select([o])
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.mesh.separate(type="MATERIAL")
        bpy.ops.object.mode_set(mode="OBJECT")


def _principled(m):
    if not m or not m.use_nodes:
        return None
    return next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)


def kind_of(obj):
    m = obj.active_material
    p = _principled(m)
    if m is None or p is None:
        return "matte"
    if m.get("live"):
        return "live"
    if p.inputs["Emission Strength"].default_value > 0.01 and (p.inputs["Emission Color"].is_linked or max(p.inputs["Emission Color"].default_value[:3]) > 0.01):
        return "live"
    # glass is seen through, so it stays live; a half-translucent sail or
    # lamp shade is baked with the light it lets through
    if p.inputs["Transmission Weight"].default_value >= 0.95 or (not p.inputs["Alpha"].is_linked and p.inputs["Alpha"].default_value < 0.99):
        return "live"
    # (Blender 5 gives every material a dithered blend mode: only an alpha
    # actually wired in, or a material marked so, makes a cut-out)
    if p.inputs["Alpha"].is_linked or m.get("cutout"):
        return "cutout"
    metal = p.inputs["Metallic"].default_value
    rough = p.inputs["Roughness"].default_value
    if m.get("gloss") or metal > 0.5 or (not p.inputs["Roughness"].is_linked and rough < 0.3):
        return "gloss"
    return "matte"


def collection_of(obj):
    for c in obj.users_collection:
        if c.name.startswith(("story_", "decor_")):
            return c.name
    return "decor_misc"


def groups():
    out = {}
    for o in bpy.context.scene.objects:
        if o.type != "MESH" or not o.data.polygons:
            continue
        k = kind_of(o)
        key = (collection_of(o), k)
        out.setdefault(key, []).append(o)
    return out


def _area(objs):
    total = 0.0
    for o in objs:
        s = o.matrix_world.to_scale()
        k = abs(s.x * s.y * s.z) ** (2 / 3)
        total += sum(p.area for p in o.data.polygons) * k
    return total


def atlas_size(coll, objs):
    family = "shell" if coll == "decor_shell" else "story" if coll.startswith("story_") else "decor"
    px = math.sqrt(max(_area(objs), 1e-4)) * DENSITY[family]
    size = 2 ** round(math.log2(max(px, 1)))
    return int(min(max(size, SIZES[0]), SIZES[1]))


def _bake_layer(o):
    """The object's lightmap UV layer, made active for editing; the UVs its
    textures read stay the ones it renders with."""
    uv = o.data.uv_layers
    render = next((l for l in uv if l.active_render), None)
    bake = uv.get("bake") or uv.new(name="bake")
    uv.active = bake
    if render is not None and render != bake:
        render.active_render = True
    return bake


def unwrap(objs):
    """One shared lightmap UV ('bake') over all the group's objects; their
    own UVs stay what their textures read."""
    for o in objs:
        _bake_layer(o)
    _select(objs)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.0, area_weight=0.0, scale_to_bounds=False)
    bpy.ops.uv.average_islands_scale()
    bpy.ops.uv.pack_islands(margin=0.004, rotate=True)
    bpy.ops.object.mode_set(mode="OBJECT")


def _target(objs, image):
    """Point every material on the group at `image` for the bake."""
    nodes = []
    for o in objs:
        for slot in o.material_slots:
            m = slot.material
            if not m:
                continue
            m.use_nodes = True
            nt = m.node_tree
            n = nt.nodes.get("__bake__") or nt.nodes.new("ShaderNodeTexImage")
            n.name = "__bake__"
            n.image = image
            nt.nodes.active = n
            nodes.append(n)
    return nodes


def _bake_pass(objs, kind, margin):
    _select(objs)
    pf = {"DIRECT", "INDIRECT", "DIFFUSE", "TRANSMISSION", "EMIT"}
    bpy.ops.object.bake(type=kind, pass_filter=pf if kind == "COMBINED" else set(), margin=margin, margin_type="EXTEND", use_clear=True)


def _alpha_mask(objs, image):
    """Bake each material's alpha as emission into `image` (for cut-out leaves)."""
    saved = []
    for o in objs:
        for slot in o.material_slots:
            m = slot.material
            p = _principled(m)
            if not p:
                continue
            nt = m.node_tree
            out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL" and n.is_active_output)
            emit = nt.nodes.new("ShaderNodeEmission")
            if p.inputs["Alpha"].is_linked:
                nt.links.new(p.inputs["Alpha"].links[0].from_socket, emit.inputs["Color"])
            else:
                v = p.inputs["Alpha"].default_value
                emit.inputs["Color"].default_value = (v, v, v, 1)
            old = out.inputs["Surface"].links[0].from_socket if out.inputs["Surface"].is_linked else None
            nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
            saved.append((nt, out, old, emit))
    _target(objs, image)
    _bake_pass(objs, "EMIT", 4)
    for nt, out, old, emit in saved:
        if old is not None:
            nt.links.new(old, out.inputs["Surface"])
        nt.nodes.remove(emit)


def denoise(img, outdir):
    """The atlas through OIDN (the compositor's Denoise), as an (n, 4) array."""
    size = img.size[0]
    sc = bpy.data.scenes.get("__denoise__") or bpy.data.scenes.new("__denoise__")
    sc.render.resolution_x = sc.render.resolution_y = size
    sc.render.resolution_percentage = 100
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.use_compositing = True
    ng = sc.compositing_node_group
    if ng is None:
        ng = bpy.data.node_groups.new("__denoise__", "CompositorNodeTree")
        ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
        node = ng.nodes.new("CompositorNodeImage")
        node.name = "src"
        dn = ng.nodes.new("CompositorNodeDenoise")
        out = ng.nodes.new("NodeGroupOutput")
        ng.links.new(node.outputs["Image"], dn.inputs["Image"])
        ng.links.new(dn.outputs["Image"], out.inputs[0])
        sc.compositing_node_group = ng
    ng.nodes["src"].image = img
    with bpy.context.temp_override(scene=sc):
        bpy.ops.render.render(scene=sc.name)
    path = os.path.join(outdir, "__denoised__.exr")
    sc.render.image_settings.file_format = "OPEN_EXR"
    bpy.data.images["Render Result"].save_render(path, scene=sc)
    res = bpy.data.images.load(path, check_existing=False)
    px = np.empty(size * size * 4, dtype=np.float32)
    res.pixels.foreach_get(px)
    bpy.data.images.remove(res)
    return px.reshape(-1, 4)


def save_uvs(objs, path):
    """The group's lightmap UVs, by object, next to its atlas."""
    names, counts, uvs = [], [], []
    for o in objs:
        layer = o.data.uv_layers["bake"]
        a = np.empty(len(layer.data) * 2, dtype=np.float32)
        layer.data.foreach_get("uv", a)
        names.append(o.name)
        counts.append(len(layer.data))
        uvs.append(a)
    np.savez(path, names=np.array(names), counts=np.array(counts), uv=np.concatenate(uvs) if uvs else np.empty(0, np.float32))


def load_uvs(objs, path):
    """Put the saved lightmap UVs back; False if the group has changed."""
    if not os.path.exists(path):
        return False
    saved = np.load(path)
    if list(saved["names"]) != [o.name for o in objs] or list(saved["counts"]) != [len(o.data.loops) for o in objs]:
        return False
    at = 0
    for o, n in zip(objs, saved["counts"]):
        _bake_layer(o).data.foreach_set("uv", saved["uv"][at : at + n * 2])
        at += n * 2
    return True


def reuse(name, objs, size, outdir):
    """The last bake's atlas for this group, if it still fits it."""
    path = os.path.join(outdir, f"{name}.png")
    if not os.path.exists(path) or not load_uvs(objs, os.path.join(outdir, f"{name}.uv.npz")):
        return None
    out = bpy.data.images.load(path, check_existing=False)
    if tuple(out.size) != (size, size):
        bpy.data.images.remove(out)
        return None
    out.name = name + "_out"
    return out


def bake_group(name, objs, kind, outdir):
    size = atlas_size(name.split("__")[0], objs)
    if REUSE:
        out = reuse(name, objs, size, outdir)
        if out:
            print(f"[bake] {name}: reused", flush=True)
            return out, size
    t0 = time.time()
    unwrap(objs)
    save_uvs(objs, os.path.join(outdir, f"{name}.uv.npz"))
    t1 = time.time()
    path = os.path.join(outdir, f"{name}.png")
    img = bpy.data.images.new(name, size, size, float_buffer=True)
    _target(objs, img)
    _bake_pass(objs, "COMBINED", 8)
    print(f"[bake] {name}: unwrap {t1 - t0:.1f}s, light {time.time() - t1:.1f}s", flush=True)
    px = denoise(img, outdir)
    px[:, :3] *= SCALE
    px[:, 3] = 1.0
    if kind == "cutout":
        mask = bpy.data.images.new(name + "_a", size, size, float_buffer=True)
        _alpha_mask(objs, mask)
        a = np.empty(size * size * 4, dtype=np.float32)
        mask.pixels.foreach_get(a)
        px[:, 3] = a.reshape(-1, 4)[:, 0]
        bpy.data.images.remove(mask)
    # an 8-bit image holds sRGB-encoded values: encode the linear light, so
    # the site's sRGB decode gives it back with its darks intact
    rgb = np.clip(px[:, :3], 0, 1)
    px[:, :3] = np.where(rgb <= 0.0031308, rgb * 12.92, 1.055 * np.power(rgb, 1 / 2.4) - 0.055)
    out = bpy.data.images.new(name + "_out", size, size, alpha=kind == "cutout")
    out.pixels.foreach_set(np.clip(px, 0, 1).ravel())
    out.filepath_raw = path
    out.file_format = "PNG"
    out.save()
    bpy.data.images.remove(img)
    return out, size


def setup_cycles():
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = d.type == "METAL"
    print("[bake] devices:", [(d.name, d.type, d.use) for d in prefs.devices], flush=True)
    scene.cycles.device = "GPU"
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = False
    scene.cycles.max_bounces = 6
    scene.cycles.caustics_reflective = False
    scene.cycles.caustics_refractive = False
    scene.render.bake.margin_type = "EXTEND"


def bake_all(here, only=None):
    """Bake every group; returns {group name: (objects, kind, image, size)}."""
    outdir = os.path.join(here, "..", "..", ".room-cache", "bake")
    os.makedirs(outdir, exist_ok=True)
    setup_cycles()
    prepare()
    # glass lets the sun through: with caustics off Cycles would shadow it
    for o in bpy.context.scene.objects:
        p = _principled(o.active_material) if o.type == "MESH" else None
        if p and p.inputs["Transmission Weight"].default_value >= 0.95:
            o.visible_shadow = False
    baked = {}
    live = []
    for (coll, kind), objs in sorted(groups().items()):
        if kind == "live":
            live += objs
            continue
        name = f"{coll}__{kind}"
        if only and coll not in only:
            continue
        print(f"[bake] {name}: {len(objs)} objects", flush=True)
        image, size = bake_group(name, objs, kind, outdir)
        print(f"[bake] {name}: {size}px", flush=True)
        baked[name] = (objs, kind, image, size)
    baked["__live__"] = (live, "live", None, 0)
    return baked
