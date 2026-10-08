"""Back wall (builder D): a second floating shelf above the homelab rack
with books, a framed photo and a trailing pothos, plus the book stack at the
desk's right end."""

import math

from decor._b_books import row, stack
from decor._b_frames import standing_frame
from decor._b_pothos import pothos
from decor._b_util import asset, matte, shelf, strip_light

RIGHT = (4.55, 2.3, 0.7, 0.2)  # centre x, height, width, depth


def rack_shelf(k):
    """Above the rack, left of the bike wall: a row of books with a
    bookend, a framed photo and P4 trailing over the front edge."""
    x, y, w, d = RIGHT
    shelf(k, "shelf_rack", x, y, w, d, brackets_at=(x - 0.25, x + 0.25))
    strip_light(k, "shelf_rack_wash", x, y - 0.03, d - 0.03, w - 0.06, power=1.0)
    top = y + 0.015
    books = [(0.026, 0.19, 0.15, "#1f4a32"), (0.032, 0.21, 0.16, "#e9e4d8"), (0.024, 0.18, 0.14, "#b8894f"), (0.03, 0.2, 0.15, "#2b2b2b"), (0.022, 0.17, 0.14, "#6b7a6b")]
    row(k, "rshelf_book", x - w / 2 + 0.03, top, d - 0.04, books, lean_last=7.0, seed=14)
    standing_frame(k, "rshelf_photo", (x + 0.04, top, 0.1), 0.1, 0.13, "coast_small", turn=-14, kind="oak")
    drops = [(x + 0.19 + i * 0.03, top + 0.004, d + 0.006) for i in range(4)] + [(x + w / 2 + 0.006, top + 0.004, d - 0.06)]
    pothos(k, "pothos_p4", (x + 0.26, top, 0.1), drops, [0.7, 0.5, 0.62, 0.42, 0.55], seed=61, crown=8)


def desk_books(k, top):
    """Three books lying on each other at the desk's right end, a small
    succulent on top."""
    specs = [(0.22, 0.034, 0.16, "#2f3f55"), (0.2, 0.026, 0.15, "#e9e4d8"), (0.18, 0.024, 0.14, "#b8894f")]
    y = stack(k, "dbook", 3.27, top, 0.72, specs, seed=21)
    asset(k, "potted_plant_04", (3.27, y, 0.72), rot=30, height=0.11, ratio=0.3)
