"""The gaming kit (story 'gamen'): a sleek black console with a green light
strip, a dark controller on the drawer cabinet, and an over-ear headset on
a stand on the desk. Site coordinates; `yaw` turns a piece about y."""

import math

import bpy

from decor import _a_tex as tx
from decor._a_util import lathe, rbox, tube
from space import T

GREEN = "#3dffb2"


def _frame(at, yaw):
    """local (x, z) offsets -> site (x, z), the piece turned `yaw` degrees."""
    c, s = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
    x0, y0, z0 = at

    def f(dx, dy=0.0, dz=0.0):
        return (x0 + dx * c + dz * s, y0 + dy, z0 - dx * s + dz * c)

    return f


def _across(k, name, r, depth, center, f, mat, yaw, bevel=0.003):
    """A cylinder lying along the piece's x axis, centred on a local point."""
    a = math.radians(yaw)
    c = f(*center)
    start = (c[0] + depth / 2 * math.cos(a), c[1], c[2] - depth / 2 * math.sin(a))
    return k.cylinder(name, r, depth, start, mat, bevel, rot=(0, yaw, 90), verts=32)


def _stud(k, name, r, h, at, mat, bevel=0.0015):
    return k.cylinder(name, r, h, at, mat, bevel, verts=20)


def _led_light(name, at, color, energy, size=0.05):
    data = bpy.data.lights.new(name, "POINT")
    data.energy = energy
    data.color = color
    data.shadow_soft_size = size
    data.specular_factor = 0.0
    obj = bpy.data.objects.new(name, data)
    obj.location = T(*at)
    return obj


# -- console ---------------------------------------------------------------


def console(k, at=(4.08, 0.77, 0.45)):
    """A slim black console lying on the cabinet: two-tone shell, vented
    top, a disc slot, a power button with its LED and, along the front, a
    green light strip."""
    x, y, z = at
    w, h, d = 0.3, 0.062, 0.21
    body = k.mat("d_console_body", "#141517", 0.38, coat=0.25, coat_rough=0.2, bump=0.03, bump_scale=900)
    plate = k.mat("d_console_plate", "#1d1f22", 0.5, bump=0.05, bump_scale=700)
    slot = k.mat("d_console_slot", "#050505", 0.8)
    strip = tx.glow(k, "d_console_strip", GREEN, 9.0)
    foot = k.mat("d_console_foot", "#0c0c0d", 0.7)
    for i, (fx, fz) in enumerate(((-1, -1), (1, -1), (-1, 1), (1, 1))):
        _stud(k, f"console_foot{i}", 0.011, 0.007, (x + fx * 0.12, y, z + fz * 0.08), foot, 0.002)
    yb = y + 0.007
    rbox(k, "console_body", (w, h, d), (x, yb + h / 2, z), body, radius=0.012, segments=4)
    # a lighter top plate, vent slots cut as dark slits
    rbox(k, "console_plate", (w - 0.04, 0.003, d - 0.05), (x, yb + h + 0.0005, z - 0.005), plate, radius=0.001, segments=1)
    for i in range(11):
        k.box(f"console_vent{i}", (0.0035, 0.0006, 0.1), (x - 0.1 + i * 0.02, yb + h + 0.0022, z - 0.015), slot, bevel=0.0)
    front = z + d / 2
    k.box("console_disc_slot", (0.17, 0.0035, 0.002), (x - 0.04, yb + h - 0.016, front + 0.0005), slot, bevel=0.0)
    k.box("console_strip", (0.26, 0.0045, 0.0025), (x, yb + 0.014, front + 0.0006), strip, bevel=0.0)
    k.cylinder("console_power", 0.0075, 0.003, (x + 0.1, yb + h - 0.018, front), k.mat("d_console_btn", "#2b2d31", 0.35, metal=0.6), 0.001, rot=(90, 0, 0), verts=20)
    k.sphere("console_led", 0.0022, (x + 0.1, yb + h - 0.018, front + 0.0035), tx.glow(k, "d_console_led", "#ffffff", 14.0), segments=8, rings=6)
    # the power lead down the back of the cabinet
    cord = k.mat("d_cord", "#101010", 0.5)
    tube(k, "console_power_lead", [(x + 0.1, yb + 0.03, z - d / 2 + 0.01), (x + 0.1, yb + 0.03, z - d / 2 - 0.06), (x + 0.1, y - 0.2, 0.28), (x + 0.1, 0.08, 0.2)], 0.0035, cord, res=6)
    light = _led_light("console_glow", (x, yb + 0.03, front + 0.05), (0.24, 1.0, 0.7), 0.5)
    k.link(light)


# -- controller ------------------------------------------------------------


def controller(k, at=(4.14, 0.77, 0.63), yaw=-16):
    """A dark gamepad lying flat, its grips toward you: body and grips,
    two sticks, a d-pad, four face buttons, triggers and a home button."""
    f = _frame(at, yaw)
    body = k.mat("d_pad_body", "#383a40", 0.55, bump=0.06, bump_scale=1100)
    grip = k.mat("d_pad_grip", "#2b2c31", 0.78, bump=0.12, bump_scale=1500)
    rubber = k.mat("d_pad_rubber", "#0d0d0e", 0.85, bump=0.1, bump_scale=900)
    plastic = k.mat("d_pad_plastic", "#2e3035", 0.4)
    y = at[1]
    rbox(k, "pad_core", (0.108, 0.027, 0.064), f(0, 0.0165, -0.003), body, radius=0.011, segments=4, rot=(0, yaw, 0))
    for i, s in enumerate((-1, 1)):
        g = k.sphere(f"pad_grip{i}", 1.0, f(s * 0.056, 0.0185, 0.03), grip, segments=24, rings=12, scale=(0.03, 0.05, 0.0185))
        k.place(g, f(s * 0.056, 0.0185, 0.03), (0, yaw + s * 18, 0), (0.03, 0.05, 0.0185))
    for i, (dx, dz) in enumerate(((-0.04, -0.008), (0.02, 0.018))):
        px, py, pz = f(dx, 0.031, dz)
        _stud(k, f"pad_stick{i}", 0.0125, 0.004, (px, py - 0.001, pz), plastic, 0.001)
        _stud(k, f"pad_stick{i}_cap", 0.011, 0.007, (px, py + 0.003, pz), rubber, 0.003)
    # d-pad: a plus
    dp = f(-0.022, 0.0305, 0.02)
    k.box("pad_dpad_a", (0.024, 0.003, 0.008), dp, plastic, bevel=0.001, rot=(0, yaw, 0))
    k.box("pad_dpad_b", (0.008, 0.003, 0.024), dp, plastic, bevel=0.001, rot=(0, yaw, 0))
    for i, (dx, dz, col) in enumerate(((0.045, -0.002, "#d8c25a"), (0.054, -0.013, "#c8504a"), (0.036, -0.013, "#4a78c8"), (0.045, -0.024, "#4cae6a"))):
        px, py, pz = f(dx, 0.0305, dz)
        _stud(k, f"pad_btn{i}", 0.0052, 0.003, (px, py, pz), k.mat(f"d_pad_btn{i}", col, 0.4), 0.001)
    hx, hy, hz = f(0.0, 0.0305, -0.012)
    _stud(k, "pad_home", 0.006, 0.003, (hx, hy, hz), tx.glow(k, "d_pad_home", GREEN, 4.0), 0.001)
    for i, s in enumerate((-1, 1)):
        rbox(k, f"pad_trigger{i}", (0.03, 0.012, 0.012), f(s * 0.04, 0.026, -0.04), plastic, radius=0.004, segments=3, rot=(0, yaw, 0))
    rbox(k, "pad_bar", (0.07, 0.006, 0.004), f(0, 0.0245, -0.0345), tx.glow(k, "d_pad_bar", GREEN, 5.0), radius=0.0008, segments=1, rot=(0, yaw, 0))
    # lead toward the console
    cord = k.mat("d_cord", "#101010", 0.5)
    a, b = f(0, 0.004, -0.04), f(-0.02, 0.003, -0.12)
    tube(k, "pad_lead", [a, f(0.0, 0.003, -0.07), f(-0.03, 0.003, -0.1), b, (at[0] - 0.12, y + 0.003, 0.5)], 0.0022, cord, res=6)


# -- headset ---------------------------------------------------------------


def headset(k, at=(2.88, 0.74, 0.58), yaw=-22):
    """An over-ear headset hung on a black stand: weighted base, a rod with
    a cradle, a headband with a soft pad, two cups with green anodised
    plates and a boom mic."""
    f = _frame(at, yaw)
    black = k.mat("d_hs_black", "#141416", 0.4, coat=0.2)
    foam = k.mat("d_hs_foam", "#0f0f10", 0.92, bump=0.2, bump_scale=1200)
    band = k.mat("d_hs_band", "#1b1c1f", 0.7, bump=0.08, bump_scale=900)
    accent = k.mat("d_hs_accent", "#2f7a55", 0.28, metal=0.9)
    x, y, z = at
    lathe(k, "hs_stand_base", [(0, 0), (0.056, 0), (0.058, 0.003), (0.054, 0.012), (0.03, 0.016), (0, 0.016)], at, black, segments=36)
    k.cylinder("hs_stand_rod", 0.0065, 0.2, (x, y + 0.014, z), k.mat("d_hs_rod", "#2a2b2e", 0.3, metal=0.8), 0.001, verts=16)
    k.sphere("hs_stand_cap", 0.0105, f(0, 0.222, 0), black, segments=16, rings=10, scale=(1, 1, 0.8))
    r = 0.0072
    arc = [(-0.089, 0.15), (-0.088, 0.19), (-0.062, 0.228), (0, 0.241), (0.062, 0.228), (0.088, 0.19), (0.089, 0.15)]
    tube(k, "hs_band", [f(dx, dy, 0) for dx, dy in arc], r, band, res=10, ring=2)
    rbox(k, "hs_pad", (0.07, 0.007, 0.03), f(0, 0.2315, 0), foam, radius=0.003, segments=2, rot=(0, yaw, 0))
    for i, s in enumerate((-1, 1)):
        cx = s * 0.092
        _across(k, f"hs_cup{i}", 0.0425, 0.03, (cx, 0.113, 0), f, black, yaw, 0.008)
        _across(k, f"hs_plate{i}", 0.031, 0.004, (cx + s * 0.0155, 0.113, 0), f, accent, yaw, 0.001)
        _across(k, f"hs_pillow{i}", 0.04, 0.016, (cx - s * 0.021, 0.113, 0), f, foam, yaw, 0.006)
        yoke = [f(s * 0.088, 0.152, 0), f(s * 0.091, 0.145, 0), f(s * 0.093, 0.135, 0)]
        tube(k, f"hs_yoke{i}", yoke, 0.0055, black, res=4, ring=1)
    # boom mic off the left cup, bent forward
    boom = [f(-0.108, 0.1, 0.0), f(-0.114, 0.085, 0.03), f(-0.105, 0.062, 0.065), f(-0.088, 0.048, 0.088)]
    tube(k, "hs_boom", boom, 0.0028, k.mat("d_hs_boom", "#232427", 0.5), res=8, ring=1)
    mx, my, mz = boom[-1]
    k.sphere("hs_mic", 0.0075, (mx, my, mz), foam, segments=14, rings=8, scale=(1, 1.5, 1))
