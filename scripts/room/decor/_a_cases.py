"""The black hard cases at the desk's foot (bible 3.4): matte bodies with a
lid seam, chrome latches, carry handles, stickers, and a cable behind."""

from decor._a_util import rbox, rig, tube


def _mats(k):
    return {
        "body": k.mat("a_case_black", "#1c1c1c", 0.5, bump=0.06, bump_scale=600.0),
        "seam": k.mat("a_case_seam", "#0b0b0b", 0.8),
        "chrome": k.mat("a_case_chrome", "#c9c9c9", 0.3, metal=1.0),
        "handle": k.mat("a_case_handle", "#151515", 0.25),
        "white": k.mat("a_sticker_white", "#f1eee6", 0.6),
        "green": k.mat("a_sticker_green", "#1f4a32", 0.6),
    }


def case(k, name, size, at, yaw, radius=0.02, latches=2, handle="arch", stickers=False):
    """A hard case `size` (w, h, d) standing at `at`, turned `yaw`."""
    m = _mats(k)
    w, h, d = size
    lid = min(0.11, h * 0.2)
    parts = [
        rbox(k, f"{name}_body", (w, h - lid - 0.004, d), (0, (h - lid - 0.004) / 2, 0), m["body"], radius=radius, segments=4),
        rbox(k, f"{name}_seam", (w - 0.012, 0.006, d - 0.012), (0, h - lid - 0.002, 0), m["seam"], radius=max(0.002, radius - 0.006), segments=3),
        rbox(k, f"{name}_lid", (w, lid, d), (0, h - lid / 2, 0), m["body"], radius=radius, segments=4),
    ]
    for i in range(latches):
        x = (i - (latches - 1) / 2) * w * 0.55
        parts.append(rbox(k, f"{name}_latch_{i}", (0.032, 0.045, 0.012), (x, h - lid - 0.004, d / 2 + 0.004), m["chrome"], radius=0.003, segments=2))
        parts.append(k.cylinder(f"{name}_latch_pin_{i}", 0.006, 0.006, (x, h - lid + 0.012, d / 2 + 0.008), m["chrome"], bevel=0.001, rot=(90, 0, 0), verts=12))
    if handle == "arch":
        span = min(w * 0.45, 0.14)
        pts = [(-span / 2, h, 0), (-span / 2, h + 0.035, 0), (0, h + 0.042, 0), (span / 2, h + 0.035, 0), (span / 2, h, 0)]
        parts.append(tube(k, f"{name}_handle", pts, 0.008, m["handle"], res=8, ring=2))
        for s in (-1, 1):
            parts.append(rbox(k, f"{name}_handle_foot_{s}", (0.03, 0.012, 0.03), (s * span / 2, h + 0.004, 0), m["handle"], radius=0.004, segments=2))
    elif handle == "hook":
        pts = [(-0.03, h, 0), (-0.03, h + 0.05, 0), (0.0, h + 0.065, 0), (0.035, h + 0.045, 0), (0.035, h + 0.02, 0)]
        parts.append(tube(k, f"{name}_handle", pts, 0.008, m["handle"], res=8, ring=2))
    elif handle == "cap":
        parts.append(k.cylinder(f"{name}_neck", 0.022, 0.03, (w * 0.22, h, 0), m["body"], bevel=0.003, verts=20))
        parts.append(k.cylinder(f"{name}_cap", 0.026, 0.02, (w * 0.22, h + 0.03, 0), m["handle"], bevel=0.004, verts=20))
        pts = [(-w * 0.3, h, 0), (-w * 0.3, h + 0.05, 0), (-w * 0.05, h + 0.05, 0), (-w * 0.05, h, 0)]
        parts.append(tube(k, f"{name}_handle", pts, 0.007, m["handle"], res=6, ring=2))
    parts.append(rbox(k, f"{name}_strip", (w * 0.7, 0.012, 0.004), (0, h * 0.62, d / 2 + 0.001), m["handle"], radius=0.002, segments=1))
    if stickers:
        parts.append(rbox(k, f"{name}_sticker_w", (0.06, 0.03, 0.0012), (-w * 0.18, h * 0.42, d / 2 + 0.0006), m["white"], radius=0.003, segments=1))
        parts.append(k.cylinder(f"{name}_sticker_g", 0.02, 0.0012, (w * 0.2, h * 0.36, d / 2), m["green"], bevel=0.0, rot=(90, 0, 0), verts=24))
    return rig(k, name, at, (0, yaw, 0), parts)


def build_cases(k):
    case(k, "case_tall", (0.3, 0.62, 0.34), (0.62, 0, 1.15), 5, latches=2, stickers=True)
    case(k, "case_mid", (0.26, 0.5, 0.3), (0.92, 0, 1.3), -4, latches=2, handle="hook")
    case(k, "case_tube", (0.22, 0.42, 0.22), (1.18, 0, 1.4), 8, radius=0.07, latches=1)
    case(k, "case_small", (0.17, 0.18, 0.13), (1.3, 0, 1.6), -10, radius=0.03, latches=1, handle="cap")
    tube(k, "case_cable", [(0.5, 0.004, 0.96), (0.78, 0.004, 1.02), (1.0, 0.004, 1.12), (1.2, 0.006, 1.2), (1.32, 0.006, 0.95), (1.34, 0.006, 0.6)], 0.004, k.mat("a_cable_black", "#161616", 0.45), res=6)
