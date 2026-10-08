"""The suit's materials: matte black leather with a pebbled grain, a slow
mottle and roughness that wanders, charcoal panels in the same leather,
perforated chest leather (a dot grid on the hide's UVs, which are its
front view in metres), stretch textile, and the small parts. All opaque,
all bake in Cycles."""

import bpy

from kit import hex_rgb


def _node(nt, kind, **inputs):
    n = nt.nodes.new(kind)
    for key, v in inputs.items():
        n.inputs[key].default_value = v
    return n


def _new(k, name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m["gloss"] = False
    k.mats[name] = m
    return m, m.node_tree, m.node_tree.nodes["Principled BSDF"]


def leather(k, name, color, rough=0.52, coat=0.22, grain=0.12, mottle=0.14):
    """Race leather: fine pebbled grain, a slow light/dark mottle, roughness
    wandering about `rough`, a light coat for the soft sheen."""
    if name in k.mats:
        return k.mats[name]
    m, nt, p = _new(k, name)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    vor = _node(nt, "ShaderNodeTexVoronoi", Scale=1300.0)
    nt.links.new(tc.outputs["Object"], vor.inputs["Vector"])
    bump = _node(nt, "ShaderNodeBump", Strength=grain, Distance=0.0004)
    nt.links.new(vor.outputs["Distance"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], p.inputs["Normal"])
    slow = _node(nt, "ShaderNodeTexNoise", Scale=9.0, Detail=3.0)
    nt.links.new(tc.outputs["Object"], slow.inputs["Vector"])
    mix = _node(nt, "ShaderNodeMix", Factor=mottle)
    mix.data_type = "RGBA"
    mix.blend_type = "OVERLAY"
    mix.inputs["A"].default_value = hex_rgb(color)
    nt.links.new(slow.outputs["Color"], mix.inputs["B"])
    nt.links.new(mix.outputs["Result"], p.inputs["Base Color"])
    rr = _node(nt, "ShaderNodeMapRange", **{"From Min": 0.3, "From Max": 0.7, "To Min": rough - 0.07, "To Max": rough + 0.07})
    nt.links.new(slow.outputs["Fac"], rr.inputs["Value"])
    nt.links.new(rr.outputs["Result"], p.inputs["Roughness"])
    p.inputs["Coat Weight"].default_value = coat
    p.inputs["Coat Roughness"].default_value = 0.32
    return m


def perforated(k, name, color, rough=0.6, pitch=0.0042, hole=0.21):
    """Leather punched with a square grid of small holes, `pitch` apart."""
    if name in k.mats:
        return k.mats[name]
    m, nt, p = _new(k, name)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    vor = _node(nt, "ShaderNodeTexVoronoi", Scale=1.0 / pitch, Randomness=0.0)
    vor.voronoi_dimensions = "2D"
    nt.links.new(tc.outputs["UV"], vor.inputs["Vector"])
    mask = _node(nt, "ShaderNodeMapRange", **{"From Min": hole * 0.75, "From Max": hole, "To Min": 1.0, "To Max": 0.0})
    nt.links.new(vor.outputs["Distance"], mask.inputs["Value"])
    mix = _node(nt, "ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs["A"].default_value = hex_rgb(color)
    mix.inputs["B"].default_value = hex_rgb("#020202")
    nt.links.new(mask.outputs["Result"], mix.inputs["Factor"])
    nt.links.new(mix.outputs["Result"], p.inputs["Base Color"])
    rr = _node(nt, "ShaderNodeMapRange", **{"To Min": rough, "To Max": 0.95})
    nt.links.new(mask.outputs["Result"], rr.inputs["Value"])
    nt.links.new(rr.outputs["Result"], p.inputs["Roughness"])
    inv = _node(nt, "ShaderNodeMath", Value=1.0)
    inv.operation = "SUBTRACT"
    nt.links.new(mask.outputs["Result"], inv.inputs[1])
    bump = _node(nt, "ShaderNodeBump", Strength=0.35, Distance=0.0005)
    nt.links.new(inv.outputs["Value"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], p.inputs["Normal"])
    p.inputs["Coat Weight"].default_value = 0.12
    p.inputs["Coat Roughness"].default_value = 0.4
    return m


def materials(k):
    """Every material the suit uses, by key."""
    return dict(
        leather=leather(k, "suit_leather", "#121214", 0.5),
        alt=leather(k, "suit_leather_charcoal", "#303136", 0.56, coat=0.16, mottle=0.12),
        perf=perforated(k, "suit_perforated", "#16171a"),
        stretch=k.mat("suit_stretch", "#141416", 0.8, bump=0.35, bump_scale=420),
        trim=k.mat("suit_trim", "#19191b", 0.7, bump=0.15, bump_scale=600),
        lining=k.mat("suit_lining", "#0a0a0b", 0.95),
        welt=leather(k, "suit_welt", "#3a3b3f", 0.46, coat=0.2, grain=0.04, mottle=0.06),
        armour=leather(k, "suit_armour", "#141517", 0.44, coat=0.3, mottle=0.1),
        slider=k.mat("suit_slider", "#4a4c51", 0.42, coat=0.25, coat_rough=0.3),
        puck=k.mat("suit_puck", "#43454a", 0.55, bump=0.08, bump_scale=200),
        velcro=k.mat("suit_velcro", "#1f2022", 0.95, bump=0.3, bump_scale=500),
        flash=k.mat("suit_flash", "#ebe8e1", 0.45, coat=0.2),
        green=k.mat("brand_green", "#1f4a32", 0.35, coat=0.6),
        zip=k.mat("suit_zip", "#4b4e53", 0.35, metal=1.0),
        tape=k.mat("suit_tape", "#111113", 0.85),
        hanger=k.mat("hanger_steel", "#1b1c1e", 0.4, metal=0.5),
        boss=k.mat("hanger_plastic", "#141416", 0.45),
    )
