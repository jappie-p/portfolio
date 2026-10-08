"""A 75 % mechanical keyboard (bible 3.8): a bevelled #1e1e1e case, six rows
of #2b2b2b caps with brand-green Esc, Enter and arrows, and a coiled cable
to the grommet at x 1.3."""

from decor._a_util import cubes, helix, rbox, rig, tube

AT = (2.05, 0.743, 0.62)
U = 0.0175
CAP = 0.0015
# rows from the back: (width in units, colour) with ("gap", w) for spacing
ROWS = [
    [(1, "g")] + [("gap", 0.25)] + [(1, "k")] * 4 + [("gap", 0.25)] + [(1, "k")] * 4 + [("gap", 0.25)] + [(1, "k")] * 4 + [("gap", 0.25), (1, "k")],
    [(1, "k")] * 13 + [(2, "k"), (1, "k")],
    [(1.5, "k")] + [(1, "k")] * 12 + [(1.5, "k"), (1, "k")],
    [(1.75, "k")] + [(1, "k")] * 11 + [(2.25, "g"), (1, "k")],
    [(2.25, "k")] + [(1, "k")] * 10 + [(1.75, "k"), (1, "g"), (1, "k")],
    [(1.25, "k")] * 3 + [(6.25, "k")] + [(1, "k")] * 3 + [(1, "g")] * 3,
]


def caps():
    """Every cap as ((x, y, z), (w, h, d)) in the keyboard's own space, by colour."""
    out = {"k": [], "g": []}
    for r, row in enumerate(ROWS):
        x = -8 * U
        z = -2.5 * U + r * U + (-0.004 if r == 0 else 0.0)
        h = 0.0085 + 0.0008 * abs(r - 3)
        for w, colour in row:
            if w == "gap":
                x += colour * U
                continue
            out[colour].append(((x + w * U / 2, 0.019 + h / 2, z), (w * U - CAP, h, U - CAP)))
            x += w * U
    # the arrow cluster sits a little lower, inverted-T
    out["g"] = [((cx, cy - (0.002 if cz > 0.03 else 0), cz), s) for (cx, cy, cz), s in out["g"]]
    return out


def build_keyboard(k):
    case = k.mat("a_kb_case", "#1e1e1e", 0.45, bump=0.02, bump_scale=500.0)
    grey = k.mat("a_kb_cap", "#2b2b2b", 0.55)
    green = k.mat("a_kb_cap_green", "#1f4a32", 0.5)
    parts = [
        rbox(k, "kb_case", (0.33, 0.02, 0.14), (0, 0.01, 0), case, radius=0.005, segments=3),
        rbox(k, "kb_plate", (0.296, 0.004, 0.118), (0, 0.0195, -0.001), k.mat("a_kb_plate", "#161616", 0.6), radius=0.001, segments=1),
    ]
    c = caps()
    parts.append(cubes(k, "kb_caps", c["k"], grey, bevel=0.0022, segments=2))
    parts.append(cubes(k, "kb_caps_green", c["g"], green, bevel=0.0022, segments=2))
    rig(k, "keyboard", AT, (-3, 0, 0), parts)
    _cable(k)


def _cable(k):
    """The keyboard's coiled cable, out of its back left to the grommet."""
    black = k.mat("a_cable_black", "#161616", 0.45)
    x, y, z = AT
    port = (x - 0.12, y + 0.01, z - 0.072)
    coil_a = (x - 0.19, y + 0.012, z - 0.11)
    coil_b = (x - 0.31, y + 0.012, z - 0.16)
    tube(k, "kb_cable_a", [port, (x - 0.15, y + 0.008, z - 0.09), coil_a], 0.0025, black, res=6)
    tube(k, "kb_coil", helix(coil_a, coil_b, 0.006, 20, steps=8), 0.002, black, res=1, ring=0)
    tube(k, "kb_cable_b", [coil_b, (1.55, y + 0.004, 0.33), (1.36, y + 0.003, 0.24), (1.3, 0.735, 0.2), (1.3, 0.69, 0.2)], 0.0025, black, res=6)
