"""Builder C's Poly Haven helpers: fit an asset to a size, recolour it,
thin it out under the triangle budget."""

import bpy

from kit import hex_rgb


def meshes(root):
    return [o for o in [root, *root.children_recursive] if o.type == "MESH"]


def fit(k, root, height=None, width=None):
    """Scale an asset's root so it stands `height` tall (or `width` wide)."""
    bpy.context.view_layer.update()
    lo, hi = k.bounds(root)
    if height:
        f = height / max(hi[1] - lo[1], 1e-6)
    else:
        f = width / max(hi[0] - lo[0], hi[2] - lo[2], 1e-6)
    root.scale = tuple(s * f for s in root.scale)
    bpy.context.view_layer.update()
    return f


def tint(root, color, keep=0.0):
    """Recolour an asset: its texture's light and shade, in `color` (keep
    blends some of the original colour back in). Materials are copied
    first, so other imports of the same asset keep theirs."""
    rgb = hex_rgb(color)
    done = {}
    for o in meshes(root):
        for slot in o.material_slots:
            m = slot.material
            if m is None:
                continue
            if m.name not in done:
                done[m.name] = _tinted(m.copy(), rgb, keep)
            slot.material = done[m.name]


def _tinted(m, rgb, keep):
    nt = m.node_tree
    p = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if p is None:
        return m
    base = p.inputs["Base Color"]
    if not base.is_linked:
        base.default_value = rgb
        return m
    src = base.links[0].from_socket
    bw = nt.nodes.new("ShaderNodeRGBToBW")
    nt.links.new(src, bw.inputs["Color"])
    gain = nt.nodes.new("ShaderNodeMath")
    gain.operation = "MULTIPLY"
    gain.inputs[1].default_value = 2.2
    nt.links.new(bw.outputs["Val"], gain.inputs[0])
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.inputs["Factor"].default_value = 1.0
    mul.inputs["A"].default_value = rgb
    nt.links.new(gain.outputs["Value"], mul.inputs["B"])
    out = mul.outputs["Result"]
    if keep:
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.inputs["Factor"].default_value = keep
        nt.links.new(out, mix.inputs["A"])
        nt.links.new(src, mix.inputs["B"])
        out = mix.outputs["Result"]
    nt.links.new(out, base)
    return m


def decimate(root, ratio, **by_name):
    """Thin an asset out; `by_name` sets other ratios for meshes whose
    name contains the key (dirt=0.05)."""
    for o in meshes(root):
        d = o.modifiers.new("decimate", "DECIMATE")
        d.ratio = next((r for key, r in by_name.items() if key in o.name), ratio)

