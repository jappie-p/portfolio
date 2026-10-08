"""Story 04, mountainbiken: the full-suspension trail bike hung flat on the
back wall above the rack (bible 3.31), its two wall arms and the helmet
hanging from the bar end.

At real size (1.93 m tyre to tyre) the bike cannot sit at the bible's
z 0.2 between the shelving top and the right wall, so it hangs 0.36 out,
in front of the shelving-top items, its front tyre 4 cm off the right wall."""

from decor._bike import MTB, build_bike
from decor._c_geo import Mesh, V, emit, frame, rbox, sweep
from decor._c_helmets import mtb_helmet, wall_hook

# rear axle (the bike's origin) and the plane the bike hangs in
REAR_AXLE = (3.999, 2.0, 0.36)


def build(k):
    with k.piece("mountainbiken"):
        root, bike = build_bike(k, "mtb", MTB, REAR_AXLE, (1, 0, 0), (0, 1, 0), turn=-32)
        _arms(k, bike)
        _helmet(k, bike)
        t0, t1 = bike.anchors["top"]
        top = V(bike.world(t0.lerp(t1, 0.55)))
        k.pin("mountainbiken", tuple(top + V((0, 0.17, 0))))
        k.view("mountainbiken", bike.world((0.6, 0.25, 0)), (-1.3, 0.5, 2.2), fov=30)


def _arms(k, bike):
    """Two powder-coated wall arms under the top tube, rubber cradles where
    the tube rests."""
    black = k.mat("hook_black", "#1a1a1a", 0.45)
    rubber = k.mat("hook_rubber", "#2b2b2b", 0.85)
    arm, sleeve = Mesh(), Mesh()
    t0, t1 = bike.anchors["top"]
    for f, a in ((0.24, 0.0195), (0.74, 0.0225)):
        x, y, z = bike.world(t0.lerp(t1, f))
        y -= a + 0.013
        rbox(arm, frame((x, y + 0.02, 0.006), (1, 0, 0), (0, 1, 0)), (0.07, 0.12, 0.012), 0.004, seg=1)
        sweep(arm, [(x, y, 0.01), (x, y, z - 0.06), (x, y + 0.004, z + 0.04), (x, y + 0.05, z + 0.058)], 0.012, sides=12, step=0.03)
        sweep(sleeve, [(x, y, z - 0.07), (x, y, z - 0.02), (x, y + 0.003, z + 0.03)], 0.0145, sides=12, step=0.015)
        for dy in (-0.025, 0.065):
            sweep(arm, [(x, y + dy, 0.012), (x, y + dy, 0.016)], 0.006, sides=8, smooth_path=False)
    emit(k, "mtb_arms", arm, black)
    emit(k, "mtb_arm_sleeves", sleeve, rubber)


def _helmet(k, bike):
    """The helmet on its own wall hook right of the bars (as in the
    design), hung through a vent and tipped 25 degrees."""
    hook = Mesh()
    wall_hook(hook, (5.43, 2.64, 0.0), (0, 0, 0.21), 0.05, (0, 0, 1))
    emit(k, "mtb_helmet_hook", hook, k.mat("hook_black", "#1a1a1a", 0.45))
    mtb_helmet(k, "mtb_helmet", (5.43, 2.57, 0.2))
