"""The room's space, shared with the site (src/components/about/room/layout.ts).

Everything here is written in the site's (three.js) convention: metres, x along
the back wall from its left end, y up from the floor, z out of the back wall
toward the viewer. Blender is z-up, so `T` turns a site point into a Blender
one; the glTF export turns it back.
"""

from math import cos, sin

from mathutils import Vector

ROOM = {"w": 8.0, "d": 4.4, "h": 3.0, "wall": 0.12, "slab": 0.22}

# Where the camera stands back to see the whole room, and what it looks at
# (the same angles and target as OVERVIEW in layout.ts; the site fits the
# distance to the screen, the previews use this one): lower and closer than
# a plain isometric view, as in the design.
OVERVIEW = {"target": (4.15, 1.2, 2.1), "azimuth": -0.52, "elevation": 0.36, "distance": 16.5, "fov": 24.0}


def T(x, y, z):
    """A site point (x, y up, z toward you) as a Blender point (z up)."""
    return Vector((x, -z, y))


def orbit(target, azimuth, elevation, distance):
    """The camera position for a look at `target` (site coordinates)."""
    tx, ty, tz = target
    return (
        tx + sin(azimuth) * cos(elevation) * distance,
        ty + sin(elevation) * distance,
        tz + cos(azimuth) * cos(elevation) * distance,
    )
