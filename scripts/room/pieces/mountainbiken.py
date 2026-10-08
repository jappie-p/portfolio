"""Story 04, mountainbiken: the full-suspension trail bike hung flat on the
back wall, upper half of the bike wall (x 5.05 to 7.95): drive side to the
room, the bars swung flat against the wall, two wall arms under the top
tube and the helmet on its own hook to the right."""

from decor._bike import MTB, build_bike
from decor._c_geo import V
from decor._c_helmets import mtb_helmet
from decor._k_hangers import arms, helmet_hook

# rear axle (the bike's origin) and the plane the bike hangs in
REAR_AXLE = (5.45, 2.2, 0.17)
HELMET_AT = (7.38, 2.5)


def build(k):
    with k.piece("mountainbiken"):
        root, bike = build_bike(k, "mtb", MTB, REAR_AXLE, (1, 0, 0), (0, 1, 0), turn=-78)
        arms(k, "mtb", bike)
        hx, hy = HELMET_AT
        helmet_hook(k, "mtb_helmet", (hx, hy + 0.07, 0.0))
        mtb_helmet(k, "mtb_helmet", (hx, hy, 0.2))
        t0, t1 = bike.anchors["top"]
        top = V(bike.world(t0.lerp(t1, 0.55)))
        k.pin("mountainbiken", tuple(top + V((0, 0.17, 0))))
        k.view("mountainbiken", bike.world((0.8, 0.2, 0)), (-0.5, 0.2, 3.3), fov=30)
