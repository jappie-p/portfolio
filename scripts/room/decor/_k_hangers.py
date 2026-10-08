"""What holds a bike on the back wall: two black powder-coated arms
screwed into the wall under the top tube, rubber cradles where the tube
rests, and a J-hook for the helmet."""

from decor._c_geo import Mesh, emit, frame, rbox, sweep
from decor._c_helmets import wall_hook

SCREW_Y = (-0.025, 0.065)  # screw heads relative to the arm's height on its plate


def arms(k, name, bike, fracs=(0.24, 0.74)):
    """Wall arms under the top tube at the given fractions of its length."""
    black = k.mat("hook_black", "#1a1a1a", 0.45)
    rubber = k.mat("hook_rubber", "#2b2b2b", 0.85)
    arm, sleeve = Mesh(), Mesh()
    t0, t1 = bike.anchors["top"]
    for f, a in zip(fracs, (0.0195, 0.0225)):
        x, y, z = bike.world(t0.lerp(t1, f))
        y -= a + 0.013
        rbox(arm, frame((x, y + 0.02, 0.006), (1, 0, 0), (0, 1, 0)), (0.07, 0.12, 0.012), 0.004, seg=1)
        sweep(arm, [(x, y, 0.01), (x, y, z - 0.06), (x, y + 0.004, z + 0.04), (x, y + 0.05, z + 0.058)], 0.012, sides=12, step=0.03)
        sweep(sleeve, [(x, y, z - 0.07), (x, y, z - 0.02), (x, y + 0.003, z + 0.03)], 0.0145, sides=12, step=0.015)
        for dy in SCREW_Y:
            sweep(arm, [(x, y + dy, 0.012), (x, y + dy, 0.016)], 0.006, sides=8, smooth_path=False)
    emit(k, f"{name}_arms", arm, black)
    emit(k, f"{name}_arm_sleeves", sleeve, rubber)


def helmet_hook(k, name, base):
    """A J-hook on the wall at `base` (x, y, 0), reaching 0.21 out."""
    hook = Mesh()
    wall_hook(hook, base, (0, 0, 0.21), 0.05, (0, 0, 1))
    emit(k, f"{name}_hook", hook, k.mat("hook_black", "#1a1a1a", 0.45))
