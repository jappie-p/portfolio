"""Write the baked room as one GLB for the site: each baked group joined
into one mesh with its atlas, the live parts as they are, and the markers
(pins, views) as empty nodes. Everything carries its story in `extras`."""

import os

import bpy

from bake import SCALE, _principled, _select

OUT = os.path.join("public", "room", "room.glb")


def _baked_material(name, image, kind, gloss):
    m = bpy.data.materials.new(f"baked_{name}")
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    uv = nt.nodes.new("ShaderNodeUVMap")
    uv.uv_map = "bake"
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = image
    nt.links.new(uv.outputs["UV"], tex.inputs["Vector"])
    nt.links.new(tex.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = gloss[0] if kind == "gloss" else 1.0
    p.inputs["Metallic"].default_value = gloss[1] if kind == "gloss" else 0.0
    if kind == "cutout":
        nt.links.new(tex.outputs["Alpha"], p.inputs["Alpha"])
        m.blend_method = "CLIP" if hasattr(m, "blend_method") else None
    return m


def _gloss_of(objs):
    """The group's average roughness, metalness and base colour (for its
    live reflections: a metal reflects in its own colour)."""
    r, mt, n = 0.0, 0.0, 0
    tint = [0.0, 0.0, 0.0]
    for o in objs:
        p = _principled(o.active_material)
        if p:
            r += p.inputs["Roughness"].default_value
            mt += p.inputs["Metallic"].default_value
            c = p.inputs["Base Color"].default_value
            tint = [t + c[i] for i, t in enumerate(tint)]
            n += 1
    if not n:
        return (0.4, 0.0, [0.8, 0.8, 0.8])
    return (r / n, mt / n, [t / n for t in tint])


def _story(coll):
    return coll[len("story_") :] if coll.startswith("story_") else ""


def write(baked, here):
    root = os.path.abspath(os.path.join(here, "..", ".."))
    # free every mesh from its parent (asset roots), keeping where it is
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    _select(meshes)
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    for name, (objs, kind, image, _size) in baked.items():
        if kind == "live":
            for o in objs:
                coll = next((c.name for c in o.users_collection if c.name.startswith(("story_", "decor_"))), "")
                o["story"] = _story(coll)
                o["kind"] = "live"
            continue
        gloss = _gloss_of(objs)
        mat = _baked_material(name, image, kind, gloss)
        for o in objs:
            o.data.materials.clear()
            o.data.materials.append(mat)
        _select(objs)
        bpy.ops.object.join()
        joined = bpy.context.view_layer.objects.active
        joined.name = name
        uv = joined.data.uv_layers
        for layer in [l for l in uv if l.name != "bake"]:
            uv.remove(layer)
        uv["bake"].active_render = True
        coll = name.split("__")[0]
        joined["story"] = _story(coll)
        joined["kind"] = kind
        joined["scale"] = SCALE
        if kind == "gloss":
            joined["tint"] = gloss[2]
    # only meshes and the site's markers go out
    for o in list(bpy.context.scene.objects):
        if o.type in {"LIGHT", "CAMERA"} or (o.type == "EMPTY" and not o.name.startswith(("pin_", "view_"))):
            bpy.data.objects.remove(o, do_unlink=True)
    path = os.path.join(root, OUT)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_image_format="WEBP",
        export_image_quality=84,
        export_extras=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_yup=True,
    )
    print(f"[export] {path} {os.path.getsize(path) / 1e6:.1f} MB", flush=True)
