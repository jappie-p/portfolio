"""Under the desk (bible 3.14, 3.15): two black three-drawer pedestals on
castors, the left one's top drawer open a crack with paper showing, and the
grey crates stacked between the desk and the shelving."""

from decor import _a_tex as tx
from decor._a_util import ph, rbox, rig

W, H, D = 0.42, 0.6, 0.5
FOOT = 0.045
FRONT_H, GAP = 0.18, 0.004


def _drawer(k, name, y, open_by, m):
    """One drawer front (with its handle slot) centred at height y."""
    z = D / 2 + 0.009 + open_by
    parts = [
        rbox(k, f"{name}_front", (0.4, FRONT_H, 0.018), (0, y, z), m["body"], radius=0.003, segments=2),
        rbox(k, f"{name}_slot", (0.14, 0.014, 0.004), (0, y + FRONT_H / 2 - 0.03, z + 0.0075), m["slot"], radius=0.002, segments=1),
        rbox(k, f"{name}_lip", (0.15, 0.005, 0.012), (0, y + FRONT_H / 2 - 0.021, z + 0.012), m["body"], radius=0.002, segments=1),
    ]
    if open_by:
        for s in (-1, 1):
            parts.append(k.box(f"{name}_side_{s}", (0.012, FRONT_H - 0.04, open_by + 0.02), (s * 0.185, y - 0.005, D / 2 + open_by / 2 - 0.005), m["body"], bevel=0.001))
        parts.append(k.box(f"{name}_paper", (0.3, 0.003, open_by + 0.015), (-0.02, y + FRONT_H / 2 - 0.035, D / 2 + open_by / 2 - 0.004), m["paper"], bevel=0.0005, rot=(4, 0, 0)))
        parts.append(k.box(f"{name}_paper2", (0.27, 0.003, open_by + 0.01), (0.03, y + FRONT_H / 2 - 0.042, D / 2 + open_by / 2 - 0.006), m["paper"], bevel=0.0005, rot=(-2, 3, 0)))
    return parts


def pedestal(k, name, at, open_top=False):
    m = {
        "body": k.mat("a_pedestal", "#222222", 0.55, bump=0.02, bump_scale=400.0),
        "slot": k.mat("a_slot", "#0c0c0c", 0.8),
        "paper": k.mat("a_paper", "#f4f1ea", 0.9),
        "castor": k.mat("a_castor_wheel", "#1a1a1a", 0.35),
    }
    parts = [rbox(k, f"{name}_body", (W, H, D), (0, FOOT + H / 2, 0), m["body"], radius=0.004, segments=2)]
    for i in range(3):
        y = FOOT + 0.012 + FRONT_H / 2 + i * (FRONT_H + GAP)
        parts += _drawer(k, f"{name}_d{i}", y, 0.03 if open_top and i == 2 else 0.0, m)
    for sx in (-1, 1):
        for sz in (-1, 1):
            x, z = sx * (W / 2 - 0.04), sz * (D / 2 - 0.05)
            parts.append(rbox(k, f"{name}_castor_hood", (0.035, 0.02, 0.03), (x, FOOT - 0.012, z), m["castor"], radius=0.006, segments=2))
            parts.append(k.cylinder(f"{name}_castor", 0.02, 0.014, (x + 0.007, 0.02, z + 0.006), m["castor"], bevel=0.003, rot=(0, 0, 90), verts=16))
    return rig(k, name, at, (0, 0, 0), parts)


def crates(k):
    """Grey crates, two stacked and one on the floor in front."""
    for i, (at, yaw) in enumerate((((3.5, 0, 0.5), 8), ((3.5, 0.254, 0.5), 3), ((3.5, 0, 1.0), -12))):
        root, kids = ph(k, "plastic_crate_02", at, (0, yaw, 0), ratio=0.5)
        for o in kids:
            tx.retint(o, "#7c7873", grain=0.8)


def low_shelf(k):
    """A low oak board between the pedestals, as in the design, with two
    kraft storage boxes and a shoebox of cables on it."""
    oak = k.wood("a_low_shelf", "#c99a5f", 0.45, scale=9)
    rbox(k, "low_shelf", (1.36, 0.022, 0.3), (2.05, 0.13, 0.3), oak, radius=0.004, segments=2)
    s = k.mat("a_steel_black", "#1b1b1b", 0.42, bump=0.03, bump_scale=400.0)
    for x in (1.45, 2.65):
        rbox(k, f"low_shelf_leg_{x}", (0.03, 0.119, 0.26), (x, 0.0595, 0.3), s, radius=0.003, segments=1)
    kraft = k.mat("a_kraft_box", "#b88f5c", 0.85, noise=40.0, mottle=0.12, bump=0.05, bump_scale=300.0)
    lid = k.mat("a_kraft_lid", "#a77f4f", 0.85, noise=40.0, mottle=0.1)
    for i, (x, w, h, yaw) in enumerate(((1.68, 0.32, 0.17, 3), (2.06, 0.3, 0.15, -4), (2.42, 0.26, 0.12, 6))):
        rbox(k, f"kraft_box_{i}", (w, h, 0.24), (x, 0.141 + h / 2, 0.29), kraft, radius=0.004, segments=2, rot=(0, yaw, 0))
        rbox(k, f"kraft_lid_{i}", (w + 0.01, 0.025, 0.25), (x, 0.141 + h - 0.008, 0.29), lid, radius=0.004, segments=2, rot=(0, yaw, 0))
        rbox(k, f"kraft_label_{i}", (0.08, 0.035, 0.002), (x, 0.141 + h * 0.45, 0.29 + 0.121), k.mat("a_paper", "#f4f1ea", 0.9), radius=0.001, segments=1, rot=(0, yaw, 0))


def build_pedestals(k):
    low_shelf(k)
    pedestal(k, "pedestal_left", (1.05, 0, 0.45), open_top=True)
    pedestal(k, "pedestal_right", (3.05, 0, 0.45))
    crates(k)
