"""On the floor (bible 2.8, 3.40 to 3.42): the shaggy knotted rug, the
calathea at the front left, and the cable run under the desk: a power
strip by the wall with the leads of the lamp, the screens, the LED strip
and the tray running to it."""

import bmesh
from mathutils import Vector, noise

from space import T

from decor import _a_tex as tx
from decor._a_util import lathe, ph, rbox, tube

RUG_C, RUG_W, RUG_D = (3.0, 2.12), 1.8, 1.2
RUG_Y = 0.012
CELL = 0.025


def rug_material(k):
    """Chunky taupe-brown knit: 3 cm loops from a Voronoi in rows from a
    wave (sized to read from across the room and to survive the bake),
    fibres from fine noise, darker valleys and lighter loop tops, a slow
    tonal drift; roughness 1."""
    name = "a_rug"
    if name in k.mats:
        return k.mats[name]
    m, nt, p = tx.new_mat(name)
    p.inputs["Roughness"].default_value = 1.0
    p.inputs["Sheen Weight"].default_value = 0.25
    p.inputs["Sheen Roughness"].default_value = 0.5
    p.inputs["Sheen Tint"].default_value = tx.hex_rgb("#8a776a")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    knots = tx.node(nt, "ShaderNodeTexVoronoi", Scale=32.0, Randomness=0.55)
    knots.feature = "SMOOTH_F1"
    rows = tx.node(nt, "ShaderNodeTexWave", Scale=21.0, Distortion=3.0, Detail=2.0)
    fibre = tx.node(nt, "ShaderNodeTexNoise", Scale=700.0, Detail=4.0)
    drift = tx.node(nt, "ShaderNodeTexNoise", Scale=4.0, Detail=3.0)
    for n in (knots, rows, fibre, drift):
        tx.link(nt, tc.outputs["Object"], n.inputs["Vector"])
    height = tx.node(nt, "ShaderNodeMath")
    height.operation = "MULTIPLY_ADD"
    tx.link(nt, knots.outputs["Distance"], height.inputs[0])
    height.inputs[1].default_value = 1.0
    tx.link(nt, fibre.outputs["Fac"], height.inputs[2])
    both = tx.node(nt, "ShaderNodeMath")
    both.operation = "ADD"
    tx.link(nt, height.outputs[0], both.inputs[0])
    tx.link(nt, rows.outputs["Fac"], both.inputs[1])
    bump = tx.node(nt, "ShaderNodeBump", Strength=1.0, Distance=0.012)
    tx.link(nt, both.outputs[0], bump.inputs["Height"])
    tx.link(nt, bump.outputs["Normal"], p.inputs["Normal"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = tx.hex_rgb("#3a2d25")
    ramp.color_ramp.elements[1].color = tx.hex_rgb("#8a725f")
    shade = tx.node(nt, "ShaderNodeMath")
    shade.operation = "MULTIPLY_ADD"
    tx.link(nt, both.outputs[0], shade.inputs[0])
    shade.inputs[1].default_value = 0.35
    tx.link(nt, drift.outputs["Fac"], shade.inputs[2])
    tx.link(nt, shade.outputs[0], ramp.inputs["Fac"])
    ramp.color_ramp.elements[0].position = 0.3
    ramp.color_ramp.elements[1].position = 0.95
    tx.link(nt, ramp.outputs["Color"], p.inputs["Base Color"])
    m["gloss"] = False
    k.mats[name] = m
    return m


def _rug_point(u, v):
    """A rug point for u, v in [0, 1]: ragged outline, lumpy pile, curled edges."""
    cx, cz = RUG_C
    x = cx - RUG_W / 2 + u * RUG_W
    z = cz - RUG_D / 2 + v * RUG_D
    edge = min(u * RUG_W, (1 - u) * RUG_W, v * RUG_D, (1 - v) * RUG_D)
    if edge < 1e-6:
        x += 0.01 * noise.noise(Vector((x * 3.0, z * 3.0, 4.2)))
        z += 0.01 * noise.noise(Vector((x * 3.0, z * 3.0, 7.9)))
    lump = 0.007 * noise.noise(Vector((x / 0.03, z / 0.03, 1.3))) + 0.003 * noise.noise(Vector((x * 4, z * 4, 2.1)))
    curl = 0.005 * max(0.0, 1 - edge / 0.04)
    return x, RUG_Y + lump + curl, z


def rug(k):
    nu, nv = int(RUG_W / CELL), int(RUG_D / CELL)
    bm = bmesh.new()
    grid = [[bm.verts.new(T(*_rug_point(i / nu, j / nv))) for j in range(nv + 1)] for i in range(nu + 1)]
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    rim = [e for e in bm.edges if e.is_boundary]
    ext = bmesh.ops.extrude_edge_only(bm, edges=rim)
    down = [v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)]
    for v in down:
        v.co.z = 0.0005
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = k._mesh_obj("rug", bm)
    return k.finish(obj, rug_material(k))


def calathea(k):
    terracotta = k.mat("a_terracotta", "#b86b4b", 0.85, noise=50.0, mottle=0.12)
    soil = k.mat("a_soil", "#3a2c22", 1.0, noise=120.0, mottle=0.3, bump=0.3, bump_scale=300.0)
    prof = [(0, 0), (0.095, 0), (0.1, 0.006), (0.12, 0.17), (0.128, 0.175), (0.128, 0.195), (0.118, 0.198), (0.113, 0.17), (0, 0.17)]
    lathe(k, "calathea_pot", prof, (0.9, 0, 2.3), terracotta, segments=36)
    k.cylinder("calathea_soil", 0.112, 0.004, (0.9, 0.172, 2.3), soil, bevel=0.0, verts=32)
    ph(k, "calathea_orbifolia_01", (0.9, 0.165, 2.3), (0, 40, 0), height=0.4, pick="_a", ratio=0.7)


def cables(k):
    """The power strip and the leads that run to it (bible 3.41)."""
    black = k.mat("a_cable_black", "#161616", 0.45)
    white = k.mat("a_cable_white", "#e8e4dc", 0.4)
    strip = k.mat("a_strip_white", "#ece9e2", 0.45)
    plug = k.mat("a_plug_black", "#1b1b1b", 0.5)
    rbox(k, "power_strip", (0.3, 0.04, 0.06), (0.72, 0.02, 0.12), strip, radius=0.008, segments=2)
    rbox(k, "power_switch", (0.022, 0.006, 0.03), (0.6, 0.042, 0.12), k.mat("a_switch_red", "#b8432f", 0.4), radius=0.003, segments=1)
    for i in range(4):
        rbox(k, f"plug_{i}", (0.04, 0.03, 0.04), (0.66 + i * 0.055, 0.055, 0.12), plug, radius=0.006, segments=2)
    leads = [
        ("lead_wall", white, [(0.57, 0.02, 0.12), (0.5, 0.004, 0.08), (0.46, 0.004, 0.03), (0.452, 0.12, 0.015), (0.45, 0.29, 0.012)]),
        ("lead_lamp", black, [(0.85, 0.745, 0.24), (0.86, 0.744, 0.12), (0.87, 0.7, 0.09), (0.84, 0.4, 0.05), (0.78, 0.06, 0.05), (0.66, 0.075, 0.12)]),
        ("lead_led", black, [(0.78, 0.688, 0.13), (0.79, 0.5, 0.1), (0.76, 0.12, 0.08), (0.715, 0.075, 0.12)]),
        ("lead_kb_dock", black, [(1.3, 0.69, 0.2), (1.28, 0.45, 0.16), (1.2, 0.06, 0.1), (1.0, 0.004, 0.06), (0.83, 0.07, 0.12)]),
    ]
    for i, dz in enumerate((-0.012, 0.0, 0.012)):
        leads.append((f"lead_screen_{i}", black, [(2.2 + dz, 0.69, 0.2), (2.15 + dz, 0.45, 0.15 + dz), (1.9, 0.12, 0.08 + dz), (1.5, 0.004, 0.05 + dz), (1.0, 0.004, 0.045 + dz), (0.78 + i * 0.03, 0.07, 0.12)]))
    for name, m, pts in leads:
        tube(k, name, pts, 0.0035, m, res=8)


def build(k):
    with k.group("floor"):
        rug(k)
        calathea(k)
        cables(k)
