import * as THREE from "three";
import type { Materials } from "../materials";
import type { Piece } from "../types";
import { cassette, chain, crankset, derailleur, hose, letteredMaterial, pitch, saddle } from "./outdoor/parts";
import { bake, disc, lettering, rod, solid, taper, tube, wrap, type V3 } from "./outdoor/shapes";
import { makeWheel } from "./outdoor/wheel";

/** A road bike on 700c wheels, side on, the drive side toward +z: rear axle
 *  at the left, tyres on the floor (y = 0). */
const R = 0.337;
const REAR: V3 = [0, R, 0];
const FRONT: V3 = [0.99, R, 0];
const BB: V3 = [0.405, R - 0.07, 0];
const HEAD = (73 * Math.PI) / 180;
const U = new THREE.Vector2(-Math.cos(HEAD), Math.sin(HEAD));
const P = new THREE.Vector2(Math.sin(HEAD), Math.cos(HEAD));
const CROWN = new THREE.Vector2(FRONT[0], FRONT[1]).addScaledVector(P, -0.045).addScaledVector(U, 0.37);
const onAxis = (t: number, z = 0): V3 => [CROWN.x + U.x * t, CROWN.y + U.y * t, z];
const SEAT = (73.5 * Math.PI) / 180;
const onSeat = (t: number, z = 0): V3 => [BB[0] - Math.cos(SEAT) * t, BB[1] + Math.sin(SEAT) * t, z];

function frame(m: Materials, paint: THREE.Material) {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material) => g.add(solid(geo, mat));
  add(rod(onAxis(-0.005), onAxis(0.15), 0.025, 20, 0.019), paint);
  // the down tube, aero and swelling into the bottom bracket
  add(taper([onAxis(0.02), [0.66, 0.53, 0], [0.5, 0.36, 0], [0.42, 0.28, 0]], 0.022, 0.028, 18, 36, 0.7), paint);
  // the top tube, nearly level
  add(taper([onAxis(0.13), [0.6, 0.78, 0], onSeat(0.5)], 0.019, 0.016, 16, 28, 0.85), paint);
  add(rod(onSeat(-0.01), onSeat(0.52), 0.018, 18), paint);
  add(disc(0.021, 0.08, 24).translate(BB[0], BB[1], 0), paint);
  for (const side of [-1, 1]) {
    const z = side * 0.064;
    add(taper([[BB[0], BB[1], side * 0.028], [0.25, R - 0.04, side * 0.055], [0.0, R, z]], 0.013, 0.008, 12, 20, 0.8), paint);
    // dropped seatstays, meeting the seat tube low
    add(taper([[0.0, R + 0.005, z], [0.15, 0.52, side * 0.052], onSeat(0.43, side * 0.02)], 0.008, 0.011, 12, 20, 0.8), paint);
    add(rod([-0.015, R - 0.008, z], [0.03, R + 0.02, z], 0.011, 8), paint);
  }
  return g;
}

function cockpit(m: Materials, paint: THREE.Material) {
  const g = new THREE.Group();
  const tape = m.own("barTape", () => new THREE.MeshStandardMaterial({ color: "#f3f0e8", roughness: 0.7 }));
  // the fork: two blades from the crown, curving forward to the dropouts
  for (const side of [-1, 1]) {
    const z = side * 0.05;
    const mid = onAxis(-0.2, side * 0.054);
    g.add(solid(taper([onAxis(-0.005, side * 0.03), mid, [FRONT[0] - 0.01, FRONT[1] + 0.03, z]], 0.017, 0.009, 14, 24, 0.7), paint));
  }
  g.add(solid(rod(onAxis(0.15), onAxis(0.19), 0.02, 16), paint));
  // the stem, a touch down from level, and the bar
  const s0 = onAxis(0.18);
  const s1: V3 = [s0[0] + 0.099, s0[1] - 0.008, 0];
  g.add(solid(rod(s0, s1, 0.016, 14), m.black()));
  const [bx, by] = s1;
  g.add(solid(rod([bx, by, -0.12], [bx, by, 0.12], 0.0155, 14), m.black()));
  for (const side of [-1, 1]) {
    // tops, the curve forward and down, and the drops back: taped
    g.add(solid(tube([[bx, by, side * 0.11], [bx + 0.004, by + 0.002, side * 0.19], [bx + 0.045, by + 0.002, side * 0.205], [bx + 0.08, by - 0.012, side * 0.21], [bx + 0.088, by - 0.06, side * 0.212], [bx + 0.074, by - 0.11, side * 0.214], [bx + 0.035, by - 0.126, side * 0.216], [bx - 0.04, by - 0.124, side * 0.218]], 0.0128, 12, 80), tape));
    // the hood and its lever blade
    const hood = solid(new THREE.BoxGeometry(0.06, 0.032, 0.026), m.rubber());
    hood.position.set(bx + 0.075, by + 0.012, side * 0.208);
    hood.rotation.z = -0.25;
    g.add(hood);
    g.add(solid(tube([[bx + 0.1, by + 0.016, side * 0.208], [bx + 0.106, by - 0.02, side * 0.21], [bx + 0.098, by - 0.075, side * 0.212], [bx + 0.084, by - 0.1, side * 0.214]], 0.006, 8), m.black()));
  }
  return { group: g, bar: [bx, by] as const };
}

/** A slim floor stand cradling the rear tyre. */
function stand(m: Materials) {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    const z = side * 0.045;
    g.add(solid(tube([[-0.16, 0.006, z], [-0.1, 0.01, z], [-0.06, 0.07, z], [-0.03, 0.09, z]], 0.006, 8), m.black()));
    g.add(solid(tube([[0.16, 0.006, z], [0.1, 0.01, z], [0.06, 0.07, z], [0.03, 0.09, z]], 0.006, 8), m.black()));
  }
  for (const x of [-0.16, 0.16]) g.add(solid(rod([x, 0.006, -0.12], [x, 0.006, 0.12], 0.007, 8), m.black()));
  return g;
}

/**
 * The road bike on the floor under the mountain bike: a satin black frame
 * and fork, white bar tape and saddle, deep carbon rims lettered in white,
 * a two-by drivetrain, standing in a slim stand against the wall.
 */
export function makeRoadBike(m: Materials): Piece {
  const paint = m.own("roadPaint", () => new THREE.MeshPhysicalMaterial({ color: "#16171a", metalness: 0.15, roughness: 0.58, clearcoat: 0.25, clearcoatRoughness: 0.5 }));
  const carbon = m.own("carbonRim", () => new THREE.MeshPhysicalMaterial({ color: "#121316", metalness: 0.1, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 }));
  const tyreMat = m.own("slick", () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
  const white = m.own("white", () => new THREE.MeshStandardMaterial({ color: "#f3f0e8", roughness: 0.55 }));
  const bike = new THREE.Group();
  bike.add(frame(m, paint));
  const c = cockpit(m, paint);
  bike.add(c.group);

  const spec = { r: R, tyre: 0.0135, rim: 0.311, depth: 0.05, width: 0.026, spokes: 24, cross: 0.32, knobs: false, skinwall: false, rotor: 0.08, rimText: "JP · 50 CARBON", rimMaterial: carbon };
  const rear = makeWheel(spec, m, tyreMat);
  const front = makeWheel(spec, m, tyreMat);
  rear.position.set(...REAR);
  front.position.set(...FRONT);
  bike.add(rear, front);

  // two rings, eleven cogs, both mechs, and the chain on the big ring
  const big = 50;
  bike.add(crankset(m, BB, [big, 34], 0.5, 0.1725, "clip", 0.047));
  bike.add(cassette(m, REAR, [11, 12, 13, 14, 15, 17, 19, 21, 24, 27, 30], 0.022));
  const mech = derailleur(m, REAR, 0.04);
  bike.add(mech.group);
  const fd = solid(new THREE.BoxGeometry(0.06, 0.02, 0.012), m.black());
  fd.position.set(...onSeat(0.12, 0.05));
  fd.rotation.z = 0.3;
  bike.add(fd);
  const rr = pitch(big);
  const rc = pitch(17);
  const [bx, by] = BB;
  const [ax, ay] = REAR;
  const [ux, uy] = mech.upper;
  const [lx, ly] = mech.lower;
  const rj = mech.rj;
  bike.add(
    chain(
      m,
      [
        [ax, ay + rc, 0],
        [(ax + bx) / 2, (ay + rc + by + rr) / 2, 0],
        [bx, by + rr, 0],
        ...[60, 30, 0, -30, -60].map((d): V3 => [bx + Math.cos((d * Math.PI) / 180) * rr, by + Math.sin((d * Math.PI) / 180) * rr, 0]),
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
      0.044,
    ),
  );

  // an aero seatpost and a white saddle
  bike.add(solid(rod(onSeat(0.5), onSeat(0.72), 0.014, 14), paint));
  bike.add(saddle(m, onSeat(0.73), 0.27, 0.13, 0, white));

  // disc calipers and hoses, run along the frame
  for (const at of [
    [REAR[0] + 0.065, REAR[1] + 0.045, -0.05],
    [FRONT[0] - 0.07, FRONT[1] + 0.05, -0.05],
  ] as V3[]) {
    const cal = solid(new THREE.BoxGeometry(0.055, 0.026, 0.026), m.black());
    cal.position.set(...at);
    bike.add(cal);
  }
  const [hx, hy] = c.bar;
  bike.add(hose(m, [[hx + 0.1, hy + 0.02, -0.2], [hx + 0.02, hy - 0.03, -0.08], onAxis(0.03, -0.03), [0.6, 0.52, -0.03], [0.42, 0.3, -0.04], [0.2, R - 0.03, -0.06], [REAR[0] + 0.07, REAR[1] + 0.045, -0.06]], 0.0025));

  // "JP" in white down the down tube, and a white band round the seat tube
  const decal = letteredMaterial(m, "JP-white", () => lettering("JP", "#f2efe6", 512, 160, 800, true));
  bike.add(wrap([0.52, 0.39, 0], onAxis(0.0), 0.0285, 1.25, new THREE.Vector3(0, 0, 1), decal));
  bike.add(solid(rod(onSeat(0.45), onSeat(0.47), 0.0186, 18), white));

  bake(bike);
  bike.position.set(-0.5, 0, 0);
  const group = new THREE.Group();
  group.add(bike);
  const st = stand(m);
  st.position.set(-0.5, 0, 0);
  group.add(st);

  let spin = 0;
  return {
    id: "wielrennen",
    group,
    pin: new THREE.Vector3(0.38, 1.05, 0),
    view: { target: new THREE.Vector3(0, 0.48, 0), offset: new THREE.Vector3(0.9, 0.7, 2.95) },
    update(_time, dt) {
      spin += (Math.min(m.tone.uGlow.value, 1) * 1.1 - spin) * Math.min(dt * 3, 1);
      rear.rotation.z -= spin * dt;
      front.rotation.z -= spin * dt;
    },
  };
}
