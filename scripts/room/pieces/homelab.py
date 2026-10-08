"""Story 02, homelab: the rack by the back wall (bible 3.26 to 3.29).

A black steel cabinet on castors with "JP." on the side you see, a smoked
glass door, rails with their holes, the gear (see decor/_b_rack.py), a
cable loom down the inside, the cyan glow (L6) and the things on top:
an oak board, a little robot speaker, a camera, a succulent, a framed
windsurf photo and the trailing pothos P3.
"""

import math

import bpy

from decor import _b_rack as rack
from decor._b_frames import standing_frame
from decor._b_pothos import pothos
from decor._b_util import asset, cable, disc, glass, matte, oak
from light import aim
from space import T

X0, X1 = 4.32, 4.92  # cabinet sides
Z0, Z1 = 0.12, 0.72  # back and front
FOOT, TOP = 0.04, 1.55  # body bottom (on castors) and top
CX, CZ = (X0 + X1) / 2, (Z0 + Z1) / 2
FONT = "/System/Library/Fonts/Avenir Next.ttc"


def steel(k):
    return k.mat("b_rack_steel", "#1d1d1d", 0.45, metal=0.5, bump=0.015, bump_scale=700)


def cabinet(k):
    """Sides, top with a lip, plinth, back, castors, the side vent and the
    lettering."""
    s = steel(k)
    t = 0.018
    for i, x in enumerate((X0 + t / 2, X1 - t / 2)):
        k.box(f"rack_side{i}", (t, TOP - FOOT - 0.06, Z1 - Z0), (x, (TOP + FOOT) / 2 - 0.01, CZ), s, bevel=0.003)
    k.box("rack_top", (X1 - X0 + 0.01, 0.04, Z1 - Z0 + 0.01), (CX, TOP - 0.02, CZ), s, bevel=0.003)
    k.box("rack_plinth", (X1 - X0, 0.04, Z1 - Z0), (CX, FOOT + 0.02, CZ), s, bevel=0.003)
    k.box("rack_back", (X1 - X0 - 2 * t, TOP - FOOT - 0.08, 0.012), (CX, (TOP + FOOT) / 2, Z0 + 0.006), matte(k, "#121212", 0.6), bevel=0.0)
    for i, (x, z) in enumerate([(X0 + 0.04, Z0 + 0.04), (X1 - 0.04, Z0 + 0.04), (X0 + 0.04, Z1 - 0.04), (X1 - 0.04, Z1 - 0.04)]):
        k.box(f"rack_castor{i}_plate", (0.045, 0.006, 0.045), (x, FOOT - 0.003, z), matte(k, "#141414", 0.5), bevel=0.001)
        k.cylinder(f"rack_castor{i}", 0.017, 0.014, (x + 0.007, 0.017, z), matte(k, "#151515", 0.6), 0.003, rot=(0, 0, 90), verts=16)
    slot = matte(k, "#050505", 0.9)
    for i in range(20):
        k.box(f"rack_vent{i}", (0.0006, 0.0018, 0.3), (X1 + 0.0002, 1.1 + i * 0.0125, CZ), slot, bevel=0.0)
    text = k.text("rack_jp", "JP.", 0.141, (X0 - 0.0006, 0.95, CZ), k.mat("b_rack_letters", "#d9d4c8", 0.5), rot=(0, -90, 0), extrude=0.0005, font=FONT)
    text.data.resolution_u = 5


def door(k):
    """A steel frame 3 cm wide round a smoked glass pane, hinged on the
    right, a vertical handle bar and a lock on the left."""
    s = steel(k)
    f, d = 0.03, 0.02
    y0, y1 = FOOT + 0.042, TOP - 0.042
    x0, x1 = X0 + 0.002, X1 - 0.002
    zc = Z1 - d / 2
    h = y1 - y0
    parts = [((x1 - x0, f, d), ((x0 + x1) / 2, y0 + f / 2)), ((x1 - x0, f, d), ((x0 + x1) / 2, y1 - f / 2)), ((f, h - 2 * f, d), (x0 + f / 2, (y0 + y1) / 2)), ((f, h - 2 * f, d), (x1 - f / 2, (y0 + y1) / 2))]
    for i, (size, (x, y)) in enumerate(parts):
        k.box(f"rack_door{i}", size, (x, y, zc), s, bevel=0.003)
    pane = glass(k, "b_rack_glass", "#1e2a26", 0.03, alpha=0.32)
    k.box("rack_glass", (x1 - x0 - 2 * f + 0.01, h - 2 * f + 0.01, 0.004), ((x0 + x1) / 2, (y0 + y1) / 2, zc - 0.002), pane, bevel=0.0)
    hx = x0 + f / 2
    bar = k.mat("b_rack_handle", "#202020", 0.3, metal=0.7)
    k.cylinder("rack_handle", 0.008, 0.25, (hx, 0.825, Z1 + 0.022), bar, 0.003, verts=16)
    for i, y in enumerate((0.84, 1.06)):
        k.cylinder(f"rack_handle_post{i}", 0.005, 0.024, (hx, y, Z1), bar, 0.001, rot=(90, 0, 0), verts=12)
    disc(k, "rack_lock", 0.012, 0.006, (hx, 0.75, Z1), k.mat("b_chrome", "#d0d0d0", 0.2, metal=1.0), bevel=0.002, verts=20)
    disc(k, "rack_lock_key", 0.0025, 0.001, (hx, 0.75, Z1 + 0.006), matte(k, "#0a0a0a", 0.8), bevel=0.0, verts=8)
    for i, y in enumerate((y0 + 0.12, y1 - 0.12)):
        k.cylinder(f"rack_hinge{i}", 0.006, 0.05, (x1 - 0.001, y - 0.025, Z1 + 0.002), s, 0.001, verts=12)


def rail_material(k):
    """Black rail steel with the square holes: three per unit, 8 mm."""
    if "b_rail" in k.mats:
        return k.mats["b_rail"]
    m = k.mat("b_rail", "#1a1a1a", 0.45, metal=0.5)
    nt = m.node_tree
    coord = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(coord.outputs["Object"], sep.inputs["Vector"])
    div = nt.nodes.new("ShaderNodeMath")
    div.operation = "DIVIDE"
    div.inputs[1].default_value = rack.U / 3
    nt.links.new(sep.outputs["Z"], div.inputs[0])
    frac = nt.nodes.new("ShaderNodeMath")
    frac.operation = "FRACT"
    nt.links.new(div.outputs[0], frac.inputs[0])
    row = nt.nodes.new("ShaderNodeMath")
    row.operation = "LESS_THAN"
    row.inputs[1].default_value = 0.54
    nt.links.new(frac.outputs[0], row.inputs[0])
    ax = nt.nodes.new("ShaderNodeMath")
    ax.operation = "ABSOLUTE"
    nt.links.new(sep.outputs["X"], ax.inputs[0])
    col = nt.nodes.new("ShaderNodeMath")
    col.operation = "LESS_THAN"
    col.inputs[1].default_value = 0.004
    nt.links.new(ax.outputs[0], col.inputs[0])
    hole = nt.nodes.new("ShaderNodeMath")
    hole.operation = "MULTIPLY"
    nt.links.new(row.outputs[0], hole.inputs[0])
    nt.links.new(col.outputs[0], hole.inputs[1])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs["A"].default_value = nt.nodes["Principled BSDF"].inputs["Base Color"].default_value
    mix.inputs["B"].default_value = (0.002, 0.002, 0.002, 1)
    nt.links.new(hole.outputs[0], mix.inputs["Factor"])
    nt.links.new(mix.outputs["Result"], nt.nodes["Principled BSDF"].inputs["Base Color"])
    return m


def rails(k):
    """Two vertical rails at x 4.37 and 4.87, the gear's ears on them."""
    y0, y1 = rack.BOTTOM - 0.01, rack.y_of(32) + 0.01
    for i, x in enumerate((4.37, 4.87)):
        k.box(f"rack_rail{i}", (0.016, y1 - y0, 0.002), (x, (y0 + y1) / 2, rack.FRONT - 0.005), rail_material(k), bevel=0.0)
        k.box(f"rack_rail{i}_flange", (0.002, y1 - y0, 0.025), (x + (0.008 if i else -0.008), (y0 + y1) / 2, rack.FRONT - 0.018), steel(k), bevel=0.0)


def loom(k):
    """Six black cables down the inside right, strapped every 25 cm,
    turning back to leave at the bottom of the back panel."""
    m = k.mat("b_loom", "#121212", 0.45)
    x, z = 4.889, 0.63
    offsets = [(-0.004, -0.004), (0.004, -0.004), (-0.004, 0.004), (0.004, 0.004), (0.0, -0.011), (0.0, 0.011)]
    for i, (dx, dz) in enumerate(offsets):
        pts = [(x + dx, 1.47, z + dz - 0.04), (x + dx, 1.42, z + dz)]
        for j, y in enumerate((1.15, 0.85, 0.55, 0.3)):
            pts.append((x + dx + 0.0015 * math.sin(i + j * 1.7), y, z + dz + 0.002 * math.cos(i * 2 + j)))
        pts += [(x + dx, 0.13, z + dz - 0.03), (x + dx, 0.11, Z0 + 0.12), (x + dx, 0.105, Z0 - 0.01)]
        cable(k, f"rack_loom{i}", pts, 0.004, m, res=4, sides=1)
    strap = k.mat("b_velcro", "#1f4a32", 0.9)
    for j, y in enumerate((1.3, 1.05, 0.8, 0.55, 0.3)):
        k.box(f"rack_loom_strap{j}", (0.024, 0.014, 0.03), (x, y, z), strap, bevel=0.004)


def glow(k):
    """L6: an area light between the gear and the glass lighting the gear
    cyan, and the bible's 0.2 x 1.2 panel shining out onto the floor and
    the crate beside it (just outside the door, so it does not light up
    the glass itself)."""
    for name, size, z, energy, target in (("rack_glow_in", (0.44, 1.3), 0.692, 2.5, -1), ("rack_glow_out", (0.2, 1.2), 0.735, 12.0, 1)):
        data = bpy.data.lights.new(name, "AREA")
        data.shape = "RECTANGLE"
        data.size, data.size_y = size
        data.energy = energy
        data.color = (0.25, 0.94, 0.78)
        obj = bpy.data.objects.new(name, data)
        obj.location = T(CX, 0.8, z)
        data.specular_factor = 0.0
        obj.visible_camera = False
        obj.visible_glossy = False
        k.link(obj)
        aim(obj, (CX, 0.8, z + target))
    # the spill: light through the glass reaching round to the floor, the
    # crates and the duffel beside the rack, which the door panel cannot
    data = bpy.data.lights.new("rack_spill", "POINT")
    data.energy = 4.0
    data.color = (0.25, 0.94, 0.78)
    data.shadow_soft_size = 0.15
    data.specular_factor = 0.0
    spill = bpy.data.objects.new("rack_spill", data)
    spill.location = T(4.72, 0.45, 0.95)
    spill.visible_glossy = False
    k.link(spill)


def robot_speaker(k, at, turn=-30):
    """A white dome speaker on a round base with two tiny black eyes."""
    x, y, z = at
    white = k.mat("b_white_plastic", "#f2f0ec", 0.35)
    k.cylinder("robot_base", 0.058, 0.018, (x, y, z), white, 0.004, verts=32)
    k.sphere("robot_dome", 0.055, (x, y + 0.018, z), white, segments=28, rings=14, scale=(1, 1, 0.92))
    a = math.radians(turn)
    for i, side in enumerate((-1, 1)):
        ex = x + 0.048 * math.sin(a) + side * 0.017 * math.cos(a)
        ez = z + 0.048 * math.cos(a) - side * 0.017 * math.sin(a)
        k.sphere(f"robot_eye{i}", 0.006, (ex, y + 0.044, ez), matte(k, "#141414", 0.25), segments=10, rings=6)


def on_top(k):
    """The oak board on top and what stands on it (bible 3.29), with P3
    trailing down the front-right corner."""
    k.box("rack_board", (0.55, 0.02, 0.3), (CX, TOP + 0.01, 0.42), oak(k), bevel=0.003)
    y = TOP + 0.02
    robot_speaker(k, (4.43, y, 0.4))
    asset(k, "Camera_01", (4.56, y, 0.3), rot=25, width=0.11, ratio=0.1)
    asset(k, "potted_plant_04", (4.7, y, 0.32), rot=-30, height=0.22, ratio=0.3)
    standing_frame(k, "rack_photo", (4.83, y, 0.36), 0.12, 0.16, "windsurf", turn=-20)
    drops = [(4.78, TOP + 0.004, Z1 + 0.008), (4.82, TOP + 0.004, Z1 + 0.008), (4.86, TOP + 0.004, Z1 + 0.008), (4.9, TOP + 0.004, Z1 + 0.006), (X1 + 0.008, TOP + 0.004, 0.66), (X1 + 0.008, TOP + 0.004, 0.6), (X1 + 0.008, TOP + 0.004, 0.54)]
    pothos(k, "pothos_p3", (4.84, y, 0.5), drops, [0.6, 0.45, 0.55, 0.38, 0.5, 0.62, 0.42], seed=53, crown=9)


def build(k):
    with k.piece("homelab"):
        cabinet(k)
        door(k)
        rails(k)
        rack.stack(k)
        loom(k)
        glow(k)
        on_top(k)
        k.pin("homelab", (4.62, 1.5, 0.75))
        k.view("homelab", (4.55, 1.0, 0.45), (-1.7, 0.6, 2.4), fov=30)
