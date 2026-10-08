"""Story 09, skien: a pair of skis and their poles in a wall rack under the
sail's leech, with the ski boots on the floor and the helmet and goggles
on a hook. Back to front on the gear wall (x = 8.0)."""

import math

from decor._c_helmets import wall_hook
from decor._g_boots import boot
from decor._g_common import WALL, Mesh, V, emit, frame
from decor._g_helmet import build_helmet
from decor._g_ski import build_pole, build_rack, build_ski, top_sheet_texture

SKI_Z = [2.36, 2.52]
POLE_Z = [2.73, 2.84]
HELMET = V((WALL - 0.159, 1.047, 1.62))
BAR_X = WALL - 0.05


def build(k):
    with k.piece("skien"):
        tex = top_sheet_texture()
        for i, z in enumerate(SKI_Z):
            place = frame(V((BAR_X, 0.0, z)), (0, 1, 0), (-1, 0, 0))
            build_ski(k, f"ski_{i}", place, tex)
        for i, z in enumerate(POLE_Z):
            build_pole(k, f"pole_{i}", V((BAR_X - 0.009 - 0.07, 0.0, z)), 0.07)
        build_rack(k, 2.22, 2.96, SKI_Z, POLE_Z)
        build_helmet(k, "skihelm", HELMET, (-1, 0.0, 0), (0, 1, 0))
        hook = Mesh()
        wall_hook(hook, (WALL, 1.0, HELMET.z), (-0.14, 0.0, 0.0), 0.07, (-1, 0, 0), r=0.01)
        emit(k, "skihelm_hook", hook, k.mat("hook_black", "#1a1a1a", 0.45))
        boot(k, "skiboot_0", V((7.79, 0.014, 1.36)), (0, 0, 1), "ski")
        boot(k, "skiboot_1", V((7.79, 0.014, 1.74)), (0.05, 0, 1), "ski")
        k.pin("skien", (7.7, 1.0, 2.1))
        k.view("skien", (7.85, 0.95, 2.0), (-3.2, 0.3, 0.6), fov=32)
