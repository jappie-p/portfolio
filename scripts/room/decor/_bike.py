"""The bike construction kit, shared by both bikes in the room: a frame
from a handful of geometry numbers, wheels with laced spokes and real
tyres, disc brakes, a full drivetrain, cockpit and saddle.

    root, bike = build_bike(k, "mtb", MTB, at, fwd, up)

builds a bike in its own axes (x forward, y up, z toward the drive side,
origin at the rear axle) and stands it in the room: `at` is where the rear
axle goes, `fwd` where the nose points and `up` where the top tube's side
of the bike faces (site vectors). `bike.world(p)` maps a bike point into the
room; `bike.anchors` holds the useful ones (bar ends, top tube, saddle)."""

import math

import bpy

from decor._c_cockpit import cockpit, seat
from decor._c_drive import drivetrain
from decor._c_frames import caliper, geometry, mtb_frame, rigid_fork, road_frame, suspension_fork
from decor._c_geo import Parts, V, emit_parts, frame, sweep, to_blender
from decor._c_wheel import wheel

FONT = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

# 29 x 2.4 trail wheels (OD 0.74): 35 mm rims, 32 spokes three-cross
MTB_WHEEL = dict(R=0.311, rim_w=0.035, rim_d=0.026, tyre_w=0.061, tyre_h=0.058, knobs=True, spokes=32, cross=3, flange_r=0.029)

MTB = {
    "kind": "mtb",
    "geometry": dict(wheelbase=1.19, chainstay=0.435, bb_drop=0.03, head_angle=65, seat_angle=76, a2c=0.56, offset=0.044, head_tube=0.11, seat_tube=0.475),
    "front_wheel": dict(MTB_WHEEL, hub_len=0.056, flange_z=(-0.036, 0.034), rotor=(0.09, -0.051)),
    "rear_wheel": dict(MTB_WHEEL, hub_len=0.075, flange_z=(-0.038, 0.024), rotor=(0.09, -0.06)),
    "calipers": (140, 52),
    "drive": dict(rings=[32], chainline=0.052, cogs=[46, 37, 32, 28, 25, 22, 19, 17, 15, 13, 11], cog_z0=0.024, cog=6, crank=0.17, crank_deg=0, pedal="flat", guide=(-0.022, -0.128), tension=(0.03, -0.196)),
    "cockpit": dict(spacers=0.02, stem=0.045, stem_rise=0, bars="riser", width=0.78),
    "seat": dict(post=0.205, dropper=True, saddle_len=0.27, saddle_w=0.14),
}

# 700 x 28 road wheels (OD 0.68): 45 mm deep carbon rims, 24 spokes
ROAD_WHEEL = dict(R=0.311, rim_w=0.026, rim_d=0.045, tyre_w=0.029, tyre_h=0.027, square=0.95, tread_deg=40, knobs=False, spokes=24, cross=2, flange_r=0.023)

ROAD = {
    "kind": "road",
    "geometry": dict(wheelbase=0.98, chainstay=0.41, bb_drop=0.07, head_angle=73, seat_angle=73.5, a2c=0.37, offset=0.045, head_tube=0.15, seat_tube=0.54),
    "front_wheel": dict(ROAD_WHEEL, hub_len=0.05, flange_z=(-0.034, 0.03), rotor=(0.08, -0.046)),
    "rear_wheel": dict(ROAD_WHEEL, hub_len=0.071, flange_z=(-0.036, 0.022), rotor=(0.07, -0.056)),
    "calipers": (135, 25),
    "drive": dict(rings=[50, 34], chainline=0.0435, cogs=[30, 27, 24, 21, 19, 17, 15, 14, 13, 12, 11], cog_z0=0.0225, cog=5, crank=0.1725, crank_deg=0, pedal="clip", guide=(-0.018, -0.096), tension=(0.022, -0.152)),
    "cockpit": dict(spacers=0.02, stem=0.1, stem_rise=-6, bars="drops", width=0.42),
    "seat": dict(post=0.19, dropper=False, saddle_len=0.265, saddle_w=0.135, bag=True),
}


def materials(k, kind):
    """The kit's materials; the frame, rims and tyres differ per bike."""
    m = {
        "black": k.mat("bk_black", "#1b1b1b", 0.5),
        "alu": k.mat("bk_alu", "#202020", 0.38, metal=0.6),
        "tyre": k.mat("bk_tyre", "#1a1a1a", 0.95, bump=0.25, bump_scale=900),
        "knob": k.mat("bk_tyre", "#1a1a1a", 0.95),
        "spoke": k.mat("bk_spoke", "#2a2a2a", 0.35, metal=1.0),
        "hub": k.mat("bk_hub", "#1d1d1d", 0.35, metal=0.5),
        "rotor": k.mat("bk_rotor", "#b8b8b8", 0.25, metal=1.0),
        "steel": k.mat("bk_steel", "#a8a8a8", 0.3, metal=1.0),
        "chain": k.mat("bk_chain", "#8a8a88", 0.35, metal=1.0),
        "ring": k.mat("bk_ring", "#1c1c1c", 0.35, metal=0.6),
        "mech": k.mat("bk_black", "#1b1b1b", 0.5),
        "housing": k.mat("bk_hose", "#121212", 0.3),
        "hose": k.mat("bk_hose", "#121212", 0.3),
        "grip": k.mat("bk_grip", "#1e1e1e", 0.9),
        "tape": k.mat("bk_tape", "#161616", 0.85, bump=0.5, bump_scale=260),
        "hood": k.mat("bk_hood", "#181818", 0.7),
        "saddle": k.mat("bk_saddle", "#151515", 0.6),
        "stanchion": k.mat("bk_chrome", "#c8c8c8", 0.15, metal=1.0),
        "lower": k.mat("mtb_lower", "#161616", 0.35),
        "collar": k.mat("bk_chrome", "#c8c8c8", 0.15, metal=1.0),
        "spring": k.mat("bk_spring", "#1f1f1f", 0.4, metal=0.5),
        "dropper": k.mat("bk_dropper", "#111111", 0.22),
        "bag": k.mat("bk_bag", "#1c1c1c", 0.9),
        "badge": k.mat("bk_green", "#1f4a32", 0.35, metal=0.3),
        "decal": k.mat("bk_cream", "#efe6d2", 0.5),
        "stripe": k.mat("bk_stripe", "#b9b9b2", 0.5),
    }
    if kind == "mtb":
        m["frame"] = k.mat("mtb_frame", "#4f6a3f", 0.55, noise=60, mottle=0.06)
        m["sidewall"] = k.mat("mtb_sidewall", "#221e1a", 0.92, noise=40, mottle=0.18)
        m["rim"] = k.mat("mtb_rim", "#161616", 0.4)
    else:
        m["frame"] = k.mat("road_frame", "#141414", 0.15, coat=1.0)
        m["post"] = m["frame"]
        m["fork"] = k.mat("road_fork", "#efe6d2", 0.25, coat=1.0)
        m["sidewall"] = k.mat("road_sidewall", "#c9a57a", 0.75)
        m["rim"] = k.mat("road_rim", "#151515", 0.55, bump=0.08, bump_scale=400)
    return m


class Bike:
    def __init__(self, placement, anchors):
        self.m = placement
        self.anchors = anchors

    def world(self, p):
        """A bike point (its own axes) as a site point."""
        return tuple(self.m @ V(p))


def build_bike(k, name, spec, at, fwd, up, turn=0.0, rear=True):
    """Build a bike and hang it in the room (see the module's doc). `turn`
    swings the bars about the steerer (degrees), as you do to hang one
    flat against a wall. Without `rear` the rear wheel is left out (the
    bike sits on a direct-drive trainer; the cassette stays)."""
    g = spec["geometry"]
    p = geometry(g)
    parts = Parts()
    if spec["kind"] == "mtb":
        anchors = mtb_frame(parts, p, g)
        suspension_fork(parts, p, g)
    else:
        anchors = road_frame(parts, p, g)
        rigid_fork(parts, p, g)
    wf, wr = spec["front_wheel"], spec["rear_wheel"]
    m_rear = wheel(parts, p["rear"], wr, 0.13) if rear else None
    m_front = wheel(parts, p["front"], wf, 0.37)
    fa, ra = spec["calipers"]
    fc = caliper(parts, p["front"], wf, fa, p["front"] + p["dir"] * 0.075 - p["fwd"] * 0.016 + V((0, 0, -0.056)))
    caliper(parts, p["rear"], wr, ra, V((0.04, 0.03 if ra > 40 else 0.006, -0.062)))
    drivetrain(parts, dict(spec["drive"], bb=p["bb"]))
    bar_c, cock = cockpit(parts, {"top": p["ht"], "dir": p["dir"]}, dict(spec["cockpit"], turn=turn))
    saddle = seat(parts, {"top": p["stop"], "dir": p["sdir"]}, spec["seat"])
    if spec["kind"] == "mtb":
        _hoses(parts, p, cock, fc)
        _mtb_marks(k, name, parts, anchors)
    root = bpy.data.objects.new(f"{name}_root", None)
    k.link(root)
    mats = materials(k, spec["kind"])
    emit_parts(k, name, parts, mats, parent=root)
    if spec["kind"] == "mtb":
        _text(k, f"{name}_jp", "JP", 0.05, _down_tube_spot(anchors, 0.43, 0.0285), mats["decal"], root)
    else:
        for i, (mw, w) in enumerate(((m_rear, wr), (m_front, wf))):
            for a in (35, 215) if mw else ():
                _text(k, f"{name}_rim{i}_{a}", "JP", 0.024, mw @ _rim_spot(w, a), mats["decal"], root)
    placement = frame(at, fwd, up)
    root.matrix_world = to_blender(placement)
    bpy.context.view_layer.update()
    anchors.update(cock)
    anchors.update({"bar": bar_c, "saddle": saddle, "bb": p["bb"], "front": p["front"], "rear": p["rear"]})
    return root, Bike(placement, anchors)


def _hoses(parts, p, cock, fc):
    """Brake hoses and housings looping from the cockpit into the frame's
    ports at the head tube; the front hose runs down the fork leg."""
    d, n, hb = p["dir"], p["fwd"], p["hb"]
    for s, key in ((-1, "lever-1"), (1, "lever1")):
        lever = cock[key]
        port = hb + d * 0.07 - n * 0.006 + V((0, 0, s * 0.026))
        loop = p["ht"] + n * 0.1 - d * 0.03 + V((0, 0, s * 0.05))
        sweep(parts["hose"], [lever, lever + V((0.05, -0.05, 0)), loop, port], 0.0026, sides=6, step=0.02)
    lever = cock["lever-1"]
    front = p["front"]
    leg = lambda t: front + d * t - n * 0.026 + V((0, 0, -0.064))
    loop = p["ht"] + n * 0.12 - d * 0.05 + V((0, 0, -0.07))
    sweep(parts["hose"], [lever + V((0.01, -0.01, 0)), lever + V((0.07, -0.06, -0.01)), loop, leg(0.4), leg(0.2), fc + V((0.0, 0.02, -0.01))], 0.0026, sides=6, step=0.02)


def _mtb_marks(k, name, parts, anchors):
    """The light grey stripe along the top tube's drive side."""
    t0, t1 = anchors["top"]
    pts = [t0.lerp(t1, f) + V((0, 0.012 * math.sin(math.pi * f) * 0.95, 0.0176 + 0.003 * f + 0.0007)) for f in (0.18, 0.4, 0.62, 0.84)]
    sweep(parts["stripe"], pts, (0.0042, 0.0006), up=V((0, 0, 1)), sides=8, step=0.02)


def _down_tube_spot(anchors, f, z):
    a, b = anchors["down"]
    u = (b - a).normalized()
    return frame(a.lerp(b, f) + V((0, 0, z)), u, (0, 0, 1))


def _rim_spot(w, deg):
    a = math.radians(deg)
    r = w["R"] - w["rim_d"] * 0.32
    return frame(V((r * math.cos(a), r * math.sin(a), w["rim_w"] / 2 + 0.0006)), (math.sin(a), -math.cos(a), 0), (0, 0, 1))


def _text(k, name, body, size, m, mat, parent):
    t = k.text(name, body, size, (0, 0, 0), mat, extrude=0.0004, font=FONT)
    t.data.resolution_u = 3
    t.matrix_world = to_blender(m)
    t.parent = parent
    return t
