"""Story 06, motorrijden: the black leather racing suit on a hanger, the
full-face helmet on its own hook and the motor boots below, on the front
part of the gear wall (x = 8.0). The suit hangs a few cm off the wall,
turned 25 degrees toward the front of the room, its hump in profile; the
helmet's visor turns toward the room and tips 15 degrees down."""

from decor._c_helmets import moto_helmet, wall_hook
from decor._g_boots import boot
from decor._g_common import WALL, Mesh, V, emit
from decor._g_suit import Y0, build_suit

SUIT_Z, TURN = 3.42, 25
HOOK_Y = Y0 + 0.2
HELMET = V((WALL - 0.235, 1.5, 4.03))


def build(k):
    with k.piece("motorrijden"):
        suit, _tris = build_suit(k, "suit", SUIT_Z, TURN, HOOK_Y, WALL)
        hooks = Mesh()
        wall_hook(hooks, (WALL, HOOK_Y, suit.z), (suit.x - 0.035 - WALL, 0.0, 0.0), 0.05, (-1, 0, 0), r=0.011)
        front = V((-0.9, -0.26, 0.35)).normalized()
        up = V((0, 1, 0))
        up = (up - front * up.dot(front)).normalized()
        moto_helmet(k, "moto_helmet", HELMET, front, up)
        wall_hook(hooks, (WALL, HELMET.y - 0.14, HELMET.z), (HELMET.x + 0.03 - WALL, 0.0, 0.0), 0.07, (-1, 0, 0), r=0.01)
        emit(k, "moto_hook", hooks, k.mat("hook_black", "#1a1a1a", 0.45))
        boot(k, "motoboot_0", V((7.72, 0.014, 3.33)), (-1, 0, -0.18), "moto")
        boot(k, "motoboot_1", V((7.72, 0.014, 3.57)), (-1, 0, 0.18), "moto", mirror=True)
        k.pin("motorrijden", (suit.x - 0.1, 1.55, suit.z))
        k.view("motorrijden", (7.72, 1.25, 3.55), (-3.75, 0.4, -1.15), fov=34)
