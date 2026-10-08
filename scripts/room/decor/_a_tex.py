"""Builder A's materials: Poly Haven textures (CC0, fetched once into
.room-cache/polyhaven/<id>/tex/) laid on by object coordinates, so no mesh
needs a UV map, plus the procedural fabrics, plastics and metals of the
desk corner. Everything here bakes in Cycles."""

import json
import os

import bpy
import numpy as np

from assets import CACHE, _get
from kit import hex_rgb

API = "https://api.polyhaven.com/files/"
MAPS = {"diff": "Diffuse", "rough": "Rough", "nor": "nor_gl"}


def tex_file(asset_id, kind, res="1k"):
    """The local path of one of a Poly Haven texture's maps."""
    meta = os.path.join(CACHE, asset_id, "files.json")
    _get(API + asset_id, meta)
    with open(meta) as f:
        entry = json.load(f)[MAPS[kind]][res]["jpg"]
    return _get(entry["url"], os.path.join(CACHE, asset_id, "tex", os.path.basename(entry["url"])))


def image(path, data=False):
    img = bpy.data.images.load(path, check_existing=True)
    if data:
        img.colorspace_settings.name = "Non-Color"
    return img


def mean_srgb(img):
    """An image's average colour (its stored sRGB values)."""
    px = np.empty(img.size[0] * img.size[1] * img.channels, dtype=np.float32)
    img.pixels.foreach_get(px)
    return px.reshape(-1, img.channels)[:, :3].mean(axis=0)


def _lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    return m, m.node_tree, m.node_tree.nodes["Principled BSDF"]


def node(nt, kind, **inputs):
    n = nt.nodes.new(kind)
    for key, v in inputs.items():
        n.inputs[key].default_value = v
    return n


def link(nt, a, b):
    nt.links.new(a, b)


def coords(nt, size, rot=(0.0, 0.0, 0.0), offset=None):
    """Object coordinates in units of the texture's real size (metres);
    `offset` is a socket added before scaling (per-plank shifts)."""
    tc = nt.nodes.new("ShaderNodeTexCoord")
    vec = tc.outputs["Object"]
    if offset is not None:
        add = node(nt, "ShaderNodeVectorMath")
        add.operation = "ADD"
        link(nt, vec, add.inputs[0])
        link(nt, offset, add.inputs[1])
        vec = add.outputs[0]
    mp = node(nt, "ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1 / size,) * 3
    mp.inputs["Rotation"].default_value = rot
    link(nt, vec, mp.inputs["Vector"])
    return mp.outputs["Vector"]


def box_image(nt, img, vec):
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = img
    t.projection = "BOX"
    t.projection_blend = 0.25
    link(nt, vec, t.inputs["Vector"])
    return t


def tinted(nt, color_socket, img, target, contrast=1.0):
    """Recolour a texture so its average is `target` (hex), keeping its
    grain; `contrast` scales the grain around that average."""
    mean = mean_srgb(img)
    mean_lin = [_lin(float(c)) for c in mean]
    tgt = hex_rgb(target)
    flat = node(nt, "ShaderNodeMix")
    flat.data_type = "RGBA"
    flat.clamp_factor = False
    flat.inputs["Factor"].default_value = contrast
    flat.inputs["A"].default_value = (*mean_lin, 1.0)
    link(nt, color_socket, flat.inputs["B"])
    mul = node(nt, "ShaderNodeVectorMath")
    mul.operation = "MULTIPLY"
    link(nt, flat.outputs["Result"], mul.inputs[0])
    mul.inputs[1].default_value = tuple(t / max(m, 1e-4) for t, m in zip(tgt[:3], mean_lin))
    return mul.outputs[0]


def rough_range(nt, socket, lo, hi):
    mr = node(nt, "ShaderNodeMapRange", **{"To Min": lo, "To Max": hi})
    link(nt, socket, mr.inputs["Value"])
    return mr.outputs["Result"]


def normal_map(nt, img, vec, strength):
    t = box_image(nt, img, vec)
    nm = node(nt, "ShaderNodeNormalMap", Strength=strength)
    link(nt, t.outputs["Color"], nm.inputs["Color"])
    return nm.outputs["Normal"]


def pbr(k, name, asset_id, color, size, rough=(0.3, 0.5), normal=0.5, contrast=1.0, rot=(0.0, 0.0, 0.0), offset=None):
    """A Poly Haven texture tinted to `color`, `size` metres per tile.
    Returns the material (made once per name)."""
    if name in k.mats:
        return k.mats[name]
    m, nt, p = new_mat(name)
    vec = coords(nt, size, rot, offset(nt) if offset else None)
    diff = image(tex_file(asset_id, "diff"))
    t = box_image(nt, diff, vec)
    link(nt, tinted(nt, t.outputs["Color"], diff, color, contrast), p.inputs["Base Color"])
    r = box_image(nt, image(tex_file(asset_id, "rough"), True), vec)
    link(nt, rough_range(nt, r.outputs["Color"], *rough), p.inputs["Roughness"])
    if normal:
        link(nt, normal_map(nt, image(tex_file(asset_id, "nor"), True), vec, normal), p.inputs["Normal"])
    m["gloss"] = False
    k.mats[name] = m
    return m


def fabric(k, name, color, scale=900.0, bump=0.25, rough=1.0, sheen=0.3, mottle=0.1):
    """A woven fabric: a fine crosshatch of two wave textures as bump and a
    slow colour mottle (chair mesh, cushion, deskmat, jacket)."""
    if name in k.mats:
        return k.mats[name]
    m, nt, p = new_mat(name)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Sheen Weight"].default_value = sheen
    tc = nt.nodes.new("ShaderNodeTexCoord")
    waves = []
    for axis in ("X", "Y"):
        w = node(nt, "ShaderNodeTexWave", Scale=scale, Distortion=0.4)
        w.bands_direction = axis
        link(nt, tc.outputs["Object"], w.inputs["Vector"])
        waves.append(w)
    mul = node(nt, "ShaderNodeMath")
    mul.operation = "MULTIPLY"
    link(nt, waves[0].outputs["Fac"], mul.inputs[0])
    link(nt, waves[1].outputs["Fac"], mul.inputs[1])
    b = node(nt, "ShaderNodeBump", Strength=bump, Distance=0.002)
    link(nt, mul.outputs[0], b.inputs["Height"])
    link(nt, b.outputs["Normal"], p.inputs["Normal"])
    n = node(nt, "ShaderNodeTexNoise", Scale=6.0, Detail=4.0)
    link(nt, tc.outputs["Object"], n.inputs["Vector"])
    mix = node(nt, "ShaderNodeMix", Factor=mottle)
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["A"].default_value = hex_rgb(color)
    link(nt, n.outputs["Color"], mix.inputs["B"])
    link(nt, mix.outputs["Result"], p.inputs["Base Color"])
    m["gloss"] = False
    k.mats[name] = m
    return m


def glow(k, name, color, strength):
    """A surface that gives off light (LED strips, the lamp's inner shade)."""
    return k.mat(name, color, 0.4, emission=color, strength=strength)


def glass(k, name="a_glass", tint="#ffffff", rough=0.0):
    m = k.mat(name, tint, rough, transmission=1.0)
    m.node_tree.nodes["Principled BSDF"].inputs["IOR"].default_value = 1.45
    # (Eevee previews only: see through it instead of a grey film)
    m.use_raytrace_refraction = True
    m.surface_render_method = "DITHERED"
    return m


def _recolour(nt, sock, color, grain):
    """Wire `color` into a Base Color socket, keeping the light and dark of
    whatever texture fed it (scaled by `grain`)."""
    tgt = hex_rgb(color)
    src = sock.links[0].from_socket if sock.is_linked else None
    if src is None:
        sock.default_value = tgt
        return
    img = getattr(src.node, "image", None)
    mean = mean_srgb(img) if img is not None and img.size[0] else np.array([0.5, 0.5, 0.5])
    mean_l = max(_lin(float(0.2126 * mean[0] + 0.7152 * mean[1] + 0.0722 * mean[2])), 1e-3)
    bw = nt.nodes.new("ShaderNodeRGBToBW")
    link(nt, src, bw.inputs["Color"])
    ratio = node(nt, "ShaderNodeMath")
    ratio.operation = "MULTIPLY_ADD"
    link(nt, bw.outputs["Val"], ratio.inputs[0])
    ratio.inputs[1].default_value = grain / mean_l
    ratio.inputs[2].default_value = 1 - grain
    mul = node(nt, "ShaderNodeVectorMath")
    mul.operation = "SCALE"
    mul.inputs[0].default_value = tgt[:3]
    link(nt, ratio.outputs[0], mul.inputs["Scale"])
    link(nt, mul.outputs[0], sock)


def retint(obj, color, grain=0.8, suffix=None):
    """Recolour an imported model to `color` (hex), keeping its texture's
    light and dark, on copies so other users of the asset keep theirs."""
    for slot in obj.material_slots:
        m = slot.material
        if m is None or not m.use_nodes:
            continue
        key = f"{m.name}_{suffix or color}"
        copy = bpy.data.materials.get(key)
        if copy is None:
            copy = m.copy()
            copy.name = key
            nt = copy.node_tree
            p = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
            _recolour(nt, p.inputs["Base Color"], color, grain)
        slot.material = copy
