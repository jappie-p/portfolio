import * as THREE from "three";
import hyphosting from "@/assets/work/hyphosting-desktop.webp";
import louisa from "@/assets/work/louisa-desktop.webp";
import { PLACES } from "../layout";
import type { Materials } from "../materials";
import type { Piece } from "../types";
import { codeScreen, weave } from "./work/canvas";
import { chair, keyboard, lamp, laptop, monitor, mouse, mug, notebook, screenMaterial } from "./work/deskParts";
import { merge, owns, planarUV, rbox, solid, tube } from "./work/shapes";

/** How high the desk's top is, and how big. */
const TOP = { y: 0.74, t: 0.032, w: 1.9, d: 0.75 };

/** A screenshot as a screen's picture, cropped from the top to the screen's
 *  shape (the shots are 16:10, the monitors 16:9). */
function shot(src: string, aspect: number) {
  const t = new THREE.TextureLoader().load(src);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.repeat.set(1, 1.6 / aspect);
  t.offset.set(0, 1 - t.repeat.y);
  return t;
}

/**
 * Where I build: a light oak desk on a black steel frame with a drawer
 * unit under it; two monitors on an arm showing work of mine, a laptop
 * with code, keyboard and mouse on a green felt mat, an architect's lamp,
 * coffee and a notebook; the office chair before it with my jacket over
 * its back.
 */
export function makeDesk(m: Materials): Piece {
  const group = new THREE.Group();
  // the desk stands against the wall, wherever its place is measured from
  const body = new THREE.Group();
  const back = -PLACES.werk.at[2] + 0.03;
  body.position.z = back;
  group.add(body);

  // the top: one slab of oak, the grain along it; the frame in black steel
  const top = planarUV(rbox(TOP.w, TOP.t, TOP.d, 0.01, 0, TOP.y + TOP.t / 2, TOP.d / 2, 4), 1);
  body.add(solid(top, m.oak()));
  const frame: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    const x = s * (TOP.w / 2 - 0.1);
    frame.push(rbox(0.07, TOP.y - 0.06, 0.05, 0.008, x, TOP.y / 2, TOP.d / 2));
    frame.push(rbox(0.075, 0.03, 0.68, 0.01, x, 0.015, TOP.d / 2));
    frame.push(rbox(0.06, 0.03, 0.62, 0.008, x, TOP.y - 0.015, TOP.d / 2));
  }
  frame.push(rbox(TOP.w - 0.3, 0.05, 0.03, 0.008, 0, TOP.y - 0.06, 0.12));
  body.add(solid(merge(frame), m.black()));

  // the drawer unit under the left end: cream, three drawers, black pulls
  const ped = new THREE.Group();
  ped.add(solid(rbox(0.42, 0.56, 0.52, 0.012, 0, 0.32, 0), m.cream()));
  const fronts: THREE.BufferGeometry[] = [];
  const pulls: THREE.BufferGeometry[] = [];
  [0.17, 0.17, 0.2].reduce((y, hgt) => {
    fronts.push(rbox(0.395, hgt - 0.008, 0.018, 0.005, 0, y + hgt / 2, 0.262));
    pulls.push(rbox(0.16, 0.012, 0.014, 0.005, 0, y + hgt - 0.03, 0.274));
    return y + hgt;
  }, 0.06);
  ped.add(solid(merge(fronts), m.cream()));
  ped.add(solid(merge(pulls), m.black()));
  const casters: THREE.BufferGeometry[] = [];
  for (const [x, z] of [[-0.17, -0.2], [0.17, -0.2], [-0.17, 0.2], [0.17, 0.2]]) casters.push(new THREE.SphereGeometry(0.022, 12, 8).translate(x, 0.022, z));
  ped.add(solid(merge(casters), m.rubber()));
  ped.position.set(-0.58, 0, 0.33);
  body.add(ped);

  // the screens: Hyphosting in front of me, Louisa's shop beside it,
  // turned in, and code on the laptop
  const deskY = TOP.y + TOP.t;
  const a = 16 / 9;
  const t1 = shot(hyphosting.src, a);
  const t2 = shot(louisa.src, a);
  const code = codeScreen();
  const main = monitor(m, owns(screenMaterial(m, "screenMain", t1), t1), 0.6, 0.6 / a);
  main.position.set(0.02, deskY + 0.34, 0.2);
  main.rotation.x = -0.04;
  body.add(main);
  const side = monitor(m, owns(screenMaterial(m, "screenSide", t2), t2), 0.53, 0.53 / a);
  side.position.set(0.63, deskY + 0.32, 0.24);
  side.rotation.set(-0.04, -0.42, 0);
  body.add(side);
  // the arm: a pole clamped at the back, an arm out to each screen
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const pole = V(0.32, deskY, 0.07);
  const arm = merge([
    rbox(0.07, 0.04, 0.07, 0.01, pole.x, deskY - 0.01, pole.z),
    tube([pole, V(pole.x, deskY + 0.45, pole.z)], 0.017, 4, 14, 0),
    tube([V(pole.x, deskY + 0.36, pole.z), V(0.16, deskY + 0.37, 0.13), V(0.05, deskY + 0.32, 0.165)], 0.012, 16, 10),
    tube([V(pole.x, deskY + 0.36, pole.z), V(0.47, deskY + 0.36, 0.13), V(0.58, deskY + 0.31, 0.205)], 0.012, 16, 10),
  ]);
  body.add(solid(arm, m.black()));
  // the cable down the back, to the floor
  body.add(solid(tube([V(0.3, deskY + 0.05, 0.05), V(0.28, deskY - 0.15, 0.03), V(0.24, 0.3, 0.025), V(0.2, 0.02, 0.06), V(0.05, 0.005, 0.1)], 0.006, 30, 6), m.rubber()));
  const lap = laptop(m, owns(screenMaterial(m, "screenCode", code, 1.05), code));
  lap.position.set(-0.56, deskY, 0.36);
  lap.rotation.y = 0.32;
  body.add(lap);

  // on the felt mat: keyboard and mouse; coffee to the right, a notebook left
  const felt = m.own("felt", () => new THREE.MeshPhysicalMaterial({ color: "#284b36", roughness: 1, sheen: 0.8, sheenRoughness: 0.6, sheenColor: new THREE.Color("#6f9a7a") }));
  body.add(solid(rbox(0.82, 0.003, 0.34, 0.0015, 0.08, deskY + 0.0015, 0.53), felt));
  const keys = keyboard(m);
  keys.position.set(0.0, deskY + 0.003, 0.52);
  keys.rotation.y = 0.03;
  body.add(keys);
  const mo = mouse(m);
  mo.position.set(0.34, deskY + 0.012, 0.54);
  mo.rotation.y = -0.15;
  body.add(mo);
  const cup = mug(m);
  cup.position.set(0.66, deskY, 0.6);
  cup.rotation.y = 2.2;
  body.add(cup);
  const book = notebook(m);
  book.position.set(-0.36, deskY, 0.6);
  book.rotation.y = 0.35;
  body.add(book);
  const light = lamp(m);
  light.position.set(-0.84, deskY, 0.13);
  light.rotation.y = 0.35;
  body.add(light);

  // the chair, pulled back a little and turned toward the room
  const seat = chair(m, weave());
  seat.position.set(0.2, 0, 1.1);
  seat.rotation.y = -0.42;
  body.add(seat);

  return {
    id: "werk",
    group,
    pin: new THREE.Vector3(0.02, 1.55, 0.3 + back),
    // from up and to the left, over the chair's back (the canvas sets the
    // piece left of the story card itself: the target is the desk's middle)
    view: { target: new THREE.Vector3(-0.05, 0.92, 0.45 + back), offset: new THREE.Vector3(-1.35, 1.75, 3.2) },
  };
}
