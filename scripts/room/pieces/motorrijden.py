"""Story 06, motorrijden: the full-face motorbike helmet on a black hook on
the right wall (bible 3.33). Its visor turns toward the room and tips 15
degrees down. It hangs lower and further out than the bible's
(5.52, 2.0, 0.5): there it would sit in the mountain bike's front wheel."""

from decor._c_geo import Mesh, V, emit
from decor._c_helmets import moto_helmet, wall_hook

CENTRE = V((5.37, 1.55, 0.6))


def build(k):
    with k.piece("motorrijden"):
        front = V((-0.9, -0.26, 0.35)).normalized()
        up = V((0, 1, 0))
        up = (up - front * up.dot(front)).normalized()
        moto_helmet(k, "moto_helmet", CENTRE, front, up)
        hook = Mesh()
        wall_hook(hook, (5.6, CENTRE.y - 0.14, CENTRE.z), (CENTRE.x + 0.03 - 5.6, 0.0, 0.0), 0.07, (-1, 0, 0), r=0.01)
        emit(k, "moto_hook", hook, k.mat("hook_black", "#1a1a1a", 0.45))
        k.pin("motorrijden", tuple(CENTRE + V((0.0, 0.21, 0.0))))
        k.view("motorrijden", tuple(CENTRE), (-1.0, 0.25, 0.9), fov=26)
