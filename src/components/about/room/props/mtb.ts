import * as THREE from "three";
import { PLACES, ROOM } from "../layout";
import type { Materials } from "../materials";
import type { Piece } from "../types";
import { cassette, chain, crankset, derailleur, hose, letteredMaterial, pitch, saddle } from "./outdoor/parts";
import { bake, disc, lettering, rod, solid, taper, tube, wrap, type V3 } from "./outdoor/shapes";
import { makeWheel } from "./outdoor/wheel";

/** Where the wall is, in this piece's own space (its z runs out from it). */
const WALL = -(ROOM.w - PLACES.mountainbiken.at[0]);
/** How far out from the wall the bike hangs: its bar clears the plaster. */
const PLANE = 0.2;

/** A 29er trail bike, side on, the drive side toward +z: rear axle at the
 *  origin's left, wheels standing on y = 0 (it hangs; this is its lowest point). */
const R = 0.37;
const REAR: V3 = [0, R, 0];
const FRONT: V3 = [1.2, R, 0];
const BB: V3 = [0.445, 0.335, 0];
/** the steering axis (up and back) and the forward perpendicular to it */
const HEAD = (65 * Math.PI) / 180;
const U = new THREE.Vector2(-Math.cos(HEAD), Math.sin(HEAD));
const P = new THREE.Vector2(Math.sin(HEAD), Math.cos(HEAD));
/** a point on the steering axis, `t` metres up from the fork's crown */
const CROWN = new THREE.Vector2(FRONT[0], FRONT[1]).addScaledVector(P, -0.044).addScaledVector(U, 0.56);
const onAxis = (t: number, z = 0): V3 => [CROWN.x + U.x * t, CROWN.y + U.y * t, z];
/** the seat tube's line from the bottom bracket */
const SEAT = (74 * Math.PI) / 180;
const onSeat = (t: number, z = 0): V3 => [BB[0] - Math.cos(SEAT) * t, BB[1] + Math.sin(SEAT) * t, z];

function frame(m: Materials, paint: THREE.Material) {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material) => g.add(solid(geo, mat));
  // head tube, flared at the bottom
  add(rod(onAxis(0.0), onAxis(0.135), 0.03, 20, 0.026), paint);
  // the down tube: oval, swelling into the bottom bracket
  add(taper([onAxis(0.025), [0.8, 0.72, 0], [0.62, 0.52, 0], [0.47, 0.37, 0]], 0.027, 0.034, 18, 40, 0.8), paint);
  // the top tube, sloping into the seat tube with a gusset
  add(taper([onAxis(0.11), [0.66, 0.86, 0], [0.48, 0.74, 0], onSeat(0.33)], 0.022, 0.02, 16, 32, 0.85), paint);
  add(taper([[0.52, 0.77, 0], [0.43, 0.7, 0], onSeat(0.27)], 0.014, 0.012, 12, 16), paint);
  // the seat tube, the shell, and the collar
  add(rod(onSeat(-0.01), onSeat(0.41), 0.019, 18), paint);
  add(disc(0.024, 0.085, 24).translate(BB[0], BB[1], 0), paint);
  add(rod(onSeat(0.395), onSeat(0.425), 0.021, 18), m.black());
  // the rear end: chainstays and seatstays both sides, a rocker on the seat
  // tube, and the shock between the rocker and the down tube
  const pivot: V3 = [0.425, 0.42, 0];
  const rocker: V3 = [0.37, 0.71, 0];
  for (const side of [-1, 1]) {
    const z = side * 0.058;
    add(taper([[pivot[0], pivot[1], side * 0.03], [0.3, 0.37, side * 0.05], [0.12, 0.36, z], [0.0, R, z]], 0.015, 0.011, 12, 24, 0.75), paint);
    add(taper([[0.0, R + 0.01, z], [0.12, 0.5, side * 0.05], [0.26, 0.63, side * 0.04], [rocker[0], rocker[1], side * 0.03]], 0.011, 0.013, 12, 24, 0.8), paint);
    // the dropout and the rocker plate
    add(rod([-0.02, R - 0.01, z], [0.04, R + 0.03, z], 0.014, 8), m.black());
    add(tube([[rocker[0], rocker[1], side * 0.03], [0.4, 0.69, side * 0.028], [0.44, 0.665, side * 0.026], onSeat(0.3, side * 0.024)], 0.011, 8), m.black());
  }
  add(disc(0.012, 0.11, 12).translate(pivot[0], pivot[1], 0), m.alu());
  add(disc(0.009, 0.09, 12).translate(rocker[0], rocker[1], 0), m.alu());
  // the shock: eyelet, air can, gold shaft, body, and its mount on the down tube
  const top: V3 = [0.44, 0.67, 0];
  const foot: V3 = [0.64, 0.535, 0];
  const at = (t: number): V3 => [top[0] + (foot[0] - top[0]) * t, top[1] + (foot[1] - top[1]) * t, 0];
  add(rod(top, at(0.42), 0.024, 20, 0.024), m.black());
  add(rod(at(0.4), at(0.62), 0.013, 16), m.own("kashima", () => new THREE.MeshStandardMaterial({ color: "#c9a560", metalness: 1, roughness: 0.2 })));
  add(rod(at(0.6), foot, 0.017, 16), m.black());
  add(disc(0.011, 0.04, 12).translate(foot[0], foot[1], 0), m.alu());
  return g;
}

function fork(m: Materials) {
  const g = new THREE.Group();
  const gold = m.own("kashima", () => new THREE.MeshStandardMaterial({ color: "#c9a560", metalness: 1, roughness: 0.2 }));
  for (const side of [-1, 1]) {
    const z = side * 0.058;
    // stanchion out of the crown, the lower over it, down to the axle
    g.add(solid(rod(onAxis(0.0, z), onAxis(-0.24, z), 0.0175, 16), gold));
    g.add(solid(rod(onAxis(-0.21, z), [FRONT[0] - P.x * 0.006, FRONT[1] + 0.02, z], 0.0225, 16, 0.019), m.black()));
    g.add(solid(disc(0.018, 0.02, 14).translate(FRONT[0], FRONT[1], z + side * 0.004), m.black()));
  }
  // the crown across, the arch over the tyre in front, the steerer up
  g.add(solid(rod(onAxis(0.005, -0.075), onAxis(0.005, 0.075), 0.022, 16), m.black()));
  const a = onAxis(-0.235);
  g.add(solid(tube([[a[0], a[1], -0.058], [a[0] + P.x * 0.03, a[1] + 0.035, -0.03], [a[0] + P.x * 0.04, a[1] + 0.045, 0], [a[0] + P.x * 0.03, a[1] + 0.035, 0.03], [a[0], a[1], 0.058]], 0.012, 10), m.black()));
  g.add(solid(rod(onAxis(0), onAxis(0.2), 0.0165, 14), m.black()));
  // spacers and the stem, bolted on
  g.add(solid(rod(onAxis(0.135), onAxis(0.16), 0.019, 14), m.black()));
  const stemFrom = onAxis(0.175);
  const stemTo: V3 = [stemFrom[0] + P.x * 0.05, stemFrom[1] + P.y * 0.05, 0];
  g.add(solid(rod(stemFrom, stemTo, 0.017, 14), m.black()));
  // the riser bar, sweeping back a touch, grips at its ends
  const [bx, by] = stemTo;
  for (const side of [-1, 1]) {
    g.add(solid(tube([[bx, by, 0], [bx, by + 0.004, side * 0.07], [bx - 0.004, by + 0.022, side * 0.12], [bx - 0.012, by + 0.028, side * 0.25], [bx - 0.02, by + 0.03, side * 0.38]], 0.011, 10), m.black()));
    g.add(solid(rod([bx - 0.016, by + 0.03, side * 0.255], [bx - 0.02, by + 0.03, side * 0.385], 0.0165, 14), m.rubber()));
    // the brake lever, its blade forward and down
    g.add(solid(tube([[bx - 0.012, by + 0.03, side * 0.21], [bx + 0.03, by + 0.02, side * 0.215], [bx + 0.07, by - 0.01, side * 0.25], [bx + 0.08, by - 0.02, side * 0.3]], 0.005, 6), m.black()));
  }
  g.add(solid(rod([bx, by, -0.025], [bx, by, 0.025], 0.019, 14), m.black()));
  return { group: g, bar: [bx, by] as const };
}

/**
 * The mountain bike, hung on the right wall on two arms under its top tube:
 * a full-suspension 29er in deep green clearcoat with a gold-stanchioned
 * fork, a dropper post, a wide bar, tan-wall trail tyres, a one-by drivetrain
 * with a big cassette, and a small "JP" on its down tube.
 */
export function makeMountainBike(m: Materials): Piece {
  const paint = m.own("mtbPaint", () => new THREE.MeshPhysicalMaterial({ color: "#1f4b35", metalness: 0.45, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.12 }));
  const tyreMat = m.own("tyre", () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86 }));
  const bike = new THREE.Group();
  bike.add(frame(m, paint));
  const f = fork(m);
  bike.add(f.group);

  // the wheels, each on its axle
  const spec = { r: R, tyre: 0.031, rim: 0.312, depth: 0.022, width: 0.03, spokes: 32, cross: 0.95, knobs: true, skinwall: true, rotor: 0.09, rimMaterial: m.black() };
  const rear = makeWheel(spec, m, tyreMat);
  const front = makeWheel(spec, m, tyreMat);
  rear.position.set(...REAR);
  front.position.set(...FRONT);
  bike.add(rear, front);

  // the drivetrain on the right: one ring, a big cassette, the mech, the chain
  const ring = 32;
  bike.add(crankset(m, BB, [ring], -0.35, 0.17, "flat", 0.05));
  const cogs = [10, 12, 14, 16, 18, 21, 24, 28, 33, 39, 45, 51];
  bike.add(cassette(m, REAR, cogs, 0.02));
  const mech = derailleur(m, REAR, 0.046);
  bike.add(mech.group);
  const rr = pitch(ring);
  const rc = pitch(28);
  const [bx, by] = BB;
  const [ax, ay] = REAR;
  const [ux, uy] = mech.upper;
  const [lx, ly] = mech.lower;
  const rj = mech.rj;
  const front60 = [60, 30, 0, -30, -60].map((d) => (d * Math.PI) / 180);
  bike.add(
    chain(
      m,
      [
        [ax, ay + rc, 0],
        [(ax + bx) / 2, (ay + rc + by + rr) / 2, 0],
        [bx, by + rr, 0],
        ...front60.map((a): V3 => [bx + Math.cos(a) * rr, by + Math.sin(a) * rr, 0]),
        [bx, by - rr, 0],
        [(bx + lx) / 2, (by - rr + ly - rj) / 2, 0],
        [lx, ly - rj, 0],
        [lx - rj, ly, 0],
        [ux - rj * 0.2, uy - rj, 0],
        [ux - rj, uy, 0],
        [ax - rc * 0.7, ay - rc * 0.7, 0],
        [ax - rc, ay, 0],
        [ax - rc * 0.7, ay + rc * 0.7, 0],
      ],
      0.046,
    ),
  );

  // the dropper post and the saddle
  bike.add(solid(rod(onSeat(0.41), onSeat(0.52), 0.0158, 16), m.black()));
  bike.add(solid(rod(onSeat(0.5), onSeat(0.66), 0.0125, 16), m.graphite()));
  bike.add(saddle(m, onSeat(0.68), 0.265, 0.14, 0.03));

  // brake calipers on the left, and the hoses from the levers
  const caliper = (at: V3, turn: number) => {
    const c = solid(new THREE.BoxGeometry(0.06, 0.03, 0.03), m.black());
    c.position.set(...at);
    c.rotation.z = turn;
    bike.add(c);
  };
  caliper([REAR[0] + 0.07, REAR[1] + 0.05, -0.052], -0.6);
  caliper([FRONT[0] - 0.075, FRONT[1] + 0.055, -0.052], 0.9);
  const [hx, hy] = f.bar;
  bike.add(hose(m, [[hx + 0.02, hy + 0.02, -0.21], [hx - 0.05, hy - 0.05, -0.12], onAxis(0.06, -0.04), [0.62, 0.5, -0.04], [0.45, 0.38, -0.045], [0.26, 0.36, -0.06], [REAR[0] + 0.08, REAR[1] + 0.05, -0.06]]));
  bike.add(hose(m, [[hx + 0.02, hy + 0.02, 0.21], [hx - 0.03, hy - 0.03, 0.1], onAxis(-0.02, 0.07), onAxis(-0.2, 0.075), [FRONT[0] - 0.07, FRONT[1] + 0.06, -0.04]]));

  // "JP", small, on the down tube's drive side
  const decal = letteredMaterial(m, "JP-white", () => lettering("JP", "#f2efe6", 512, 160, 800, true));
  bike.add(wrap([0.6, 0.5, 0], onAxis(-0.02, 0), 0.0315, 1.3, new THREE.Vector3(0, 0, 1), decal));

  bake(bike);

  // the bike sits centred on its own length, out from the wall
  bike.position.set(-0.6, 0, PLANE);
  const group = new THREE.Group();
  group.add(bike);

  // two arms out of the wall under the top tube, rubber-capped
  for (const x of [0.6, 0.83]) {
    const along = (x - onAxis(0.11)[0]) / (onSeat(0.33)[0] - onAxis(0.11)[0]);
    const y = onAxis(0.11)[1] + (onSeat(0.33)[1] - onAxis(0.11)[1]) * along - 0.03;
    const ax2 = x - 0.6;
    group.add(solid(new THREE.BoxGeometry(0.05, 0.11, 0.012).translate(ax2, y - 0.02, WALL + 0.006), m.black()));
    group.add(solid(tube([[ax2, y - 0.03, WALL + 0.01], [ax2, y - 0.015, WALL + 0.2], [ax2, y - 0.01, PLANE + 0.08], [ax2, y + 0.02, PLANE + 0.1]], 0.007, 8), m.black()));
    group.add(solid(rod([ax2, y - 0.012, PLANE - 0.08], [ax2, y - 0.006, PLANE + 0.07], 0.0105, 10), m.rubber()));
  }

  // wheels turn, slowly, while you point at the bike or read its story
  let spin = 0;
  return {
    id: "mountainbiken",
    group,
    pin: new THREE.Vector3(0.05, 1.22, PLANE),
    view: { target: new THREE.Vector3(0, 0.55, PLANE), offset: new THREE.Vector3(0.95, 0.45, 3.4) },
    update(_time, dt) {
      spin += (Math.min(m.tone.uGlow.value, 1) * 0.9 - spin) * Math.min(dt * 3, 1);
      rear.rotation.z -= spin * dt;
      front.rotation.z -= spin * dt;
    },
  };
}
