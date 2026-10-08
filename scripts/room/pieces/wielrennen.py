"""Story 05, wielrennen: the gloss-black road bike set up to ride indoors,
on the floor at the front right, along the right wall with its nose to
the viewer and its drive side to the room. The rear wheel is off: the
frame sits on a direct-drive trainer, the front wheel in a riser block,
both on a rubber mat. A towel over the bars, a bottle in the cage and a
small fan turned on the rider's place make it lived in."""

import math

from decor._bike import ROAD, build_bike
from decor._trainer import mat, riser, trainer
from decor._trainer_gear import bottle, fan, towel

YAW = math.radians(12)  # the nose turned this much toward the right wall
AXLE_Y = 0.39  # both axles above the floor: the trainer's hub, the riser's wheel
REAR_AXLE = (4.74, AXLE_Y, 1.97)
FAN = (4.2, 0, 3.05)


def build(k):
    with k.piece("wielrennen"):
        fwd = (math.sin(YAW), 0, math.cos(YAW))
        _, bike = build_bike(k, "road", ROAD, REAR_AXLE, fwd, (0, 1, 0), rear=False)
        trainer(k, "trainer", bike, AXLE_Y)
        riser(k, "riser", bike, AXLE_Y)
        mat(k, "trainer_mat", bike, AXLE_Y)
        towel(k, "towel", bike)
        bottle(k, "bottle", bike)
        fan(k, "fan", FAN, bike.world((0.45, 0.5, 0)), lead=[(4.3, 0.004, 2.7), (4.42, 0.004, 2.2), (4.5, 0.004, 1.6)])
        a, b = bike.anchors["down"]
        k.pin("wielrennen", bike.world(a.lerp(b, 0.5)))
        k.view("wielrennen", bike.world((0.5, 0.1, 0)), (-3.5, 1.15, 0.95), fov=30)
