"""The road bike's indoor set-up (story 05): a direct-drive trainer in place
of the rear wheel, the riser block under the front wheel and the black
rubber mat under both.

Everything is built in the bike's own axes (x forward, y up, z toward the
drive side, origin at the rear axle; see _bike) and moved into the room
with the bike's placement, so it follows wherever the bike stands. The
bike stands level: both axles are `axle_y` above the floor."""

import math

from decor import _a_tex as tx
from decor._a_util import prism
from decor._c_geo import Mesh, V, cyl, disc, emit, frame, rbox, revolve, sweep

MAT = 0.006  # the mat's thickness
TYRE = 0.338  # the road wheel's outer radius (rim 0.311 + tyre 0.027)


def materials(k):
    return {
        "body": k.mat("tr_body", "#171717", 0.42, bump=0.04, bump_scale=500),
        "trim": k.mat("tr_trim", "#4a4c4f", 0.32, metal=0.7),
        "rubber": k.mat("tr_rubber", "#101010", 0.9, bump=0.2, bump_scale=300),
        "cable": k.mat("b_cable", "#161616", 0.45),
    }


def puck(mesh, m, R, hw, edge=0.022, mat=0, segs=48):
    """A flat round body with rounded rims, radius R, 2*hw thick along the
    local z of placement `m`."""
    prof = [(R - edge, -hw), (R - edge * 0.3, -hw + edge * 0.27), (R, -hw + edge), (R, hw - edge), (R - edge * 0.3, hw - edge * 0.27), (R - edge, hw)]
    revolve(mesh, prof, m, segs, mat)
    for h, flip in ((-hw, True), (hw, False)):
        ring = [m @ V(((R - edge) * math.cos(math.tau * s / segs), (R - edge) * math.sin(math.tau * s / segs), h)) for s in range(segs)]
        face = tuple(reversed(range(segs))) if flip else tuple(range(segs))
        mesh.add(ring, [face], mat)


def trainer(k, name, bike, axle_y):
    """The trainer: its hub between the dropouts (the cassette on it is
    the bike's own), a neck down to the flywheel housing behind and below
    the axle, the carry handle over it, a spine and two splayed legs."""
    floor = -axle_y + MAT
    body, trim, rubber = Mesh(), Mesh(), Mesh()
    z = V((0, 0, 1))
    # hub: an end cap on the far side, the shell, the freehub under the cogs
    cyl(trim, V((0, 0, -0.074)), V((0, 0, -0.06)), 0.021, sides=20)
    cyl(body, V((0, 0, -0.06)), V((0, 0, 0.021)), 0.027, sides=20)
    cyl(trim, V((0, 0, 0.021)), V((0, 0, 0.069)), 0.0165, sides=16)
    # the flywheel housing, in the bike's plane, clear of the derailleur
    hc = V((-0.15, -0.165, -0.025))
    R, hw = 0.175, 0.05
    puck(body, frame(hc), R, hw)
    face = frame(hc + z * (hw + 0.0008))
    disc(trim, face, 0.128, 0.0016, r_in=0.112, segs=48)
    disc(trim, frame(hc + z * (hw + 0.002)), 0.034, 0.004, segs=24)
    disc(trim, frame(hc - z * (hw + 0.002)), 0.034, 0.004, segs=24)
    # the neck from the hub down to the housing
    a, b = V((0.0, -0.01, -0.022)), V((-0.11, -0.14, -0.025))
    rbox(body, frame(a.lerp(b, 0.5), b - a, z), (0.2, 0.054, 0.072), 0.018, seg=2)
    # carry handle over the housing's top, rubber grip
    grip = [V((-0.27, -0.045, -0.025)), V((-0.255, 0.035, -0.025)), V((-0.18, 0.068, -0.025)), V((-0.1, 0.045, -0.025)), V((-0.06, -0.01, -0.025))]
    sweep(rubber, grip, (0.014, 0.011), up=z, sides=12, step=0.02)
    # pedestal, spine and the two legs, rubber feet under their ends
    bottom = hc.y - R
    rbox(body, frame(V((-0.15, (bottom + floor + 0.03) / 2 + 0.01, -0.025))), (0.15, bottom - floor - 0.01, 0.07), 0.012, seg=2)
    y = floor + 0.0195
    rbox(body, frame(V((-0.17, y, -0.025))), (0.48, 0.033, 0.06), 0.01, seg=2)
    feet = [V((-0.39, floor + 0.003, -0.025))]
    for s in (1, -1):
        root, tip = V((-0.11, y, -0.025)), V((0.02, y, -0.025 + s * 0.3))
        rbox(body, frame(root.lerp(tip, 0.5), tip - root, (0, 1, 0)), ((tip - root).length + 0.06, 0.033, 0.052), 0.01, seg=2)
        feet.append(V((tip.x, floor + 0.003, tip.z)))
    for f in feet:
        cyl(rubber, f, f + V((0, 0.01, 0)), 0.03, sides=16)
    place = bike.m
    mats = materials(k)
    emit(k, f"{name}_body", body.moved(place), mats["body"])
    emit(k, f"{name}_trim", trim.moved(place), mats["trim"])
    emit(k, f"{name}_rubber", rubber.moved(place), mats["rubber"])
    # its power lead, off the back of the mat and away under the duffel
    lead = Mesh()
    pts = [V((-0.29, -0.2, -0.06)), V((-0.33, -0.33, -0.08)), V((-0.37, floor + 0.004, -0.1)), V((-0.42, floor - 0.002, -0.12)), V((-0.47, -axle_y + 0.004, -0.15)), V((-0.8, -axle_y + 0.004, -0.3))]
    sweep(lead, pts, 0.0035, sides=6, step=0.03)
    emit(k, f"{name}_lead", lead.moved(place), mats["cable"])


def riser(k, name, bike, axle_y):
    """The front wheel's riser block: a black moulded block whose top dips
    into a cradle the tyre sits in, on the mat under the front axle."""
    floor = -axle_y + MAT
    cx = bike.anchors["front"].x
    contact = -TYRE
    L, top = 0.165, contact
    outline = [(-L, floor), (L, floor), (L, floor + 0.032), (L - 0.025, top + 0.03)]
    for i in range(13):
        x = 0.12 - 0.24 * i / 12
        outline.append((x, top + (TYRE - math.sqrt(TYRE * TYRE - x * x)) * 0.92))
    outline += [(-(L - 0.025), top + 0.03), (-L, floor + 0.032)]
    mesh = Mesh()
    n = len(outline)
    side = [V((cx + x, y, s * 0.072)) for s in (1, -1) for x, y in outline]
    faces = [tuple(range(n)), tuple(reversed(range(n, 2 * n)))]
    faces += [(i, n + i, n + (i + 1) % n, (i + 1) % n) for i in range(n)]
    mesh.add(side, faces)
    emit(k, name, mesh.moved(bike.m), materials(k)["rubber"], sharp=35)


def mat(k, name, bike, axle_y, x0=-0.36, x1=1.22, half=0.34, r=0.035):
    """The rubber mat under the trainer and the riser: a rounded oblong,
    `x0` to `x1` along the bike and `half` to each side."""
    pts = []
    for cx, cz, a0 in ((x1 - r, half - r, 0), (x0 + r, half - r, 90), (x0 + r, -half + r, 180), (x1 - r, -half + r, 270)):
        for i in range(5):
            a = math.radians(a0 + 90 * i / 4)
            p = bike.m @ V((cx + r * math.cos(a), -axle_y, cz + r * math.sin(a)))
            pts.append((p.x, p.z))
    rubber = tx.fabric(k, "tr_mat", "#151515", scale=160.0, bump=0.45, rough=0.82, sheen=0.0, mottle=0.06)
    return prism(k, name, pts, 0.0, MAT, rubber, bevel=0.002, segments=1)
