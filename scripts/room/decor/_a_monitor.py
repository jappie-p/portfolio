"""Three 27-inch monitors on one black triple arm (bible 3.6, light L7).
M1 shows the code editor, M2 and M3 the HypHosting and Louisa sites under a
thin browser bar. The screens glow (emission 2.5) and stay live."""

import math
import os

import bmesh

from space import T

from decor import _a_tex as tx
from decor._a_code import draw as draw_code
from decor._a_util import rbox, rig, tube

W, H, D = 0.61, 0.36, 0.012
SIDE, CHIN = 0.004, 0.012
CY = 1.0
WORK = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "src", "assets", "work")
SCREENS = [
    ("M1", (1.42, 0.28), 22, None),
    ("M2", (2.05, 0.22), 0, "hyphosting-desktop.webp"),
    ("M3", (2.68, 0.28), -22, "louisa-desktop.webp"),
]
POLE = (2.05, 0.14)


def _screen(k, name, material, w, h, y0, v0=0.0):
    """A screen face (with UVs) of w x h whose bottom sits at local y0, just
    in front of the panel; it shows the image from v0 up to its top."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    z = D / 2 + 0.0004
    vs = [bm.verts.new(T(x, y, z)) for x, y in ((-w / 2, y0), (w / 2, y0), (w / 2, y0 + h), (-w / 2, y0 + h))]
    face = bm.faces.new(vs)
    for loop, co in zip(face.loops, ((0, v0), (1, v0), (1, 1), (0, 1))):
        loop[uv].uv = co
    obj = k._mesh_obj(name, bm)
    return k.finish(obj, material, smooth=False)


def monitor(k, name, at, yaw, image):
    """One monitor centred on (x, CY, z), turned `yaw` degrees about y."""
    bezel = k.mat("a_bezel", "#151515", 0.5)
    back = k.mat("a_monitor_back", "#2a2a2a", 0.55, bump=0.02, bump_scale=300.0)
    parts = [
        rbox(k, f"{name}_panel", (W, H, D), (0, 0, 0), bezel, radius=0.0015, segments=2),
        rbox(k, f"{name}_housing", (0.46, 0.26, 0.03), (0, -0.01, -D / 2 - 0.013), back, radius=0.012, segments=3),
        k.cylinder(f"{name}_vesa", 0.05, 0.012, (0, -0.01, -D / 2 - 0.034), back, bevel=0.003, rot=(90, 0, 0), verts=24),
        rbox(k, f"{name}_logo", (0.03, 0.004, 0.001), (0, -H / 2 + CHIN / 2, D / 2 + 0.0003), k.mat("a_logo_grey", "#6d6d6d", 0.35), radius=0.0005, segments=1),
    ]
    sw, top = W - 2 * SIDE, H / 2 - SIDE
    bottom = -H / 2 + CHIN
    if image is None:
        mat = k.image_mat("a_screen_code", draw_code(), rough=0.08, emission=2.5)
        parts.append(_screen(k, f"{name}_screen", mat, sw, top - bottom, bottom))
    else:
        bar_h = 0.02
        mat = k.image_mat(f"a_screen_{name}", os.path.join(WORK, image), rough=0.08, emission=2.5)
        h = top - bottom - bar_h
        # fit the 16:10 shot to the width and show its top
        v0 = 1 - (1920 / 1200) / (sw / h)
        parts.append(_screen(k, f"{name}_screen", mat, sw, h, bottom, v0))
        chrome = tx.glow(k, "a_browser_bar", "#26282d", 2.5)
        parts.append(_screen(k, f"{name}_bar", chrome, sw, bar_h, top - bar_h))
    x, z = at
    return rig(k, name, (x, CY, z), (0, yaw, 0), parts)


def _mount(at, yaw):
    """The point on a monitor's back where its arm takes it."""
    x, z = at
    a = math.radians(yaw)
    back = D / 2 + 0.04
    return (x - back * math.sin(a), CY, z - back * math.cos(a))


def arm(k):
    """The pole clamped to the desk's back edge, a hub at y 1.0 and two
    jointed arms out to M1 and M3; M2 sits straight on the hub."""
    s = k.mat("a_arm_black", "#161616", 0.38)
    px, pz = POLE
    k.cylinder("arm_pole", 0.0175, 0.52, (px, 0.74, pz), s, bevel=0.003, verts=24)
    k.cylinder("arm_pole_cap", 0.019, 0.012, (px, 1.26, pz), s, bevel=0.003, verts=24)
    rbox(k, "arm_clamp_top", (0.08, 0.012, 0.11), (px, 0.746, 0.145), s, radius=0.004)
    rbox(k, "arm_clamp_back", (0.08, 0.1, 0.014), (px, 0.705, 0.093), s, radius=0.004)
    rbox(k, "arm_clamp_jaw", (0.08, 0.012, 0.07), (px, 0.665, 0.13), s, radius=0.004)
    k.cylinder("arm_clamp_screw", 0.006, 0.07, (px, 0.6, 0.15), s, bevel=0.001, verts=12)
    k.cylinder("arm_clamp_knob", 0.02, 0.012, (px, 0.594, 0.15), s, bevel=0.003, verts=20)
    k.cylinder("arm_hub", 0.026, 0.05, (px, CY - 0.025, pz), s, bevel=0.004, verts=24)
    for name, at, yaw, _ in SCREENS:
        m = _mount(at, yaw)
        if name == "M2":
            k.cylinder("arm_head_M2", 0.016, m[2] - pz, (px, CY, pz), s, bevel=0.002, rot=(90, 0, 0), verts=16)
            continue
        side = -1 if at[0] < px else 1
        elbow = (px + side * 0.31, CY - 0.012, 0.085)
        _link_bar(k, f"arm_{name}_a", (px, CY - 0.012, pz), elbow, s)
        _link_bar(k, f"arm_{name}_b", (elbow[0], CY + 0.012, elbow[2]), (m[0], CY + 0.012, m[2]), s)
        k.cylinder(f"arm_{name}_elbow", 0.02, 0.06, (elbow[0], CY - 0.03, elbow[2]), s, bevel=0.003, verts=20)
        k.cylinder(f"arm_{name}_tilt", 0.018, 0.05, (m[0], CY - 0.012, m[2]), s, bevel=0.003, verts=20)


def _link_bar(k, name, a, b, material):
    ax, ay, az = a
    bx, by, bz = b
    length = math.hypot(bx - ax, bz - az)
    yaw = math.degrees(math.atan2(-(bz - az), bx - ax))
    rbox(k, name, (length, 0.022, 0.032), ((ax + bx) / 2, ay, (az + bz) / 2), material, radius=0.007, segments=2, rot=(0, yaw, 0))


def cables(k):
    """Each screen's power and video lead down the pole to the grommet."""
    black = k.mat("a_cable_black", "#161616", 0.45)
    px, pz = POLE
    for i, (name, at, yaw, _) in enumerate(SCREENS):
        m = _mount(at, yaw)
        for j, dy in enumerate((-0.08, -0.1)):
            off = (i - 1) * 0.008 + j * 0.005
            pts = [(m[0], CY + dy, m[2] - 0.01), (m[0] * 0.6 + px * 0.4, 0.885, 0.12), (px + 0.03 + off, 0.86, 0.115), (px + 0.03 + off, 0.78, 0.12), (2.2 + off, 0.745, 0.19), (2.2 + off, 0.7, 0.2)]
            tube(k, f"{name}_lead_{j}", pts, 0.0032, black, res=8)


def build_monitors(k):
    for name, at, yaw, image in SCREENS:
        monitor(k, name, at, yaw, image)
    arm(k)
    cables(k)
