"""Story 05, wielrennen: the gloss-black road bike with the cream fork
hung flat on the back wall below the mountain bike, both wheels on, drive
side to the room and the bars swung flat against the wall. Two wall
arms under the top tube, the helmet on a hook beside it."""

from decor._bike import ROAD, build_bike
from decor._c_geo import V
from decor._k_hangers import arms, helmet_hook
from decor._k_road_helmet import road_helmet

REAR_AXLE = (5.6, 1.0, 0.17)
HELMET_AT = (7.3, 1.28)


def build(k):
    with k.piece("wielrennen"):
        root, bike = build_bike(k, "road", ROAD, REAR_AXLE, (1, 0, 0), (0, 1, 0), turn=-80)
        arms(k, "road", bike, fracs=(0.2, 0.75))
        hx, hy = HELMET_AT
        helmet_hook(k, "road_helmet", (hx, hy + 0.07, 0.0))
        road_helmet(k, "road_helmet", (hx, hy, 0.2))
        a, b = bike.anchors["down"]
        k.pin("wielrennen", tuple(V(bike.world(a.lerp(b, 0.5))) + V((0, 0.12, 0))))
        k.view("wielrennen", bike.world((0.7, 0.2, 0)), (-0.4, 0.2, 3.2), fov=30)
