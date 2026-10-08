"""Story 07, groei: the MIJN GROEI board above the desk (bible 3.16).

An oak board with a routed groove and brass screws, its title cut in
dark letters, three medals on green ribbons and a cream card under each.
The whole board sits 0.2 lower than the bible's numbers so its top stays
under window W1 (agreed with the lead).
"""

import bpy

from decor._b_medal import medal, ribbon
from decor._b_util import boxes, brass, disc, wood_tex

X, Y = 1.75, 1.75  # board centre
W, H = 1.2, 0.68
BACK, FRONT = 0.002, 0.037  # the board's back and front (its border) faces (z)
FIELD = FRONT - 0.003  # the face of the raised field inside the groove
MEDALS = [(1.45, "screen", "Presenteren"), (1.75, "peaks", "Uitdagingen"), (2.05, "leaf", "Blijven leren")]
TITLE_FONT = "/System/Library/Fonts/Avenir Next.ttc"  # face 0: Avenir Next Bold


def board(k):
    """The slab with chamfered edges, a raised darker border, the routed
    groove inside it, a raised field, and a brass screw in each corner."""
    wood = wood_tex(k, "b_board_oak", "#c99a5f", "oak_veneer_01", scale=0.9, rough=0.4, soft=0.35)
    rim = wood_tex(k, "b_board_rim", "#b6844c", "oak_veneer_01", scale=0.9, rough=0.4, soft=0.35)
    slab = FRONT - 0.008
    boxes(k, "groei_board", [((W, H, slab - BACK), (0, 0, (BACK + slab) / 2))], wood, bevel=0.006, at=(X, Y, 0), segments=2)
    b, g = 0.05, 0.008
    border = [
        ((W, b, 0.008), (0, H / 2 - b / 2, FRONT - 0.004)),
        ((W, b, 0.008), (0, -H / 2 + b / 2, FRONT - 0.004)),
        ((b, H - 2 * b, 0.008), (-W / 2 + b / 2, 0, FRONT - 0.004)),
        ((b, H - 2 * b, 0.008), (W / 2 - b / 2, 0, FRONT - 0.004)),
    ]
    boxes(k, "groei_board_rim", border, rim, bevel=0.003, at=(X, Y, 0), segments=2)
    boxes(k, "groei_board_field", [((W - 2 * (b + g), H - 2 * (b + g), 0.005), (0, 0, FIELD - 0.0025))], wood, bevel=0.0015, at=(X, Y, 0))
    for i, (sx, sy) in enumerate([(-1, 1), (1, 1), (-1, -1), (1, -1)]):
        x, y = X + sx * (W / 2 - b / 2), Y + sy * (H / 2 - b / 2)
        disc(k, f"groei_screw{i}", 0.005, 0.0016, (x, y, FRONT), brass(k), bevel=0.0008, verts=14)
        k.box(f"groei_screw{i}_slot", (0.0075, 0.0012, 0.0006), (x, y, FRONT + 0.0016), k.mat("b_slot", "#3a2c1a", 0.6), bevel=0.0, rot=(0, 0, 30 + 40 * i))


def lettering(k, name, body, size, at, font, color, spacing=1.0, extrude=0.0, max_width=None):
    """Text facing the viewer, shrunk to `max_width` if it runs wider."""
    obj = k.text(name, body, size, at, k.mat(f"b_ink_{color.lstrip('#')}", color, 0.55), extrude=extrude, font=font)
    obj.data.space_character = spacing
    obj.data.resolution_u = 4
    if max_width:
        bpy.context.view_layer.update()
        if obj.dimensions.x > max_width:
            obj.data.size = size * max_width / obj.dimensions.x
    return obj


def card(k, i, x, text):
    """A cream label card on two brass pins, standing 4 mm off the board."""
    y, w, h, t = Y - 0.23, 0.26, 0.06, 0.004
    zc = FIELD + 0.004 + t / 2
    k.box(f"groei_card{i}", (w, h, t), (x, y, zc), k.mat("b_card", "#f3ede0", 0.75, noise=90, mottle=0.04), bevel=0.0015)
    for j, sx in enumerate((-1, 1)):
        disc(k, f"groei_card{i}_pin{j}", 0.0032, 0.002, (x + sx * (w / 2 - 0.014), y, zc + t / 2), brass(k), bevel=0.0007, verts=10)
    lettering(k, f"groei_label{i}", text, 0.041, (x, y - 0.001, zc + t / 2 + 0.0003), TITLE_FONT, "#363230", spacing=1.03, max_width=0.215)


def build(k):
    with k.piece("groei"):
        board(k)
        lettering(k, "groei_title", "MIJN GROEI", 0.106, (X, Y + 0.235, FIELD + 0.0015), TITLE_FONT, "#2b2420", spacing=1.16, extrude=0.0015)
        for i, (x, icon, label) in enumerate(MEDALS):
            ribbon(k, f"groei_ribbon{i}", x, Y + 0.17, Y, FIELD)
            medal(k, f"groei_medal{i}", (x, Y - 0.076, FIELD + 0.0035), icon)
            card(k, i, x, label)
        k.pin("groei", (X, 2.15, 0.08))
        k.view("groei", (X, Y, 0.05), (0, 0.1, 2.0), fov=28)
