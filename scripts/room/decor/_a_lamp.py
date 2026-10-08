"""The black architect lamp at the desk's left end (bible 3.7, light L3):
a weighted base, twin-rod lower and upper arms with two coil springs, hex
knobs at the joints and a dome shade whose warm inside glows. The bulb sits
at (0.95, 1.12, 0.45) and the spot aims at (1.45, 0.76, 0.55)."""

import math

import bpy
from mathutils import Vector

from space import T

from decor import _a_tex as tx
from decor._a_util import aim_rotation, helix, lathe, tube

BASE = Vector((0.85, 0.74, 0.28))
SHOULDER = Vector((0.85, 0.80, 0.28))
BULB = Vector((0.95, 1.12, 0.45))
AIM = Vector((1.45, 0.76, 0.55))
LOWER, UPPER = 0.5, 0.3
BEND = Vector((-0.3, 1.0, -0.3))


def joints():
    """Shoulder, elbow and head knuckle; the elbow folds up and back."""
    d = (AIM - BULB).normalized()
    head = BULB - 0.075 * d
    span = head - SHOULDER
    dist = span.length
    u = span.normalized()
    a = (LOWER**2 - UPPER**2 + dist**2) / (2 * dist)
    h = math.sqrt(max(LOWER**2 - a * a, 0.0))
    v = (BEND - BEND.dot(u) * u).normalized()
    return SHOULDER, SHOULDER + a * u + h * v, head, d


def _knob(k, name, at, axis, material):
    obj = k.cylinder(name, 0.012, 0.03, (0, 0, 0), material, bevel=0.002, verts=6)
    obj.location = T(*(at - axis * 0.015))
    obj.rotation_euler = aim_rotation(tuple(axis))
    return obj


def _arm(k, name, a, b, normal, material):
    for i, s in enumerate((-1, 1)):
        off = normal * (0.011 * s)
        tube(k, f"{name}_{i}", [tuple(a + off), tuple(b + off)], 0.0045, material, poly=True, ring=2)


def _springs(k, a, b, normal, material):
    axis = (b - a).normalized()
    below = axis.cross(normal).normalized()
    for i, s in enumerate((-1, 1)):
        off = normal * (0.024 * s) + below * 0.01
        start, end = a + (b - a) * 0.12 + off, a + (b - a) * 0.62 + off
        tube(k, f"lamp_spring_{i}", helix(tuple(start), tuple(end), 0.008, 12, steps=8), 0.0014, material, res=1, ring=0)
        tube(k, f"lamp_spring_hook_{i}", [tuple(a + off * 0.4), tuple(start)], 0.0012, material, poly=True, ring=1)
        tube(k, f"lamp_spring_tail_{i}", [tuple(end), tuple(b - (b - a) * 0.12 + off * 0.4)], 0.0012, material, poly=True, ring=1)


def _shade(k, head, d):
    black = k.mat("a_lamp_black", "#141414", 0.42)
    inner = tx.glow(k, "a_lamp_inner", "#ffd79b", 4.0)
    rot = aim_rotation(tuple(d))
    outer = [(0, -0.05), (0.016, -0.05), (0.018, -0.045), (0.018, -0.005), (0.026, 0.006), (0.045, 0.03), (0.062, 0.065), (0.074, 0.098), (0.08, 0.12), (0.0815, 0.123), (0.0795, 0.124)]
    inside = [(0.0775, 0.122), (0.072, 0.1), (0.06, 0.068), (0.043, 0.034), (0.024, 0.01), (0.0, 0.004)]
    for name, prof, m in (("lamp_shade", outer, black), ("lamp_shade_inner", inside, inner)):
        obj = lathe(k, name, prof, (0, 0, 0), m, segments=36)
        obj.location = T(*head)
        obj.rotation_euler = rot


def _lights(k, d):
    spot = bpy.data.lights.new("L3_desk_lamp", "SPOT")
    # stronger than the bible's 25 W: next to the sun it must still lay a
    # warm pool on the desk
    spot.energy = 85.0
    spot.color = (1.0, 0.72, 0.4)
    spot.spot_size = math.radians(50)
    spot.spot_blend = 0.6
    spot.shadow_soft_size = 0.02
    obj = bpy.data.objects.new("L3_desk_lamp", spot)
    obj.location = T(*BULB)
    obj.rotation_euler = T(*d).to_track_quat("-Z", "Y").to_euler()
    k.link(obj)
    halo = bpy.data.lights.new("L3_lamp_halo", "POINT")
    halo.energy = 7.0
    halo.color = (1.0, 0.72, 0.42)
    halo.shadow_soft_size = 0.06
    h = bpy.data.objects.new("L3_lamp_halo", halo)
    h.location = T(*(BULB - d * 0.16 + Vector((0, 0.05, -0.04))))
    k.link(h)


def build_lamp(k):
    black = k.mat("a_lamp_black", "#141414", 0.42)
    spring = k.mat("a_lamp_spring", "#1c1c1c", 0.35, metal=0.6)
    lathe(k, "lamp_base", [(0, 0), (0.066, 0), (0.068, 0.004), (0.066, 0.016), (0.05, 0.024), (0.016, 0.027), (0, 0.027)], tuple(BASE), black, segments=40)
    k.cylinder("lamp_riser", 0.011, SHOULDER.y - BASE.y - 0.02, (BASE.x, BASE.y + 0.02, BASE.z), black, bevel=0.002, verts=16)
    shoulder, elbow, head, d = joints()
    normal = (elbow - shoulder).cross(head - elbow).normalized()
    _arm(k, "lamp_lower", shoulder, elbow, normal, black)
    _arm(k, "lamp_upper", elbow, head, normal, black)
    _springs(k, shoulder, elbow, normal, spring)
    for name, at in (("lamp_knob_shoulder", shoulder), ("lamp_knob_elbow", elbow), ("lamp_knob_head", head)):
        _knob(k, name, at, normal, black)
    _shade(k, head, d)
    bulb = k.sphere("lamp_bulb", 0.022, tuple(BULB - d * 0.01), tx.glow(k, "a_lamp_bulb", "#fff0d2", 14.0), segments=20, rings=10)
    bulb.visible_shadow = False
    _lights(k, d)
