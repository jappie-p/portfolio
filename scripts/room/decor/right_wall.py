"""The gear wall's floor (x 6.9 to 8.0): two black rubber boot trays under
the ski boots and the motor boots, and a plant in the front corner. The
gear itself lives in the windsurfen, skien and motorrijden pieces."""

from decor._c_assets import decimate, fit
from decor._g_common import WALL, Mesh, V, emit, frame, rbox


def build(k):
    with k.group("right_wall"):
        tray = Mesh()
        _tray(tray, 7.545, 1.55, 0.78, 0.62)
        _tray(tray, 7.545, 3.45, 0.8, 0.68)
        emit(k, "boot_trays", tray, k.mat("boot_tray", "#1c1d1f", 0.85, bump=0.25, bump_scale=140))
        plant = k.asset("potted_plant_02", (7.62, 0, 4.1), (0, 15, 0))
        fit(k, plant, height=0.5)
        decimate(plant, 0.22, dirt=0.04)


def _tray(mesh, x, z, w, d):
    """A shallow rubber tray: a floor with a raised lip all round. `w` runs
    along the wall."""
    t, h = 0.012, 0.03
    rbox(mesh, frame(V((x, t / 2, z)), (1, 0, 0), (0, 1, 0)), (d, t, w), 0.004, seg=1)
    for sx in (-1, 1):
        rbox(mesh, frame(V((x + sx * (d / 2 - 0.008), h / 2, z)), (1, 0, 0), (0, 1, 0)), (0.016, h, w), 0.005, seg=1)
    for sz in (-1, 1):
        rbox(mesh, frame(V((x, h / 2, z + sz * (w / 2 - 0.008))), (1, 0, 0), (0, 1, 0)), (d, h, 0.016), 0.005, seg=1)
