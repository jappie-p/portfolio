"""The desk itself (bible 3.5 and light L5): an oak butcher-block top on a
black steel frame with two T-legs, a cable tray with its cable drop, three
grommets, and the warm LED strip under the back edge."""

import math

import bpy

from space import T

from decor import _a_tex as tx
from decor._a_util import cubes, rbox, tube

X0, X1, Z0, Z1 = 0.65, 3.4, 0.1, 0.9
TOP, THICK = 0.74, 0.045
UNDER = TOP - THICK


def butcher_block(k):
    """Oak in 4 cm strips along x, each strip its own slice of the veneer
    and its own tone, tinted #c89c62."""
    name = "a_butcher_block"
    if name in k.mats:
        return k.mats[name]
    m, nt, p = tx.new_mat(name)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = tx.node(nt, "ShaderNodeSeparateXYZ")
    tx.link(nt, tc.outputs["Object"], sep.inputs[0])
    strip = tx.node(nt, "ShaderNodeMath")
    strip.operation = "FLOOR"
    div = tx.node(nt, "ShaderNodeMath")
    div.operation = "DIVIDE"
    div.inputs[1].default_value = 0.04
    tx.link(nt, sep.outputs["Y"], div.inputs[0])
    tx.link(nt, div.outputs[0], strip.inputs[0])
    noise = tx.node(nt, "ShaderNodeTexWhiteNoise")
    noise.noise_dimensions = "1D"
    tx.link(nt, strip.outputs[0], noise.inputs["W"])
    shift = tx.node(nt, "ShaderNodeCombineXYZ")
    for axis, f in (("X", 11.0), ("Z", 3.0)):
        mul = tx.node(nt, "ShaderNodeMath")
        mul.operation = "MULTIPLY"
        mul.inputs[1].default_value = f
        tx.link(nt, noise.outputs["Value"], mul.inputs[0])
        tx.link(nt, mul.outputs[0], shift.inputs[axis])
    vec = tx.coords(nt, 1.5, offset=shift.outputs["Vector"])
    diff = tx.image(tx.tex_file("oak_veneer_01", "diff"))
    col = tx.tinted(nt, tx.box_image(nt, diff, vec).outputs["Color"], diff, "#c89c62", 1.2)
    gain = tx.node(nt, "ShaderNodeMapRange", **{"To Min": 0.88, "To Max": 1.08})
    tx.link(nt, noise.outputs["Value"], gain.inputs["Value"])
    sc = tx.node(nt, "ShaderNodeVectorMath")
    sc.operation = "SCALE"
    tx.link(nt, col, sc.inputs[0])
    tx.link(nt, gain.outputs["Result"], sc.inputs["Scale"])
    tx.link(nt, sc.outputs[0], p.inputs["Base Color"])
    r = tx.box_image(nt, tx.image(tx.tex_file("oak_veneer_01", "rough"), True), vec)
    tx.link(nt, tx.rough_range(nt, r.outputs["Color"], 0.26, 0.36), p.inputs["Roughness"])
    tx.link(nt, tx.normal_map(nt, tx.image(tx.tex_file("oak_veneer_01", "nor"), True), vec, 0.3), p.inputs["Normal"])
    m["gloss"] = False
    k.mats[name] = m
    return m


def steel(k):
    return k.mat("a_steel_black", "#1b1b1b", 0.42, bump=0.03, bump_scale=400.0)


def top(k):
    k.box("desk_top", (X1 - X0, THICK, Z1 - Z0), ((X0 + X1) / 2, TOP - THICK / 2, (Z0 + Z1) / 2), butcher_block(k), bevel=0.006)


def frame(k):
    """Two rails along x, two T-legs (post, foot, top bar), levelling feet."""
    s = steel(k)
    rails = [((2.025, UNDER - 0.015, z), (2.5, 0.03, 0.04)) for z in (0.2, 0.8)]
    legs = []
    for x in (0.75, 3.3):
        legs += [
            ((x, (0.03 + UNDER - 0.03) / 2, 0.5), (0.05, UNDER - 0.06, 0.05)),
            ((x, 0.018, 0.5), (0.06, 0.03, 0.72)),
            ((x, UNDER - 0.015, 0.5), (0.05, 0.03, 0.72)),
        ]
    cubes(k, "desk_frame", rails + legs, s, bevel=0.003)
    feet = k.mat("a_foot_black", "#121212", 0.6)
    cubes(k, "desk_feet", [((x, 0.0015, z), (0.05, 0.003, 0.04)) for x in (0.75, 3.3) for z in (0.17, 0.83)], feet, bevel=0.001)


def tray(k):
    """A black mesh cable tray under the middle of the top, and the cables
    that drop out of it to the floor behind the left pedestal."""
    mesh = k.mat("a_tray", "#202020", 0.55, bump=0.4, bump_scale=900.0)
    x, y, z = 1.9, 0.63, 0.55
    w, h, d = 1.2, 0.08, 0.12
    cubes(k, "cable_tray", [
        ((x, y - h / 2, z), (w, 0.003, d)),
        ((x, y, z - d / 2), (w, h, 0.003)),
        ((x, y, z + d / 2), (w, h, 0.003)),
        ((x - w / 2, y, z), (0.003, h, d)),
        ((x + w / 2, y, z), (0.003, h, d)),
        ((x - 0.45, (y + UNDER) / 2, z), (0.03, UNDER - y, 0.004)),
        ((x + 0.45, (y + UNDER) / 2, z), (0.03, UNDER - y, 0.004)),
    ], mesh, bevel=0.001)
    cable = k.mat("a_cable_black", "#161616", 0.45)
    white = k.mat("a_cable_white", "#e8e4dc", 0.4)
    for i, (m, dz) in enumerate(((cable, -0.02), (cable, 0.0), (white, 0.02))):
        pts = [(1.5 - i * 0.04, y - 0.01, z + dz), (1.34, 0.5, 0.44 + dz), (1.31, 0.28, 0.36 + dz * 0.3), (1.32, 0.04, 0.3 + dz * 0.3), (1.28, 0.004, 0.26 + dz)]
        tube(k, f"tray_cable_{i}", pts, 0.004, m, res=6)
    k.cylinder("velcro", 0.016, 0.03, (1.31, 0.27, 0.36), k.mat("a_velcro", "#2a2a2a", 0.9), bevel=0.002, verts=16)


def grommets(k):
    ring = k.mat("a_grommet", "#141414", 0.5)
    hole = k.mat("a_hole", "#050505", 0.9)
    for x in (1.3, 2.2, 3.0):
        k.cylinder(f"grommet_{x}", 0.03, 0.003, (x, TOP - 0.0005, 0.2), ring, bevel=0.0012, verts=28)
        k.cylinder(f"grommet_hole_{x}", 0.022, 0.0035, (x, TOP - 0.0003, 0.2), hole, bevel=0.0, verts=24)


def led_strip(k):
    """L5: a 2700 K strip under the back edge (emission 8) and a matching
    area light, so the wall under the desk and the pedestals get a warm wash."""
    rbox(k, "desk_led", (2.6, 0.004, 0.01), (2.05, UNDER - 0.002, 0.13), tx.glow(k, "a_led_desk", "#ffc37a", 8.0), radius=0.0015, segments=1)
    data = bpy.data.lights.new("L5_desk_strip", "AREA")
    data.shape = "RECTANGLE"
    data.size, data.size_y = 2.5, 0.02
    data.energy = 18.0
    data.color = (1.0, 0.76, 0.48)
    obj = bpy.data.objects.new("L5_desk_strip", data)
    obj.location = T(2.05, UNDER - 0.006, 0.13)
    # face down and a little back toward the wall
    obj.rotation_euler = (math.radians(20), 0, 0)
    k.link(obj)


def build_desk(k):
    top(k)
    frame(k)
    tray(k)
    grommets(k)
    led_strip(k)
