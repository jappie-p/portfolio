"""Picture frames: a profile, a cream mount, a painted landscape (see
_b_paint.py) and a glass that catches the sun. Built around their own
centre and hung or stood by a pivot, so a frame turns as one piece."""

import math

import bmesh
import bpy

from decor import _b_scenes as paint
from decor._b_util import boxes, glass, oak
from space import T


def pivot(k, name, at, rot=(0, 0, 0)):
    """An empty that a group of parts hangs from (built around the origin)."""
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = 0.05
    k.link(e)
    k.place(e, at, rot)
    return e


def adopt(parent, objs):
    for o in objs:
        o.parent = parent
    return parent


def picture_plane(k, name, w, h, at, material):
    """A flat, UV-mapped picture facing +z, centred on `at`."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    corners = [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]
    face = bm.faces.new([bm.verts.new(T(x, y, 0)) for x, y in corners])
    for loop, (x, y) in zip(face.loops, corners):
        loop[uv].uv = (x / w + 0.5, y / h + 0.5)
    obj = k._mesh_obj(name, bm)
    k.place(obj, at)
    return k.finish(obj, material, smooth=False)


def _profile(k, kind):
    if kind == "oak":
        return oak(k)
    return k.mat("b_frame_black", "#1c1c1c", 0.42, noise=40, mottle=0.06)


def frame_parts(k, name, w, h, scene, kind="black", p=0.015, mount=0.03, depth=0.022):
    """Everything of one frame, its back at z 0 and its centre at the origin."""
    parts = [
        ((w, p, depth), (0, h / 2 - p / 2, depth / 2)),
        ((w, p, depth), (0, -h / 2 + p / 2, depth / 2)),
        ((p, h - 2 * p, depth), (-w / 2 + p / 2, 0, depth / 2)),
        ((p, h - 2 * p, depth), (w / 2 - p / 2, 0, depth / 2)),
    ]
    objs = [boxes(k, f"{name}_profile", parts, _profile(k, kind), bevel=0.0025)]
    iw, ih = w - 2 * p, h - 2 * p
    mount_z = depth - 0.009
    objs.append(k.box(f"{name}_back", (iw, ih, 0.004), (0, 0, mount_z - 0.002), k.mat("b_mount", "#f1ebdd", 0.85), bevel=0.0))
    pw, ph = iw - 2 * mount, ih - 2 * mount
    img = paint.picture(scene, pw / ph)
    mat = k.image_mat(f"b_pic_{scene}", img, rough=0.55)
    objs.append(picture_plane(k, f"{name}_picture", pw, ph, (0, 0, mount_z + 0.0006), mat))
    # the mount's bevelled window: four thin strips standing just proud
    m = 0.0035
    window = [
        ((pw + 2 * m, m, 0.0015), (0, ph / 2 + m / 2, mount_z + 0.0008)),
        ((pw + 2 * m, m, 0.0015), (0, -ph / 2 - m / 2, mount_z + 0.0008)),
        ((m, ph, 0.0015), (-pw / 2 - m / 2, 0, mount_z + 0.0008)),
        ((m, ph, 0.0015), (pw / 2 + m / 2, 0, mount_z + 0.0008)),
    ]
    objs.append(boxes(k, f"{name}_window", window, k.mat("b_mount_core", "#faf6ee", 0.8), bevel=0.0))
    objs.append(k.box(f"{name}_glass", (iw, ih, 0.002), (0, 0, depth - 0.004), glass(k, "b_frame_glass", "#ffffff", 0.16, alpha=0.06), bevel=0.0))
    return objs


def frame(k, name, at, w, h, scene, kind="black", p=0.015, mount=0.03, depth=0.022, gap=0.003, rot=(0, 0, 0)):
    """A frame hung on the back wall, centred at (x, y), its back `gap` off
    the plaster."""
    piv = pivot(k, name, (at[0], at[1], at[2] + gap), rot)
    return adopt(piv, frame_parts(k, name, w, h, scene, kind, p, mount, depth))


def standing_frame(k, name, at, w, h, scene, turn=0.0, lean=12.0, kind="oak"):
    """A small frame standing on a surface at `at`, leaning back on its
    strut, turned `turn` degrees about y."""
    piv = pivot(k, name, at, (0, turn, 0))
    inner = pivot(k, name + "_lean", (0, h / 2 * 0.98, 0.012), (-lean, 0, 0))
    inner.parent = piv
    adopt(inner, frame_parts(k, name, w, h, scene, kind, p=0.012, mount=0.012, depth=0.016))
    # the strut: from the back of the frame down to the surface behind it
    a = math.radians(lean)
    top = (0, h * 0.49 + h * 0.15 * math.cos(a), 0.012 - h * 0.15 * math.sin(a) - 0.002)
    foot = (0, 0.002, 0.012 - h * 0.48)
    dy, dz = top[1] - foot[1], top[2] - foot[2]
    length = math.hypot(dy, dz)
    mid = ((top[0] + foot[0]) / 2, (top[1] + foot[1]) / 2, (top[2] + foot[2]) / 2)
    strut = k.box(f"{name}_strut", (w * 0.3, length, 0.004), mid, k.mat("b_strut", "#2a2622", 0.7), bevel=0.001, rot=(math.degrees(math.atan2(dz, dy)), 0, 0))
    strut.parent = piv
    return piv
